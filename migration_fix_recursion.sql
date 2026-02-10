-- MIGRATION: Fix Infinite Recursion in RLS

-- 1. Helper Function to Check Manager Role (Security Definer to bypass RLS)
create or replace function public.is_manager_of(searched_team_id uuid)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from public.team_members
    where team_id = searched_team_id
    and user_id = auth.uid()
    and role = 'manager'
  );
end;
$$;

-- 2. Drop conflicting policies
drop policy if exists "View team memberships" on public.team_members;
drop policy if exists "Managers remove members" on public.team_members;

-- 3. Re-create Policies using the Safe Function

-- Policy: View memberships
-- Users can see their own membership OR if they are a manager of the team
create policy "View team memberships"
  on public.team_members for select
  using (
    user_id = auth.uid()
    or public.is_manager_of(team_id)
  );

-- Policy: Managers can delete members
create policy "Managers remove members"
  on public.team_members for delete
  using (
    public.is_manager_of(team_id)
  );
