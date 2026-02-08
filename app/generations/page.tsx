import { redirect } from 'next/navigation';
import GenerationsPage from '@/components/GenerationsPage';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const Page = async () => {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <GenerationsPage userEmail={user.email ?? 'Logged in'} />;
};

export default Page;
