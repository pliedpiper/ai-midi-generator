import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('generations')
    .select('id, title, model, attempt_index, prefs, composition, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to fetch generations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generations.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ generations: data ?? [] });
}
