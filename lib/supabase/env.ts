const SUPABASE_URL_ENV = 'NEXT_PUBLIC_SUPABASE_URL';
const SUPABASE_PUBLISHABLE_KEY_ENV = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY';
const SUPABASE_ANON_KEY_ENV = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

export const getSupabaseEnv = () => {
  const url = process.env[SUPABASE_URL_ENV];
  const publishableOrAnonKey =
    process.env[SUPABASE_PUBLISHABLE_KEY_ENV] || process.env[SUPABASE_ANON_KEY_ENV];

  if (!url || !publishableOrAnonKey) {
    throw new Error(
      `${SUPABASE_URL_ENV} and ${SUPABASE_PUBLISHABLE_KEY_ENV} (or ${SUPABASE_ANON_KEY_ENV}) must be configured`
    );
  }

  return { url, anonKey: publishableOrAnonKey };
};
