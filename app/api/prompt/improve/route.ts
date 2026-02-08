import { NextResponse } from 'next/server';
import OpenAI, { APIError, APIConnectionError, APIConnectionTimeoutError } from 'openai';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { decryptSecret } from '@/utils/encryption';
import { getEncryptedOpenRouterKey } from '@/lib/userSettings';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const MODEL_ID = 'google/gemini-3-flash-preview';
const REQUEST_TIMEOUT_MS = 60_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_BODY_SIZE = 8_000;
const MAX_PROMPT_LENGTH = 2_000;
const MAX_CONSTRAINTS_LENGTH = 500;

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
  timeout: REQUEST_TIMEOUT_MS
});

type ImprovePromptRequest = {
  prompt: string;
  tempo: number | null;
  key: string | null;
  timeSignature: string | null;
  durationBars: number | null;
  constraints: string;
};

function getRateLimitKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
}

async function loadPromptTips(): Promise<string> {
  if (promptTipsCache) return promptTipsCache;

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
        .map(line => line.trim())
        .filter(line => line.startsWith('- '))
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

function normalizeRequestBody(body: unknown): { valid: true; normalized: ImprovePromptRequest } | { valid: false; error: string } {
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
}

function buildImproverInput(payload: ImprovePromptRequest, tips: string): string {
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
- Do not restate tempo/key/time signature/bar count unless musically essential.
- Keep under ${MAX_PROMPT_LENGTH} characters.
`.trim();
}

function normalizeModelOutput(content: unknown): string {
  let text = '';
  if (typeof content === 'string') {
    text = content;
  } else if (Array.isArray(content)) {
    text = content
      .map(item => {
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
}

export async function POST(req: Request) {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: 'You must be logged in to improve prompts.' },
      { status: 401 }
    );
  }

  let userOpenRouterApiKey: string;
  try {
    const encryptedKey = await getEncryptedOpenRouterKey(supabase, user.id);
    if (!encryptedKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Add your key in the app settings.' },
        { status: 400 }
      );
    }
    userOpenRouterApiKey = decryptSecret(encryptedKey);
  } catch (error) {
    console.error('Failed to resolve user OpenRouter key for prompt improver:', error);
    return NextResponse.json(
      { error: 'Could not load your OpenRouter API key.' },
      { status: 500 }
    );
  }

  const clientIp = getRateLimitKey(req);
  const rateLimitIdentifier = user.id
    ? `user:${user.id}:prompt-improve`
    : `ip:${clientIp}:prompt-improve`;

  let rateLimit;
  try {
    rateLimit = await checkRateLimit(
      rateLimitIdentifier,
      RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_WINDOW_MS
    );
  } catch (error) {
    console.error('Redis rate limiter failed for prompt improver:', error);
    return NextResponse.json(
      { error: 'Rate limiter unavailable. Please try again shortly.' },
      { status: 503 }
    );
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
          'X-RateLimit-Remaining': '0'
        }
      }
    );
  }

  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return NextResponse.json(
      { error: 'Request body too large.' },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Request body too large.' },
        { status: 413 }
      );
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const normalizedResult = normalizeRequestBody(body);
  if (normalizedResult.valid === false) {
    return NextResponse.json({ error: normalizedResult.error }, { status: 400 });
  }

  try {
    const tips = await loadPromptTips();
    const client = createOpenRouterClient(userOpenRouterApiKey);
    const response = await client.chat.completions.create({
      model: MODEL_ID,
      messages: [
        {
          role: 'system',
          content: 'You improve prompts for an AI MIDI generator. Output one plain-text improved prompt only.'
        },
        {
          role: 'user',
          content: buildImproverInput(normalizedResult.normalized, tips)
        }
      ],
      temperature: 0.35,
      max_tokens: 700
    });

    const rawContent = response.choices?.[0]?.message?.content ?? '';
    const improvedPrompt = normalizeModelOutput(rawContent);
    if (!improvedPrompt) {
      return NextResponse.json(
        { error: 'Prompt improver returned an empty response.' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { prompt: improvedPrompt },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining)
        }
      }
    );
  } catch (error) {
    console.error('Prompt improvement failed:', error);

    if (error instanceof APIConnectionTimeoutError) {
      return NextResponse.json(
        { error: 'Prompt improvement timed out. Please try again.' },
        { status: 504 }
      );
    }

    if (error instanceof APIConnectionError) {
      return NextResponse.json(
        { error: 'Could not reach the AI service. Check your connection.' },
        { status: 503 }
      );
    }

    if (error instanceof APIError) {
      const status = error.status ?? 502;

      if (status === 401) {
        return NextResponse.json(
          { error: 'Your OpenRouter API key is invalid or expired.' },
          { status: 401 }
        );
      }

      if (status === 402) {
        return NextResponse.json(
          { error: 'OpenRouter credits exhausted. Add credits to continue.' },
          { status: 402 }
        );
      }

      if (status === 404) {
        return NextResponse.json(
          { error: 'Gemini 3 Flash is unavailable right now. Please try again shortly.' },
          { status: 404 }
        );
      }

      if (status === 429) {
        return NextResponse.json(
          { error: 'OpenRouter rate limit reached. Please wait and retry.' },
          { status: 429 }
        );
      }

      if (status >= 500) {
        return NextResponse.json(
          { error: 'AI service is temporarily unavailable.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to improve prompt.' },
      { status: 502 }
    );
  }
}
