-- Add Email column to team_members for easier display
alter table public.team_members 
add column if not exists email text;

-- Optional: You might want to backfill this if possible, 
-- but since we can't easily access auth.users from here without a security definer function,
-- we'll rely on new invites populating it.
