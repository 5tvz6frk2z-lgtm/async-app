-- Enable deletion for team members (Self-leave and Manager-remove)
drop policy if exists "Self leave team" on public.team_members;
create policy "Self leave team" on public.team_members
  for delete using (auth.uid() = user_id);

drop policy if exists "Manager remove member" on public.team_members;
create policy "Manager remove member" on public.team_members
  for delete using (
    exists (
      select 1 from public.team_members as managers
      where managers.team_id = team_members.team_id
      and managers.role = 'manager'
      and managers.user_id = auth.uid()
    )
  );

-- Enable deletion for reports (Cleanup when leaving)
drop policy if exists "Delete own reports" on public.reports;
create policy "Delete own reports" on public.reports
  for delete using (auth.uid() = user_id);

-- Optional: Allow managers to delete reports of their team members?
-- Probably safely covered by 'Delete own reports' for the Leave Team feature.
