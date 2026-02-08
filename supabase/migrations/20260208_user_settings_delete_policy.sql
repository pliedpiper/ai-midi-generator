-- Allow users to remove their own OpenRouter key row.
drop policy if exists "user_settings_delete_own" on public.user_settings;
create policy "user_settings_delete_own"
on public.user_settings
for delete
using (auth.uid() = user_id);
