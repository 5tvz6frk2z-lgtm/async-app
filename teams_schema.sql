
-- TEAMS & SETTINGS (Scalability Feature)
create table public.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique,
  settings jsonb default '{"reminder_time": "09:00", "enable_pulse": true}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add team_id to profiles if not exists (simulated via alter)
-- In a real migration this would be a separate file
alter table public.profiles add column if not exists team_id uuid references public.teams(id);

-- Index for Team Lookups
create index idx_profiles_team_id on public.profiles(team_id);
