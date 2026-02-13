import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT_GENERATOR } from '@/constants';
import type { MidiComposition, UserPreferences } from '@/types';
import { extractJson, validateComposition } from '@/utils/validation';
import { finalizeGenerationTitle } from '@/utils/titleUtils';
import {
  createOpenRouterClient,
  mapOpenRouterErrorToResponse
} from '@/lib/api/openRouter';

export const GENERATE_REQUEST_TIMEOUT_MS = 180_000;
const MAX_TOKENS = 16_384;

const buildPrompt = (id: number, prefs: UserPreferences) => {
  return `
User Prompt: "${prefs.prompt}"
Tempo: ${prefs.tempo} BPM
Key: ${prefs.key}
Time Signature: ${prefs.timeSignature}
Length: ${prefs.durationBars} bars
Constraints: ${prefs.constraints}

Attempt Number: ${id}

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
    const client = createOpenRouterClient(input.apiKey, GENERATE_REQUEST_TIMEOUT_MS);

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
    return {
      ok: false,
      response: mapOpenRouterErrorToResponse(error, {
        timeoutMessage: 'Request timed out. Try a shorter prompt or different model.',
        connectionMessage: 'Could not reach the AI service. Check your connection.',
        unauthorizedMessage: 'Your OpenRouter API key is invalid or expired.',
        creditsMessage: 'OpenRouter credits exhausted. Add credits to continue.',
        notFoundMessage: 'Selected model is unavailable. Try a different model.',
        rateLimitMessage: 'Provider rate limit reached. Wait a moment and try again.',
        mapApiStatus: (status) => {
          if (status === 503) {
            return {
              message: 'Model is overloaded. Try again shortly or use a different model.',
              status: 503
            };
          }
          return null;
        },
        fallbackApiError: (status) => ({
          message: `AI service error (${status}). Please try again.`,
          status: 502
        }),
        unknownError: {
          message: 'Failed to generate composition. Please try again.',
          status: 502
        }
      })
    };
  }
};
