import { NextResponse } from 'next/server';

const CSRF_ERROR_MESSAGE = 'Cross-site requests are not allowed.';

const getOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const enforceSameOriginRequest = (req: Request): NextResponse | null => {
  const secFetchSite = req.headers.get('sec-fetch-site')?.toLowerCase();
  if (secFetchSite === 'cross-site') {
    return NextResponse.json({ error: CSRF_ERROR_MESSAGE }, { status: 403 });
  }

  const origin = req.headers.get('origin');
  if (!origin) {
    return null;
  }

  const originValue = getOrigin(origin);
  if (!originValue || originValue !== new URL(req.url).origin) {
    return NextResponse.json({ error: CSRF_ERROR_MESSAGE }, { status: 403 });
  }

  return null;
};
