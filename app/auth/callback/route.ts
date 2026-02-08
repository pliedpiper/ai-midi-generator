import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeNextPath } from '@/utils/redirectPath';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = requestUrl.searchParams.get('next');

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const safeNextPath = sanitizeNextPath(nextPath);
  return NextResponse.redirect(new URL(safeNextPath, requestUrl.origin));
}
