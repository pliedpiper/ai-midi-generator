import { readFile } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';
import OpenAI, { APIError, APIConnectionError, APIConnectionTimeoutError } from 'openai';

export const PROMPT_IMPROVER_MODEL_ID = 'google/gemini-3-flash-preview';
export const PROMPT_IMPROVE_REQUEST_TIMEOUT_MS = 60_000;
export const PROMPT_IMPROVE_BODY_LIMIT = 8_000;
const MAX_PROMPT_LENGTH = 2_000;
const MAX_CONSTRAINTS_LENGTH = 500;

const KEY_MODE_PATTERN = '(?:major|minor|maj|min|natural minor|harmonic minor|melodic minor|dorian|phrygian|lydian|mixolydian|locrian|ionian|aeolian|pentatonic(?:\\s+(?:major|minor))?|blues|chromatic)';
const BPM_PATTERN = new RegExp(
  '\\b(?:at\\s+|around\\s+|about\\s+)?\\d{2,3}(?:\\.\\d+)?\\s*(?:bpm|beats\\s+per\\s+minute)\\b',
  'gi'
);
const KEY_PHRASE_PATTERN = new RegExp(
  `\\b(?:in\\s+the\\s+key\\s+of|key\\s+of|in)\\s+[A-G](?:#|b)?\\s*${KEY_MODE_PATTERN}\\b`,
  'gi'
);
const STANDALONE_KEY_PATTERN = new RegExp(
  `\\b[A-G](?:#|b)?\\s*${KEY_MODE_PATTERN}\\b`,
  'gi'
);

const FALLBACK_PROMPT_TIPS = `
- Describe the mood, genre, and role (loop, intro, ambient bed, driving groove).
- Keep the prompt focused on 1-3 core ideas (instrument palette, rhythmic feel, motif).
- Use Advanced fields for tempo, key, time signature, and bars instead of repeating them in the prompt.
- Use Constraints for hard rules ("no drums", "max 3 tracks", "stay within C minor", "use arpeggios").
- Specify structure in bars if you want form ("AABB", "4-bar call/response", "8-bar loopable").
- If you want a loop, say "seamless loop" and keep bars short (4, 8, or 16).
- For clearer melodies, ask for a single lead track plus simple harmony.
- If results feel busy, constrain polyphony ("no chords over 3 notes") and reduce track count.
`.trim();

let promptTipsCache: string | null = null;

const createOpenRouterClient = (apiKey: string) => new OpenAI({
  apiKey,
  baseURL: 'https://openrouter.ai/api/v1',
  timeout: PROMPT_IMPROVE_REQUEST_TIMEOUT_MS
});

export type ImprovePromptRequest = {
  prompt: string;
  tempo: number | null;
  key: string | null;
  timeSignature: string | null;
  durationBars: number | null;
  constraints: string;
};

type RequestValidationSuccess = {
  valid: true;
  normalized: ImprovePromptRequest;
};

type RequestValidationFailure = {
  valid: false;
  error: string;
};

export type ImprovePromptValidationResult = RequestValidationSuccess | RequestValidationFailure;

type ImprovePromptSuccess = {
  ok: true;
  prompt: string;
};

type ImprovePromptFailure = {
  ok: false;
  response: NextResponse;
};

export type ImprovePromptResult = ImprovePromptSuccess | ImprovePromptFailure;

async function loadPromptTips(): Promise<string> {
  if (promptTipsCache) {
    return promptTipsCache;
  }

  try {
    const fileText = await readFile(join(process.cwd(), 'prompts.md'), 'utf8');
    const sectionStart = fileText.indexOf('## Prompting tips');
    if (sectionStart !== -1) {
      const sectionEnd = fileText.indexOf('\n## ', sectionStart + 1);
      const section = sectionEnd === -1
        ? fileText.slice(sectionStart)
        : fileText.slice(sectionStart, sectionEnd);

      const bullets = section
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('- '))
        .join('\n');

      if (bullets) {
        promptTipsCache = bullets;
        return promptTipsCache;
      }
    }
  } catch (error) {
    console.error('Failed to read prompts.md for prompt improver:', error);
  }

  promptTipsCache = FALLBACK_PROMPT_TIPS;
  return promptTipsCache;
}

export const normalizePromptImproveRequest = (
  body: unknown
): ImprovePromptValidationResult => {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object.' };
  }

  const payload = body as Record<string, unknown>;

  if (typeof payload.prompt !== 'string' || !payload.prompt.trim()) {
    return { valid: false, error: 'prompt is required and must be a non-empty string.' };
  }
  if (payload.prompt.length > MAX_PROMPT_LENGTH) {
    return { valid: false, error: `prompt must be ${MAX_PROMPT_LENGTH} characters or less.` };
  }

  if (typeof payload.constraints === 'string' && payload.constraints.length > MAX_CONSTRAINTS_LENGTH) {
    return { valid: false, error: `constraints must be ${MAX_CONSTRAINTS_LENGTH} characters or less.` };
  }

  return {
    valid: true,
    normalized: {
      prompt: payload.prompt.trim(),
      tempo: typeof payload.tempo === 'number' && Number.isFinite(payload.tempo)
        ? payload.tempo
        : null,
      key: typeof payload.key === 'string' && payload.key.trim()
        ? payload.key.trim()
        : null,
      timeSignature: typeof payload.timeSignature === 'string' && payload.timeSignature.trim()
        ? payload.timeSignature.trim()
        : null,
      durationBars: typeof payload.durationBars === 'number' && Number.isFinite(payload.durationBars)
        ? payload.durationBars
        : null,
      constraints: typeof payload.constraints === 'string' ? payload.constraints.trim() : ''
    }
  };
};

