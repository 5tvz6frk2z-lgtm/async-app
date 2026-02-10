-- MIGRATION: Fix RLS Policies for Multi-Team Architecture

-- 1. Enable RLS on Teams
alter table public.teams enable row level security;

-- Drop existing policies to prevent conflicts
drop policy if exists "Users can create teams" on public.teams;
drop policy if exists "Members view their teams" on public.teams;
drop policy if exists "Managers update their teams" on public.teams;
drop policy if exists "View team memberships" on public.team_members;
drop policy if exists "Users can join teams" on public.team_members;
drop policy if exists "Managers remove members" on public.team_members;

-- Policy: Authenticated users can create a new team
create policy "Users can create teams"
  on public.teams for insert
  with check ( auth.role() = 'authenticated' );

-- Policy: Members can view teams they belong to
create policy "Members view their teams"
  on public.teams for select
  using (
    exists (
      select 1 from public.team_members
      where team_members.team_id = teams.id
      and team_members.user_id = auth.uid()
    )
  );

-- Policy: Managers can update their teams
create policy "Managers update their teams"
  on public.teams for update
  using (
    exists (
      select 1 from public.team_members
      where team_members.team_id = teams.id
      and team_members.user_id = auth.uid()
      and team_members.role = 'manager'
    )
  );

-- 2. Enable RLS on Team Members
alter table public.team_members enable row level security;

-- Policy: View memberships
create policy "View team memberships"
  on public.team_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.team_members as m
      where m.team_id = team_members.team_id
      and m.user_id = auth.uid()
      and m.role = 'manager'
    )
  );

-- Policy: Create membership
create policy "Users can join teams"
  on public.team_members for insert
  with check ( user_id = auth.uid() );

-- Policy: Managers can delete members
create policy "Managers remove members"
  on public.team_members for delete
  using (
    exists (
      select 1 from public.team_members as m
      where m.team_id = team_members.team_id
      and m.user_id = auth.uid()
      and m.role = 'manager'
    )
  );

