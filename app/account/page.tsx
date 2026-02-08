import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AccountSettingsPage from '@/components/AccountSettingsPage';

export const dynamic = 'force-dynamic';

const Page = async () => {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let initialOpenRouterConfigured = false;
  let initialOpenRouterUpdatedAt: string | null = null;

  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('openrouter_api_key_encrypted, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Failed to load user settings for account page:', error);
  } else {
    initialOpenRouterConfigured = Boolean(settings?.openrouter_api_key_encrypted);
    initialOpenRouterUpdatedAt = settings?.updated_at ?? null;
  }

  return (
    <AccountSettingsPage
      userEmail={user.email ?? 'Logged in'}
      initialOpenRouterConfigured={initialOpenRouterConfigured}
      initialOpenRouterUpdatedAt={initialOpenRouterUpdatedAt}
    />
  );
};

export default Page;
