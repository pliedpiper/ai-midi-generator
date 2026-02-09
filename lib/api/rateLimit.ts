import { NextResponse } from 'next/server';
import { checkRateLimit, type RateLimitResult } from '@/lib/rateLimit';

type RateLimitSuccess = {
  ok: true;
  result: RateLimitResult;
};

type RateLimitFailure = {
  ok: false;
  response: NextResponse;
};

export type EnforceRateLimitResult = RateLimitSuccess | RateLimitFailure;

type EnforceRateLimitInput = {
  identifier: string;
  maxRequests: number;
  windowMs: number;
  unavailableMessage: string;
  tooManyMessage: string;
  logLabel: string;
};

export const enforceRateLimit = async (
  input: EnforceRateLimitInput
): Promise<EnforceRateLimitResult> => {
  try {
    const result = await checkRateLimit(input.identifier, input.maxRequests, input.windowMs);

    if (!result.allowed) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: input.tooManyMessage },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil(result.resetIn / 1000)),
              'X-RateLimit-Remaining': '0'
            }
          }
        )
      };
    }

    return { ok: true, result };
  } catch (error) {
    console.error(`${input.logLabel}:`, error);
    return {
      ok: false,
      response: NextResponse.json(
        { error: input.unavailableMessage },
        { status: 503 }
      )
    };
  }
};
