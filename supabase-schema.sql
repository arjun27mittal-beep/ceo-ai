-- ================================================================
-- CEO AI — Supabase Schema  (safe to re-run)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- ── Profiles ────────────────────────────────────────────────────
create table if not exists profiles (
  id         uuid references auth.users on delete cascade primary key,
  full_name  text    not null default '',
  email      text    not null default '',
  role       text    not null default 'Founder & CEO',
  company    text    not null default '',
  -- Admin/free-access flag. Set to true for test/demo accounts.
  -- Never expose this to client-side app code — only the API server reads it.
  is_admin   boolean not null default false,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Users can view own profile') then
    create policy "Users can view own profile"   on profiles for select using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Users can insert own profile') then
    create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Users can update own profile') then
    create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
  end if;
end $$;

-- ── Grant admin/free access to specific accounts ─────────────────
-- Run this AFTER the account has been created via the app sign-up.
-- This sets the is_admin flag so the API server bypasses rate limits.
-- Replace with actual user IDs from auth.users for extra security.
update profiles set is_admin = true
  where email = 'arjun27mittal@gmail.com';

-- ── Transactions ─────────────────────────────────────────────────
-- Stores all revenue and expense entries. MRR = revenue where date
-- is in the current calendar month.
create table if not exists transactions (
  id          uuid    default gen_random_uuid() primary key,
  user_id     uuid    references auth.users on delete cascade not null,
  type        text    not null check (type in ('revenue', 'expense')),
  amount      numeric not null check (amount > 0),
  description text    not null,
  category    text    not null default 'Other',
  date        date    not null default current_date,
  created_at  timestamptz default now()
);

alter table transactions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='transactions' and policyname='Users can manage own transactions') then
    create policy "Users can manage own transactions" on transactions
      for all using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists transactions_user_date on transactions (user_id, date desc);

-- ── Tasks ─────────────────────────────────────────────────────────
create table if not exists tasks (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users on delete cascade not null,
  title      text not null,
  priority   text not null default 'mid' check (priority in ('high', 'mid', 'low')),
  status     text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  due_date   date,
  created_at timestamptz default now()
);

alter table tasks enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='tasks' and policyname='Users can manage own tasks') then
    create policy "Users can manage own tasks" on tasks for all using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists tasks_user_id on tasks (user_id);

-- ── Goals ─────────────────────────────────────────────────────────
create table if not exists goals (
  id         uuid    default gen_random_uuid() primary key,
  user_id    uuid    references auth.users on delete cascade not null,
  title      text    not null,
  target     numeric not null default 0 check (target >= 0),
  current    numeric not null default 0,
  unit       text    not null default '$',
  deadline   date,
  created_at timestamptz default now()
);

alter table goals enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='goals' and policyname='Users can manage own goals') then
    create policy "Users can manage own goals" on goals for all using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists goals_user_id on goals (user_id);

-- ── Chat Messages ──────────────────────────────────────────────────
create table if not exists chat_messages (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users on delete cascade not null,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz default now()
);

alter table chat_messages enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='chat_messages' and policyname='Users can manage own chat messages') then
    create policy "Users can manage own chat messages" on chat_messages
      for all using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists chat_messages_user_created on chat_messages (user_id, created_at desc);

-- ── Add is_admin column if it doesn't exist (for existing installs) ──
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'is_admin'
  ) then
    alter table profiles add column is_admin boolean not null default false;
  end if;
end $$;
