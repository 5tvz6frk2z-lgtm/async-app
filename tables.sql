-- Status Loop Schema V2 (Multi-Team)

-- 1. TEAMS (Workspaces)
-- A team is the billing unit.
create table public.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  billing_email text, -- Manager's email for invoices
  subscription_status text check (subscription_status in ('active', 'trial', 'past_due')) default 'trial',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. PROFILES (Users)
-- Users are now global entities, not tied to a single team in this table.
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text, -- Cached from auth.users for display
  avatar_url text, -- For profile pictures
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Note: 'role' and 'team_id' are removed from profiles in V2 context.

-- 3. TEAM MEMBERS (Junction)
-- Links Users to Teams with a specific role.
-- Billing is calculated based on these records.
create table public.team_members (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text check (role in ('manager', 'member')) default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, user_id) -- User can only be in a team once
);

-- 4. REPORTS
-- Scoped to a Team.
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade not null, -- NEW: Team Scope
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date default CURRENT_DATE not null,
  sentiment text check (sentiment in ('red', 'yellow', 'green')) not null,
  blockers text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, user_id, date) -- Constraint now includes team_id
);

-- 5. PLAN ITEMS
-- Defined by Report, so implicitly scoped to Team.
create table public.plan_items (
  id uuid default gen_random_uuid() primary key,
  report_id uuid references public.reports(id) on delete cascade not null,
  content text not null,
  status text check (status in ('todo', 'done', 'carried_over')) default 'todo',
  type text check (type in ('plan_for_tomorrow', 'actual_done_today')) not null
);

-- RLS POLICIES (V2)

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.team_members enable row level security;
alter table public.reports enable row level security;
alter table public.plan_items enable row level security;

-- Helper: Get My Team IDs
create or replace function public.get_my_team_ids()
returns setof uuid language sql security definer stable as $$
  select team_id from public.team_members where user_id = auth.uid()
$$;

-- TEAMS
create policy "Members can view their teams"
  on public.teams for select
  using ( id in (select get_my_team_ids()) );

create policy "Managers can update their teams"
  on public.teams for update
  using ( 
    id in (
      select team_id from public.team_members 
      where user_id = auth.uid() and role = 'manager'
    ) 
  );

-- PROFILES
create policy "Public profile view" -- Simplified for listing members
  on public.profiles for select
  using ( true );

create policy "Users can update own profile"
  on public.profiles for update
  using ( id = auth.uid() );

-- TEAM MEMBERS
create policy "View members of my teams"
  on public.team_members for select
  using ( team_id in (select get_my_team_ids()) );

-- REPORTS
create policy "View reports for any team I belong to"
  on public.reports for select
  using ( team_id in (select get_my_team_ids()) );

create policy "Insert reports for my teams"
  on public.reports for insert
  with check ( 
    team_id in (select get_my_team_ids()) 
    and auth.uid() = user_id 
  );
  
-- PLAN ITEMS
create policy "View plan items for my teams"
  on public.plan_items for select
  using (
    exists (
      select 1 from public.reports
      where reports.id = plan_items.report_id
      and reports.team_id in (select get_my_team_ids())
    )
  );

-- INDICES
create index idx_team_members_user on public.team_members(user_id);
create index idx_team_members_team on public.team_members(team_id);
create index idx_reports_team_date on public.reports(team_id, date);
