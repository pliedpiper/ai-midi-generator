import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser } from '@/lib/api/auth';
import { parseJsonBodyWithLimit } from '@/lib/api/request';

export const runtime = 'nodejs';

const MAX_BODY_SIZE = 1_000;
const REQUIRED_CONFIRMATION = 'DELETE';

type DeleteAccountBody = {
  confirmation?: unknown;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const authResult = await requireAuthenticatedUser(supabase, 'Unauthorized.');
  if (authResult.ok === false) {
    return authResult.response;
  }

  const parsedBody = await parseJsonBodyWithLimit<DeleteAccountBody>(req, MAX_BODY_SIZE);
  if (parsedBody.ok === false) {
    return parsedBody.response;
  }

  const body = parsedBody.data;
  if (typeof body.confirmation !== 'string' || body.confirmation.trim() !== REQUIRED_CONFIRMATION) {
    return NextResponse.json(
      { error: `Type ${REQUIRED_CONFIRMATION} to confirm account deletion.` },
      { status: 400 }
    );
  }

  const { error } = await supabase.rpc('delete_current_user');
  if (error) {
    console.error('Failed to delete current user account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true });
}