const buildImproverInput = (payload: ImprovePromptRequest, tips: string): string => {
  const settings = [
    payload.tempo !== null ? `Tempo: ${payload.tempo} BPM` : null,
    payload.key ? `Key: ${payload.key}` : null,
    payload.timeSignature ? `Time Signature: ${payload.timeSignature}` : null,
    payload.durationBars !== null ? `Length: ${payload.durationBars} bars` : null,
    payload.constraints ? `Constraints: ${payload.constraints}` : 'Constraints: (none)'
  ].filter(Boolean).join('\n');

  return `
Prompting guide to follow:
${tips}

Current prompt:
"${payload.prompt}"

Current advanced settings:
${settings}

Rewrite the prompt to be more specific and useful for MIDI generation while preserving intent.
Rules:
- Return one improved prompt only, plain text, no markdown.
- Keep it concise and actionable.
- Never include explicit key names/scales (for example: "C Major", "A minor").
- Never include BPM numbers or tempo values (for example: "120 BPM").
- Keep under ${MAX_PROMPT_LENGTH} characters.
`.trim();
};

const normalizeModelOutput = (content: unknown): string => {
  let text = '';
  if (typeof content === 'string') {
    text = content;
  } else if (Array.isArray(content)) {
    text = content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item) {
          const candidate = (item as { text?: unknown }).text;
          return typeof candidate === 'string' ? candidate : '';
        }
        return '';
      })
      .join('\n');
  }

  const stripped = text
    .trim()
    .replace(/^```(?:text|markdown)?/i, '')
    .replace(/```$/i, '')
    .trim()
    .replace(/^["'`]+/, '')
    .replace(/["'`]+$/, '')
    .trim();

  if (!stripped) return '';
  if (stripped.length <= MAX_PROMPT_LENGTH) return stripped;
  return stripped.slice(0, MAX_PROMPT_LENGTH).trim();
};

const stripKeyAndBpmDetails = (text: string): string => {
  const withoutExcludedDetails = text
    .replace(BPM_PATTERN, '')
    .replace(KEY_PHRASE_PATTERN, '')
    .replace(STANDALONE_KEY_PATTERN, '');

  return withoutExcludedDetails
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([(\[])\s+/g, '$1')
    .replace(/\s+([)\]])/g, '$1')
    .replace(/^[,\-:;./\s]+/, '')
    .replace(/[,\-:;./\s]+$/, '')
    .trim();
};

export const improvePrompt = async (
  apiKey: string,
  payload: ImprovePromptRequest
): Promise<ImprovePromptResult> => {
  try {
    const tips = await loadPromptTips();
    const client = createOpenRouterClient(apiKey);
    const response = await client.chat.completions.create({
      model: PROMPT_IMPROVER_MODEL_ID,
      messages: [
        {
          role: 'system',
          content: 'You improve prompts for an AI MIDI generator. Output one plain-text improved prompt only. Never include key names/scales or BPM/tempo values.'
        },
        {
          role: 'user',
          content: buildImproverInput(payload, tips)
        }
      ],
      temperature: 0.35,
      max_tokens: 700
    });

    const rawContent = response.choices?.[0]?.message?.content ?? '';
    const improvedPrompt = stripKeyAndBpmDetails(normalizeModelOutput(rawContent));

    if (!improvedPrompt) {
      const fallbackPrompt = stripKeyAndBpmDetails(payload.prompt);
      if (!fallbackPrompt) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'Prompt improver returned an empty response.' },
            { status: 502 }
          )
        };
      }

      return {
        ok: true,
        prompt: fallbackPrompt
      };
    }

    return {
      ok: true,
      prompt: improvedPrompt
    };
  } catch (error) {
    console.error('Prompt improvement failed:', error);

    if (error instanceof APIConnectionTimeoutError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Prompt improvement timed out. Please try again.' },
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
            { error: 'Gemini 3 Flash is unavailable right now. Please try again shortly.' },
            { status: 404 }
          )
        };
      }

      if (status === 429) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'OpenRouter rate limit reached. Please wait and retry.' },
            { status: 429 }
          )
        };
      }

      if (status >= 500) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'AI service is temporarily unavailable.' },
            { status: 503 }
          )
        };
      }
    }

    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Failed to improve prompt.' },
        { status: 502 }
      )
    };
  }
};
