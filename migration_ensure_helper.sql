-- Ensure helper function exists and is accessible
create or replace function public.get_my_team_ids()
returns setof uuid language sql security definer stable as $$
  select team_id from public.team_members where user_id = auth.uid()
$$;

grant execute on function public.get_my_team_ids() to authenticated;
grant execute on function public.get_my_team_ids() to anon;
