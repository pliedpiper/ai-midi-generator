import { NextResponse } from 'next/server';
import OpenAI, { APIError, APIConnectionError, APIConnectionTimeoutError } from 'openai';
import { SYSTEM_PROMPT_GENERATOR } from '@/constants';
import type { UserPreferences } from '@/types';
import { extractJson, validatePrefs, validateComposition } from '@/utils/validation';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { decryptSecret } from '@/utils/encryption';
import { getEncryptedOpenRouterKey } from '@/lib/userSettings';
import { checkRateLimit } from '@/lib/rateLimit';
import { finalizeGenerationTitle } from '@/utils/titleUtils';

export const runtime = 'nodejs';

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per user
const MAX_BODY_SIZE = 10_000; // 10KB max request body
const MAX_TOKENS = 16384; // Limit model output tokens
const REQUEST_TIMEOUT_MS = 180_000; // 180 second timeout

function getRateLimitKey(req: Request): string {
  // Try to get IP from various headers
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
}

function getTraceId(req: Request): string {
  const requestId = req.headers.get('x-request-id');
  const correlationId = req.headers.get('x-correlation-id');
  return requestId || correlationId || crypto.randomUUID();
}

const createOpenRouterClient = (apiKey: string) => new OpenAI({
  apiKey,
  baseURL: 'https://openrouter.ai/api/v1',
  timeout: REQUEST_TIMEOUT_MS
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

export async function POST(req: Request) {
  const traceId = getTraceId(req);
  const supabase = await createSupabaseClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: 'You must be logged in to generate MIDI.' },
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
    console.error('Failed to resolve user OpenRouter key:', error);
    return NextResponse.json(
      { error: 'Could not load your OpenRouter API key.' },
      { status: 500 }
    );
  }

  // Rate limiting (per user with IP fallback)
  const clientIp = getRateLimitKey(req);
  const rateLimitIdentifier = user.id ? `user:${user.id}` : `ip:${clientIp}`;
  let rateLimit;
  try {
    rateLimit = await checkRateLimit(
      rateLimitIdentifier,
      RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_WINDOW_MS
    );
  } catch (error) {
    console.error('Redis rate limiter failed:', error);
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

  // Check content-length before parsing body
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return NextResponse.json(
      { error: 'Request body too large.' },
      { status: 413 }
    );
  }

  let body: { id?: number; prefs?: unknown };
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

  const { id, prefs } = body;

  // Validate id
  if (typeof id !== 'number' || !Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: 'id must be a positive number.' }, { status: 400 });
  }

  // Validate and normalize prefs
  const prefsResult = validatePrefs(prefs);
  if (prefsResult.valid === false) {
    return NextResponse.json({ error: prefsResult.error }, { status: 400 });
  }
  const normalizedPrefs = prefsResult.normalized;

  try {
    const client = createOpenRouterClient(userOpenRouterApiKey);

    const response = await client.chat.completions.create({
      model: normalizedPrefs.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_GENERATOR },
        { role: 'user', content: buildPrompt(id, normalizedPrefs) }
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
        traceId,
        jsonTextLength: jsonText.length,
        error: parseError
      });
      return NextResponse.json(
        { error: 'Model returned invalid JSON.' },
        { status: 502 }
      );
    }

    // Validate model output against schema
    const compositionResult = validateComposition(parsed);
    if (compositionResult.valid === false) {
      console.error('Schema validation failed:', {
        traceId,
        error: compositionResult.error
      });
      return NextResponse.json(
        { error: 'Model output failed validation.' },
        { status: 502 }
      );
    }

    const title = finalizeGenerationTitle({
      modelTitle: compositionResult.composition.title,
      prompt: normalizedPrefs.prompt,
      attemptIndex: id
    });
    const composition = {
      ...compositionResult.composition,
      title
    };

    const { error: saveError } = await supabase.from('generations').insert({
      user_id: user.id,
      title,
      model: normalizedPrefs.model,
      attempt_index: id,
      prefs: normalizedPrefs,
      composition
    });

    if (saveError) {
      console.error('Failed to save generation:', saveError);
      return NextResponse.json(
        { error: 'Failed to save generation.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { composition },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining)
        }
      }
    );
  } catch (error) {
    // Log full error details server-side
    console.error('Generation failed:', { traceId, error });

    // Handle specific OpenAI SDK error types
    if (error instanceof APIConnectionTimeoutError) {
      return NextResponse.json(
        { error: 'Request timed out. Try a shorter prompt or different model.' },
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

      // Authentication errors
      if (status === 401) {
        return NextResponse.json(
          { error: 'Your OpenRouter API key is invalid or expired.' },
          { status: 401 }
        );
      }

      // Payment/quota errors
      if (status === 402) {
        return NextResponse.json(
          { error: 'OpenRouter credits exhausted. Add credits to continue.' },
          { status: 402 }
        );
      }

      // Model not found
      if (status === 404) {
        return NextResponse.json(
          { error: 'Selected model is unavailable. Try a different model.' },
          { status: 404 }
        );
      }

      // Provider rate limiting
      if (status === 429) {
        return NextResponse.json(
          { error: 'Provider rate limit reached. Wait a moment and try again.' },
          { status: 429 }
        );
      }

      // Model overloaded
      if (status === 503) {
        return NextResponse.json(
          { error: 'Model is overloaded. Try again shortly or use a different model.' },
          { status: 503 }
        );
      }

      // Other API errors
      return NextResponse.json(
        { error: `AI service error (${status}). Please try again.` },
        { status: 502 }
      );
    }

    // Unknown errors
    return NextResponse.json(
      { error: 'Failed to generate composition. Please try again.' },
      { status: 502 }
    );
  }
}
