import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser } from '@/lib/api/auth';
import { resolveDecryptedOpenRouterKey } from '@/lib/api/openRouterKey';
import { enforceRateLimit } from '@/lib/api/rateLimit';
import { getClientIp, parseJsonBodyWithLimit } from '@/lib/api/request';
import {
  improvePrompt,
  normalizePromptImproveRequest,
  PROMPT_IMPROVE_BODY_LIMIT
} from './promptImproveService';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

export async function POST(req: Request) {
  const supabase = await createSupabaseClient();

  const authResult = await requireAuthenticatedUser(
    supabase,
    'You must be logged in to improve prompts.'
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
    failureLogLabel: 'Failed to resolve user OpenRouter key for prompt improver'
  });
  if (keyResult.ok === false) {
    return keyResult.response;
  }

  const rateLimitIdentifier = user.id
    ? `user:${user.id}:prompt-improve`
    : `ip:${getClientIp(req)}:prompt-improve`;

  const rateLimitResult = await enforceRateLimit({
    identifier: rateLimitIdentifier,
    maxRequests: RATE_LIMIT_MAX_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
    unavailableMessage: 'Rate limiter unavailable. Please try again shortly.',
    tooManyMessage: 'Too many requests. Please try again later.',
    logLabel: 'Redis rate limiter failed for prompt improver'
  });

  if (rateLimitResult.ok === false) {
    return rateLimitResult.response;
  }

  const parsedBody = await parseJsonBodyWithLimit<unknown>(req, PROMPT_IMPROVE_BODY_LIMIT);
  if (parsedBody.ok === false) {
    return parsedBody.response;
  }

  const normalizedRequest = normalizePromptImproveRequest(parsedBody.data);
  if (normalizedRequest.valid === false) {
    return NextResponse.json(
      { error: normalizedRequest.error },
      { status: 400 }
    );
  }

  const improveResult = await improvePrompt(
    keyResult.apiKey,
    normalizedRequest.normalized
  );

  if (improveResult.ok === false) {
    return improveResult.response;
  }

  return NextResponse.json(
    { prompt: improveResult.prompt },
    {
      headers: {
        'X-RateLimit-Remaining': String(rateLimitResult.result.remaining)
      }
    }
  );
}
