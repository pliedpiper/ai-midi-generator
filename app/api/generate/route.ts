import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { SYSTEM_PROMPT_GENERATOR } from '@/constants';
import type { UserPreferences } from '@/types';
import { extractJson, validatePrefs, validateComposition } from '@/utils/validation';

export const runtime = 'nodejs';

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP
const MAX_BODY_SIZE = 10_000; // 10KB max request body
const MAX_TOKENS = 4096; // Limit model output tokens
const REQUEST_TIMEOUT_MS = 60_000; // 60 second timeout

// Simple in-memory rate limiter (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(req: Request): string {
  // Try to get IP from various headers
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count, resetIn: entry.resetTime - now };
}

// Periodically clean up old rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  timeout: REQUEST_TIMEOUT_MS
});

const buildPrompt = (id: number, prefs: UserPreferences) => {
  const variationSeed = `Variation ID: ${id}-${Math.random().toString(36).substring(7)}`;
  return `
User Prompt: "${prefs.prompt}"
Tempo: ${prefs.tempo} BPM
Key: ${prefs.key}
Time Signature: ${prefs.timeSignature}
Length: ${prefs.durationBars} bars
Constraints: ${prefs.constraints}

${variationSeed}

Make this version unique compared to others.
  `.trim();
};

export async function POST(req: Request) {
  // Check API key first
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not configured');
    return NextResponse.json(
      { error: 'Server configuration error.' },
      { status: 500 }
    );
  }

  // Rate limiting
  const clientIp = getRateLimitKey(req);
  const rateLimit = checkRateLimit(clientIp);

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
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Model returned invalid JSON.' },
        { status: 502 }
      );
    }

    // Validate model output against schema
    const compositionResult = validateComposition(parsed);
    if (compositionResult.valid === false) {
      console.error('Schema validation failed:', compositionResult.error);
      return NextResponse.json(
        { error: 'Model output failed validation.' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { composition: compositionResult.composition },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining)
        }
      }
    );
  } catch (error) {
    // Log full error details server-side
    console.error('Generation failed:', error);

    // Return generic message to client (don't leak provider details)
    return NextResponse.json(
      { error: 'Failed to generate composition. Please try again.' },
      { status: 502 }
    );
  }
}
