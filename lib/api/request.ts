import { NextResponse } from 'next/server';

type ParseSuccess<T> = {
  ok: true;
  data: T;
};

type ParseFailure = {
  ok: false;
  response: NextResponse;
};

export type ParseBodyResult<T> = ParseSuccess<T> | ParseFailure;

export const getClientIp = (req: Request): string => {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
};

export const getTraceId = (req: Request): string => {
  const requestId = req.headers.get('x-request-id');
  const correlationId = req.headers.get('x-correlation-id');
  return requestId || correlationId || crypto.randomUUID();
};

export const parseJsonBodyWithLimit = async <T>(
  req: Request,
  maxBodySize: number
): Promise<ParseBodyResult<T>> => {
  const contentLength = req.headers.get('content-length');
  if (contentLength) {
    const parsedContentLength = Number(contentLength);
    if (Number.isFinite(parsedContentLength) && parsedContentLength > maxBodySize) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Request body too large.' }, { status: 413 })
      };
    }
  }

  try {
    const text = await req.text();
    if (text.length > maxBodySize) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Request body too large.' }, { status: 413 })
      };
    }

    return {
      ok: true,
      data: JSON.parse(text) as T
    };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    };
  }
};
