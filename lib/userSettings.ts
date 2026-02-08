import type { SupabaseClient } from '@supabase/supabase-js';

const OPENROUTER_KEY_PREFIX = 'sk-or-';
const OPENROUTER_KEY_MAX_LENGTH = 200;

export type OpenRouterKeyValidationResult =
  | { valid: true; normalized: string }
  | { valid: false; error: string };

export const validateOpenRouterApiKey = (apiKey: unknown): OpenRouterKeyValidationResult => {
  if (typeof apiKey !== 'string') {
    return { valid: false, error: 'apiKey must be a string.' };
  }

  const normalized = apiKey.trim();
  if (!normalized) {
    return { valid: false, error: 'apiKey is required.' };
  }
  if (!normalized.startsWith(OPENROUTER_KEY_PREFIX)) {
    return { valid: false, error: 'apiKey must start with sk-or-.' };
  }
  if (normalized.length > OPENROUTER_KEY_MAX_LENGTH) {
    return { valid: false, error: `apiKey must be ${OPENROUTER_KEY_MAX_LENGTH} characters or less.` };
  }

  return { valid: true, normalized };
};

export const getEncryptedOpenRouterKey = async (
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('openrouter_api_key_encrypted')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.openrouter_api_key_encrypted ?? null;
};

export const upsertEncryptedOpenRouterKey = async (
  supabase: SupabaseClient,
  userId: string,
  encryptedKey: string
) => {
  return supabase.from('user_settings').upsert(
    {
      user_id: userId,
      openrouter_api_key_encrypted: encryptedKey
    },
    { onConflict: 'user_id' }
  );
};
