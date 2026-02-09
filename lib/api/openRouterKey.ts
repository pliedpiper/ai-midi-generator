import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptSecret } from '@/utils/encryption';
import { getEncryptedOpenRouterKey } from '@/lib/userSettings';

type OpenRouterKeySuccess = {
  ok: true;
  apiKey: string;
};

type OpenRouterKeyFailure = {
  ok: false;
  response: NextResponse;
};

export type OpenRouterKeyResult = OpenRouterKeySuccess | OpenRouterKeyFailure;

type ResolveKeyInput = {
  supabase: SupabaseClient;
  userId: string;
  missingKeyMessage: string;
  failureMessage: string;
  failureLogLabel: string;
};

export const resolveDecryptedOpenRouterKey = async (
  input: ResolveKeyInput
): Promise<OpenRouterKeyResult> => {
  try {
    const encryptedKey = await getEncryptedOpenRouterKey(input.supabase, input.userId);
    if (!encryptedKey) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: input.missingKeyMessage },
          { status: 400 }
        )
      };
    }

    return {
      ok: true,
      apiKey: decryptSecret(encryptedKey)
    };
  } catch (error) {
    console.error(`${input.failureLogLabel}:`, error);
    return {
      ok: false,
      response: NextResponse.json(
        { error: input.failureMessage },
        { status: 500 }
      )
    };
  }
};
