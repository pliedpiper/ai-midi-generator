import { NextResponse } from 'next/server';
import { validatePrefs } from '@/utils/validation';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser } from '@/lib/api/auth';
import { resolveDecryptedOpenRouterKey } from '@/lib/api/openRouterKey';
import { enforceRateLimit } from '@/lib/api/rateLimit';
import { getClientIp, getTraceId, parseJsonBodyWithLimit } from '@/lib/api/request';
import {
  acquireIdempotencyLock,
  buildGenerateIdempotencyKeys,
  readIdempotencyComposition,
  releaseIdempotencyLock,
  waitForIdempotencyComposition,
  writeIdempotencyComposition
} from '@/lib/api/idempotency';
import { generateComposition } from './generateService';
import {
  type GenerateRequestBody,
  validateGenerateRequest
} from './requestValidation';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_BODY_SIZE = 10_000;
const IDEMPOTENCY_KEY_MAX_LENGTH = 120;
const IDEMPOTENCY_WAIT_MS = 3_000;

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

  const validatedRequest = validateGenerateRequest(
    parsedBody.data,
    IDEMPOTENCY_KEY_MAX_LENGTH
  );
  if (validatedRequest.valid === false) {
    return NextResponse.json(
      { error: validatedRequest.error },
      { status: 400 }
    );
  }

  const { attemptIndex, prefs, normalizedIdempotencyKey } = validatedRequest;

  const prefsResult = validatePrefs(prefs);
  if (prefsResult.valid === false) {
    return NextResponse.json({ error: prefsResult.error }, { status: 400 });
  }

  const idempotencyKeys = buildGenerateIdempotencyKeys(
    user.id,
    `${prefsResult.normalized.styleId}:${normalizedIdempotencyKey}`,
    attemptIndex
  );

  let cachedComposition = null;
  try {
    cachedComposition = await readIdempotencyComposition(idempotencyKeys.resultKey);
  } catch (error) {
    console.error('Idempotency cache read failed:', { traceId, error });
    return NextResponse.json(
      { error: 'Idempotency service unavailable. Please try again shortly.' },
      { status: 503 }
    );
  }

  if (cachedComposition) {
    return NextResponse.json(
      { composition: cachedComposition },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimitResult.result.remaining),
          'X-Idempotent-Replay': '1'
        }
      }
    );
  }

  let lockAcquired = false;
  try {
    lockAcquired = await acquireIdempotencyLock(idempotencyKeys.lockKey);
  } catch (error) {
    console.error('Idempotency lock acquire failed:', { traceId, error });
    return NextResponse.json(
      { error: 'Idempotency service unavailable. Please try again shortly.' },
      { status: 503 }
    );
  }

  if (!lockAcquired) {
    try {
      const replayedComposition = await waitForIdempotencyComposition(
        idempotencyKeys.resultKey,
        IDEMPOTENCY_WAIT_MS
      );

      if (replayedComposition) {
        return NextResponse.json(
          { composition: replayedComposition },
          {
            headers: {
              'X-RateLimit-Remaining': String(rateLimitResult.result.remaining),
              'X-Idempotent-Replay': '1'
            }
          }
        );
      }
    } catch (error) {
      console.error('Idempotency wait failed:', { traceId, error });
      return NextResponse.json(
        { error: 'Idempotency service unavailable. Please try again shortly.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'A matching generation request is already in progress. Retry shortly.' },
      { status: 409 }
    );
  }

  try {
    const generationResult = await generateComposition({
      apiKey: keyResult.apiKey,
      traceId,
      attemptIndex,
      prefs: prefsResult.normalized
    });

    if (generationResult.ok === false) {
      return generationResult.response;
    }

    const { error: saveError } = await supabase.from('generations').insert({
      user_id: user.id,
      title: generationResult.title,
      model: prefsResult.normalized.model,
      attempt_index: attemptIndex,
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

    try {
      await writeIdempotencyComposition(
        idempotencyKeys.resultKey,
        generationResult.composition
      );
    } catch (error) {
      console.error('Failed to write idempotency cache:', { traceId, error });
    }

    return NextResponse.json(
      { composition: generationResult.composition },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateLimitResult.result.remaining)
        }
      }
    );
  } finally {
    try {
      await releaseIdempotencyLock(idempotencyKeys.lockKey);
    } catch (error) {
      console.error('Failed to release idempotency lock:', { traceId, error });
    }
  }
}
