const SUPABASE_URL_ENV = 'NEXT_PUBLIC_SUPABASE_URL';
const SUPABASE_PUBLISHABLE_KEY_ENV = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY';
const SUPABASE_ANON_KEY_ENV = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

export const getSupabaseEnv = () => {
  // Use direct property access so Next.js can properly expose env vars in middleware/edge runtime.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableOrAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableOrAnonKey) {
    throw new Error(
      `${SUPABASE_URL_ENV} and ${SUPABASE_PUBLISHABLE_KEY_ENV} (or ${SUPABASE_ANON_KEY_ENV}) must be configured`
    );
  }

  return { url, anonKey: publishableOrAnonKey };
};
