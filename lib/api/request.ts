import { isIP } from 'node:net';
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

const VERCEL_FORWARDED_IP_HEADER = 'x-vercel-forwarded-for';
const TRUSTED_PROXY_IP_HEADERS_ENV = 'TRUSTED_PROXY_IP_HEADERS';

const getTrustedProxyIpHeaders = (): string[] => {
  const configuredHeaders = process.env[TRUSTED_PROXY_IP_HEADERS_ENV]
    ?.split(',')
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);

  if (configuredHeaders?.length) {
    return configuredHeaders;
  }

  return process.env.VERCEL === '1' ? [VERCEL_FORWARDED_IP_HEADER] : [];
};

const normalizeIpCandidate = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const candidate = value.trim();
  return isIP(candidate) ? candidate : null;
};

export const getClientIp = (req: Request): string => {
  for (const header of getTrustedProxyIpHeaders()) {
    const forwarded = req.headers.get(header);
    if (!forwarded) {
      continue;
    }

    for (const candidate of forwarded.split(',')) {
      const normalized = normalizeIpCandidate(candidate);
      if (normalized) {
        return normalized;
      }
    }
  }

  return 'unknown';
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
    let text = '';
    let totalBytes = 0;

    if (req.body) {
      const reader = req.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          if (!value) {
            continue;
          }

          totalBytes += value.byteLength;
          if (totalBytes > maxBodySize) {
            await reader.cancel('Request body too large.');
            return {
              ok: false,
              response: NextResponse.json({ error: 'Request body too large.' }, { status: 413 })
            };
          }

          text += decoder.decode(value, { stream: true });
        }

        text += decoder.decode();
      } finally {
        reader.releaseLock();
      }
    } else {
      text = '';
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
