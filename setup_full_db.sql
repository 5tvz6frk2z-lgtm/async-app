-- STATUS LOOP: FULL DATABASE SETUP (V2)
-- Run this in Supabase SQL Editor to initialize the entire database.

-- 1. CLEANUP (Optional - Use with caution if re-running)
-- drop table if exists public.plan_items;
-- drop table if exists public.reports;
-- drop table if exists public.team_members;
-- drop table if exists public.teams;
-- drop table if exists public.profiles;

-- 2. TEAMS TABLE
create table if not exists public.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  billing_email text,
  subscription_status text check (subscription_status in ('active', 'trial', 'past_due')) default 'trial',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. PROFILES TABLE (Linked to Auth Users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. TEAM MEMBERS (The link between Users and Teams)
create table if not exists public.team_members (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text check (role in ('manager', 'member')) default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, user_id)
);

-- 5. REPORTS (Scoped to Team)
create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date default CURRENT_DATE not null,
  sentiment text check (sentiment in ('red', 'yellow', 'green')) not null,
  blockers text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, user_id, date)
);

-- 6. PLAN ITEMS
create table if not exists public.plan_items (
  id uuid default gen_random_uuid() primary key,
  report_id uuid references public.reports(id) on delete cascade not null,
  content text not null,
  status text check (status in ('todo', 'done', 'carried_over')) default 'todo',
  type text check (type in ('plan_for_tomorrow', 'actual_done_today')) not null
);

-- 7. AUTOMATION: Auto-Create Profile on Signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger checks
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. SECURITY: RLS POLICIES

-- Enable RLS
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.team_members enable row level security;
alter table public.reports enable row level security;
alter table public.plan_items enable row level security;

-- Helper to find my teams
create or replace function public.get_my_team_ids()
returns setof uuid language sql security definer stable as $$
  select team_id from public.team_members where user_id = auth.uid()
$$;

-- PROFILES Policies
create policy "Public profile view" on public.profiles for select using (true);
create policy "Update own profile" on public.profiles for update using (id = auth.uid());
create policy "Insert own profile" on public.profiles for insert with check (id = auth.uid()); -- Allows manual insert if trigger fails

-- TEAMS Policies
create policy "View my teams" on public.teams for select using (id in (select get_my_team_ids()));
create policy "Managers update teams" on public.teams for update 
  using (id in (select team_id from public.team_members where user_id = auth.uid() and role = 'manager'));
-- Allow inserting a new team (Anyone can create a team to start)
create policy "Create team" on public.teams for insert with check (true);

-- TEAM MEMBERS Policies
create policy "View members of my teams" on public.team_members for select using (team_id in (select get_my_team_ids()));
-- Allow creating membership (Usually handled by invite logic, but for now allow self-join or manager add)
create policy "Join team" on public.team_members for insert with check (true); 

-- REPORTS Policies
create policy "View team reports" on public.reports for select using (team_id in (select get_my_team_ids()));
create policy "Insert team reports" on public.reports for insert with check (team_id in (select get_my_team_ids()) and auth.uid() = user_id);

-- PLAN ITEMS Policies
create policy "View/Manage plan items" on public.plan_items for all
  using ( exists (select 1 from public.reports where reports.id = plan_items.report_id and reports.team_id in (select get_my_team_ids())) );

-- 9. INDICES
create index if not exists idx_team_members_user on public.team_members(user_id);
create index if not exists idx_team_members_team on public.team_members(team_id);
create index if not exists idx_reports_team_date on public.reports(team_id, date);

-- Success Confirmation
select 'Database Setup Complete' as status;
