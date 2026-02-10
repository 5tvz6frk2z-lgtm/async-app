
-- NUCLEAR CLEANUP SCRIPT
-- WARNING: This deletes ALL data in the application.

-- 1. Truncate Tables (Cascade will handle dependencies)
truncate table public.plan_items cascade;
truncate table public.reports cascade;
truncate table public.invitations cascade;
truncate table public.team_members cascade;
truncate table public.teams cascade;
truncate table public.profiles cascade;

-- 2. Clean Auth Users (If possible via SQL, usually restricted)
-- "delete from auth.users;" often requires superuser or specific permissions.
-- If this fails, please delete users via Supabase Dashboard > Authentication.

-- Safe attempt:
do $$
begin
  delete from auth.users where email like '%@test.com';
exception when others then
  raise notice 'Could not delete auth users via SQL. Please delete manually in Dashboard.';
end
$$;
