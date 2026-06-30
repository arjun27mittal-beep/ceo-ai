-- CEO AI — Row Level Security for public.profiles
--
-- WHY: The app ships the public Supabase anon key inside the binary. Without a
-- restrictive SELECT policy, anyone holding that key can read EVERY row in
-- `profiles` (email, full_name, is_admin). The app only ever needs the current
-- user's own profile, so we scope all access to `id = auth.uid()`.
--
-- The server (api-server) uses the Supabase SERVICE ROLE key, which bypasses
-- RLS, so these policies do not affect server-side profile creation/upserts.
-- Do NOT enable `force row level security` (that would also block the server).
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> Run.

alter table public.profiles enable row level security;

-- Drop any pre-existing (possibly permissive) policies, then recreate
-- least-privilege rules.
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', p.policyname);
  end loop;
end $$;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

-- Verify: run as anon (no auth) and confirm 0 rows are returned.
--   select * from public.profiles;
