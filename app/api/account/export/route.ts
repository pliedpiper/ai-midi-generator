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

  const [settingsResult, generationsResult] = await Promise.all([
    supabase
      .from('user_settings')
      .select('openrouter_api_key_encrypted, updated_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('generations')
      .select('id, title, model, attempt_index, prefs, composition, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
  ]);

  if (settingsResult.error) {
    console.error('Failed to fetch user settings export:', settingsResult.error);
    return NextResponse.json(
      { error: 'Failed to export account data.' },
      { status: 500 }
    );
  }

  if (generationsResult.error) {
    console.error('Failed to fetch generation export:', generationsResult.error);
    return NextResponse.json(
      { error: 'Failed to export account data.' },
      { status: 500 }
    );
  }

  const timestamp = new Date().toISOString();
  const payload = {
    exportedAt: timestamp,
    user: {
      id: user.id,
      email: user.email ?? null,
      createdAt: user.created_at ?? null
    },
    settings: {
      openRouterKeyConfigured: Boolean(settingsResult.data?.openrouter_api_key_encrypted),
      openRouterKeyUpdatedAt: settingsResult.data?.updated_at ?? null
    },
    generations: generationsResult.data ?? []
  };

  return NextResponse.json(payload, {
    headers: {
      'Content-Disposition': `attachment; filename="midi-generator-export-${timestamp.slice(0, 10)}.json"`
    }
  });
}
