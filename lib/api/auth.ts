import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

type AuthClient = {
  auth: {
    getUser: () => Promise<{ data: { user: User | null }; error: unknown }>;
  };
};

type AuthSuccess = {
  ok: true;
  user: User;
};

type AuthFailure = {
  ok: false;
  response: NextResponse;
};

export type AuthResult = AuthSuccess | AuthFailure;

export const requireAuthenticatedUser = async (
  client: AuthClient,
  unauthorizedMessage: string
): Promise<AuthResult> => {
  const {
    data: { user },
    error
  } = await client.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: unauthorizedMessage }, { status: 401 })
    };
  }

  return { ok: true, user };
};
