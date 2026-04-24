import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser } from '@/lib/api/auth';
import { enforceSameOriginRequest } from '@/lib/api/csrf';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid generation id.' }, { status: 400 });
  }

  const supabase = await createClient();
  const authResult = await requireAuthenticatedUser(supabase, 'Unauthorized.');
  if (authResult.ok === false) {
    return authResult.response;
  }
  const user = authResult.user;

  const { data, error } = await supabase
    .from('generations')
    .select('id, title, model, attempt_index, prefs, composition, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch generation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generation.' },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: 'Generation not found.' }, { status: 404 });
  }

  return NextResponse.json({ generation: data });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const csrfResponse = enforceSameOriginRequest(req);
  if (csrfResponse) {
    return csrfResponse;
  }

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid generation id.' }, { status: 400 });
  }

  const supabase = await createClient();
  const authResult = await requireAuthenticatedUser(supabase, 'Unauthorized.');
  if (authResult.ok === false) {
    return authResult.response;
  }
  const user = authResult.user;

  const { error } = await supabase
    .from('generations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to delete generation:', error);
    return NextResponse.json(
      { error: 'Failed to delete generation.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true });
}
