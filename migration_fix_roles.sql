-- FIX RLS & ENFORCE ROLES

-- 1. Helper: Get my Member-Only Team IDs (Used for Report Creation)
create or replace function public.get_my_member_team_ids()
returns setof uuid language sql security definer stable as $$
  select team_id from public.team_members where user_id = auth.uid() and role = 'member'
$$;

-- 2. UPDATE REPORTS POLICIES
drop policy if exists "Insert team reports" on public.reports;

-- ONLY Members can insert reports (and only for their own user_id)
create policy "Insert team reports" on public.reports for insert with check (
    team_id in (select get_my_member_team_ids()) 
    and auth.uid() = user_id
);

-- Managers and Members can VIEW reports (Existing policy is fine, but let's be explicit)
drop policy if exists "View team reports" on public.reports;
create policy "View team reports" on public.reports for select using (
    team_id in (select get_my_team_ids())
);

-- 3. UPDATE TEAM MEMBERS POLICIES (Fixing Potential Join Issues)
drop policy if exists "Join team" on public.team_members;
-- Allow users to insert themselves (Joining)
create policy "Join team" on public.team_members for insert with check (
    auth.uid() = user_id
);

-- 4. UPDATE TEAMS POLICIES
drop policy if exists "Create team" on public.teams;
-- Anyone authenticated can create a team
create policy "Create team" on public.teams for insert with check (
    auth.role() = 'authenticated'
);

-- 5. FUNCTION to safely get user role
create or replace function public.get_my_role(lookup_team_id uuid)
returns text language sql security definer stable as $$
  select role from public.team_members where user_id = auth.uid() and team_id = lookup_team_id
$$;
