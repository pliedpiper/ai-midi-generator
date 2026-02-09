import { NextResponse } from 'next/server';
import { validatePrefs } from '@/utils/validation';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser } from '@/lib/api/auth';
import { resolveDecryptedOpenRouterKey } from '@/lib/api/openRouterKey';
import { enforceRateLimit } from '@/lib/api/rateLimit';
import { getClientIp, getTraceId, parseJsonBodyWithLimit } from '@/lib/api/request';
import { generateComposition } from './generateService';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_BODY_SIZE = 10_000;

type GenerateRequestBody = {
  id?: number;
  prefs?: unknown;
};

export async function POST(req: Request) {
  const traceId = getTraceId(req);
  const supabase = await createSupabaseClient();

  const authResult = await requireAuthenticatedUser(
    supabase,
    'You must be logged in to generate MIDI.'
  );
  if (authResult.ok === false) {
    return authResult.response;
  }

  const user = authResult.user;

  const keyResult = await resolveDecryptedOpenRouterKey({
    supabase,
    userId: user.id,
    missingKeyMessage: 'OpenRouter API key not configured. Add your key in the app settings.',
    failureMessage: 'Could not load your OpenRouter API key.',
    failureLogLabel: 'Failed to resolve user OpenRouter key'
  });
  if (keyResult.ok === false) {
    return keyResult.response;
  }

  const rateLimitIdentifier = user.id
    ? `user:${user.id}`
    : `ip:${getClientIp(req)}`;

  const rateLimitResult = await enforceRateLimit({
    identifier: rateLimitIdentifier,
    maxRequests: RATE_LIMIT_MAX_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
    unavailableMessage: 'Rate limiter unavailable. Please try again shortly.',
    tooManyMessage: 'Too many requests. Please try again later.',
    logLabel: 'Redis rate limiter failed'
  });

  if (rateLimitResult.ok === false) {
    return rateLimitResult.response;
  }

  const parsedBody = await parseJsonBodyWithLimit<GenerateRequestBody>(req, MAX_BODY_SIZE);
  if (parsedBody.ok === false) {
    return parsedBody.response;
  }

  const { id, prefs } = parsedBody.data;

  if (typeof id !== 'number' || !Number.isFinite(id) || id < 1) {
    return NextResponse.json(
      { error: 'id must be a positive number.' },
      { status: 400 }
    );
  }

  const prefsResult = validatePrefs(prefs);
  if (prefsResult.valid === false) {
    return NextResponse.json({ error: prefsResult.error }, { status: 400 });
  }

  const generationResult = await generateComposition({
    apiKey: keyResult.apiKey,
    traceId,
    attemptId: id,
    prefs: prefsResult.normalized
  });

  if (generationResult.ok === false) {
    return generationResult.response;
  }

  const { error: saveError } = await supabase.from('generations').insert({
    user_id: user.id,
    title: generationResult.title,
    model: prefsResult.normalized.model,
    attempt_index: id,
    prefs: prefsResult.normalized,
    composition: generationResult.composition
  });

  if (saveError) {
    console.error('Failed to save generation:', saveError);
    return NextResponse.json(
      { error: 'Failed to save generation.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { composition: generationResult.composition },
    {
      headers: {
        'X-RateLimit-Remaining': String(rateLimitResult.result.remaining)
      }
    }
  );
}
