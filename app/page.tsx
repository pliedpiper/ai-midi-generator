import { redirect } from 'next/navigation';
import GeneratorApp from '@/components/GeneratorApp';
import { createClient } from '@/lib/supabase/server';
import { getEncryptedOpenRouterKey } from '@/lib/userSettings';
import { getRandomEmptyStateCaption } from '@/constants';

export const dynamic = 'force-dynamic';

const Page = async () => {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let hasApiKey = false;
  try {
    hasApiKey = Boolean(await getEncryptedOpenRouterKey(supabase, user.id));
  } catch (error) {
    console.error('Failed to check OpenRouter key status:', error);
  }

  return (
    <GeneratorApp
      userEmail={user.email ?? 'Logged in'}
      initialHasApiKey={hasApiKey}
      initialEmptyStateCaption={getRandomEmptyStateCaption()}
    />
  );
};

export default Page;
