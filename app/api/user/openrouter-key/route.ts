import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  upsertEncryptedOpenRouterKey,
  validateOpenRouterApiKey
} from '@/lib/userSettings';
import { encryptSecret } from '@/utils/encryption';

export const runtime = 'nodejs';

const MAX_BODY_SIZE = 2_000;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('openrouter_api_key_encrypted, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      configured: Boolean(data?.openrouter_api_key_encrypted),
      updatedAt: data?.updated_at ?? null
    });
  } catch (error) {
    console.error('Failed to load OpenRouter key status:', error);
    return NextResponse.json(
      { error: 'Failed to load key status.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: { apiKey?: unknown };
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_SIZE) {
      return NextResponse.json({ error: 'Request body too large.' }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const validationResult = validateOpenRouterApiKey(body.apiKey);
  if (validationResult.valid === false) {
    return NextResponse.json({ error: validationResult.error }, { status: 400 });
  }

  try {
    const encryptedKey = encryptSecret(validationResult.normalized);
    const { error: upsertError } = await upsertEncryptedOpenRouterKey(
      supabase,
      user.id,
      encryptedKey
    );

    if (upsertError) {
      console.error('Failed to store encrypted OpenRouter key:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save API key.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ configured: true });
  } catch (error) {
    console.error('OpenRouter key save failed:', error);
    return NextResponse.json(
      { error: 'Failed to save API key.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { error } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ configured: false, removed: true });
  } catch (error) {
    console.error('OpenRouter key delete failed:', error);
    return NextResponse.json(
      { error: 'Failed to remove API key.' },
      { status: 500 }
    );
  }
}
