-- RLS RECURSION FIX

-- 1. Drop existing policies that might be recursive
drop policy if exists "View members of my teams" on public.team_members;
drop policy if exists "Members can view their teams" on public.team_members; -- Just in case name varied

-- 2. Update Function to be Search-Path Safe and Definer
create or replace function public.get_my_team_ids()
returns setof uuid language sql security definer set search_path = public stable as $$
  select team_id from public.team_members where user_id = auth.uid()
$$;

-- 3. Create Optimized Non-Recursive Policy
-- The "user_id = auth.uid()" clause ensures that when the function queries for the *current user*, 
-- it succeeds immediately without needing to call the function again (recursion breaker).
create policy "View members of my teams"
  on public.team_members for select
  using ( 
    user_id = auth.uid() 
    OR 
    team_id in (select get_my_team_ids()) 
  );

-- 4. Ensure Reports Policy is correct (Re-applying just in case)
drop policy if exists "Insert reports for my teams" on public.reports;
create policy "Insert reports for my teams"
  on public.reports for insert
  with check ( 
    team_id in (select get_my_team_ids()) 
    and auth.uid() = user_id 
  );
