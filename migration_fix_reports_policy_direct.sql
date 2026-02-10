-- Simplify Reports Policy (Direct Subquery)
-- This avoids reliance on the helper function for Insert checks, 
-- ensuring even if the function permissions 'security definer' are wonky, this standard SQL works.

drop policy if exists "Insert reports for my teams" on public.reports;

create policy "Insert reports for my teams"
  on public.reports for insert
  with check ( 
    auth.uid() = user_id
    AND
    exists (
      select 1 from public.team_members
      where team_members.team_id = reports.team_id
      and team_members.user_id = auth.uid()
    )
  );
