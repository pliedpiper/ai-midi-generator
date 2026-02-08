import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MAX_BODY_SIZE = 1_000;
const REQUIRED_CONFIRMATION = 'DELETE';

type DeleteAccountBody = {
  confirmation?: unknown;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: DeleteAccountBody;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_SIZE) {
      return NextResponse.json({ error: 'Request body too large.' }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

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
