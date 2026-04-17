import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { buildCspDirectives } from '@/lib/security/csp';

export async function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = await updateSession(request, requestHeaders);
  const cspHeaderKey =
    process.env.CSP_REPORT_ONLY === 'true'
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';

  response.headers.set(
    cspHeaderKey,
    buildCspDirectives({
      isProduction: process.env.NODE_ENV === 'production',
      nonce,
    })
  );
  response.headers.set('x-nonce', nonce);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'
  ]
};
