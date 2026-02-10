-- MIGRATION SCRIPT: V1 to V2 (Multi-Team)
-- Run this in Supabase SQL Editor to migrate your data.

BEGIN;

-- 1. Create new Tables if they don't exist
create table if not exists public.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  billing_email text, 
  subscription_status text default 'trial',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.team_members (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, user_id)
);

-- 2. Migrate Data from Profiles -> Teams
-- Explanation: In V1, 'profiles.team_id' defined the team. We promote distinct team_ids to actual Teams.

-- Insert Teams
insert into public.teams (id, name, created_at)
select distinct team_id, 'My Team (' || substr(team_id::text, 1, 4) || ')', now()
from public.profiles
where team_id is not null
on conflict (id) do nothing;

-- Insert Members
insert into public.team_members (team_id, user_id, role, joined_at)
select team_id, id, role, created_at
from public.profiles
where team_id is not null
on conflict (team_id, user_id) do nothing;

-- 3. Update Reports with Team ID
-- Add column if missing
do $$ 
begin 
    if not exists (select 1 from information_schema.columns where table_name = 'reports' and column_name = 'team_id') then
        alter table public.reports add column team_id uuid references public.teams(id) on delete cascade;
    end if;
end $$;

-- Populate team_id based on the user's current team (Simplification: assumes historical reports belong to current team)
update public.reports
set team_id = (select team_id from public.profiles where profiles.id = reports.user_id)
where team_id is null;

-- Enforce Not Null on team_id after population
alter table public.reports alter column team_id set not null;

-- 4. Cleanup (Optional - Commented out for safety)
-- alter table public.profiles drop column team_id;
-- alter table public.profiles drop column role;

COMMIT;

-- Output success
select count(*) as teams_created from public.teams;
