import { NextResponse } from 'next/server';
import OpenAI, { APIError, APIConnectionError, APIConnectionTimeoutError } from 'openai';
import { SYSTEM_PROMPT_GENERATOR } from '@/constants';
import type { MidiComposition, UserPreferences } from '@/types';
import { extractJson, validateComposition } from '@/utils/validation';
import { finalizeGenerationTitle } from '@/utils/titleUtils';

export const GENERATE_REQUEST_TIMEOUT_MS = 180_000;
const MAX_TOKENS = 16_384;

const createOpenRouterClient = (apiKey: string) => new OpenAI({
  apiKey,
  baseURL: 'https://openrouter.ai/api/v1',
  timeout: GENERATE_REQUEST_TIMEOUT_MS
});

const buildPrompt = (id: number, prefs: UserPreferences) => {
  const settings = [
    prefs.tempo !== null ? `Tempo: ${prefs.tempo} BPM` : null,
    prefs.key ? `Key: ${prefs.key}` : null,
    prefs.timeSignature ? `Time Signature: ${prefs.timeSignature}` : null,
    prefs.durationBars !== null ? `Length: ${prefs.durationBars} bars` : null,
    prefs.constraints.trim() ? `Constraints: ${prefs.constraints}` : null
  ].filter(Boolean).join('\n');

  const settingsBlock = settings.length > 0 ? settings : 'Advanced settings: (none provided)';

  return `
User Prompt: "${prefs.prompt}"
${settingsBlock}

Attempt Number: ${id}

If an advanced setting is omitted, choose a musically appropriate value and include it in the JSON output.
Respect any provided advanced settings exactly.
Make this version musically unique compared to other attempts.
Do not include attempt numbers, variation labels, IDs, or random suffixes in the title.
  `.trim();
};

type GenerateSuccess = {
  ok: true;
  composition: MidiComposition;
  title: string;
};

type GenerateFailure = {
  ok: false;
  response: NextResponse;
};

export type GenerateResult = GenerateSuccess | GenerateFailure;

type GenerateInput = {
  apiKey: string;
  traceId: string;
  attemptId: number;
  prefs: UserPreferences;
};

export const generateComposition = async (input: GenerateInput): Promise<GenerateResult> => {
  try {
    const client = createOpenRouterClient(input.apiKey);

    const response = await client.chat.completions.create({
      model: input.prefs.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_GENERATOR },
        { role: 'user', content: buildPrompt(input.attemptId, input.prefs) }
      ],
      temperature: 0.9,
      max_tokens: MAX_TOKENS
    });

    const content = response.choices?.[0]?.message?.content ?? '';
    const jsonText = extractJson(content);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON parse error:', {
        traceId: input.traceId,
        jsonTextLength: jsonText.length,
        error: parseError
      });
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Model returned invalid JSON.' },
          { status: 502 }
        )
      };
    }

    const compositionResult = validateComposition(parsed);
    if (compositionResult.valid === false) {
      console.error('Schema validation failed:', {
        traceId: input.traceId,
        error: compositionResult.error
      });
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Model output failed validation.' },
          { status: 502 }
        )
      };
    }

    const title = finalizeGenerationTitle({
      modelTitle: compositionResult.composition.title,
      prompt: input.prefs.prompt,
      attemptIndex: input.attemptId
    });

    return {
      ok: true,
      title,
      composition: {
        ...compositionResult.composition,
        title
      }
    };
  } catch (error) {
    console.error('Generation failed:', { traceId: input.traceId, error });

    if (error instanceof APIConnectionTimeoutError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Request timed out. Try a shorter prompt or different model.' },
          { status: 504 }
        )
      };
    }

    if (error instanceof APIConnectionError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Could not reach the AI service. Check your connection.' },
          { status: 503 }
        )
      };
    }

    if (error instanceof APIError) {
      const status = error.status ?? 502;

      if (status === 401) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'Your OpenRouter API key is invalid or expired.' },
            { status: 401 }
          )
        };
      }

      if (status === 402) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'OpenRouter credits exhausted. Add credits to continue.' },
            { status: 402 }
          )
        };
      }

      if (status === 404) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'Selected model is unavailable. Try a different model.' },
            { status: 404 }
          )
        };
      }

      if (status === 429) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'Provider rate limit reached. Wait a moment and try again.' },
            { status: 429 }
          )
        };
      }

      if (status === 503) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'Model is overloaded. Try again shortly or use a different model.' },
            { status: 503 }
          )
        };
      }

      return {
        ok: false,
        response: NextResponse.json(
          { error: `AI service error (${status}). Please try again.` },
          { status: 502 }
        )
      };
    }

    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Failed to generate composition. Please try again.' },
        { status: 502 }
      )
    };
  }
};
