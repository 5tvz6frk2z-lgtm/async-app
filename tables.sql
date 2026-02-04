-- Create Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('manager', 'member')) default 'member',
  name text,
  team_id uuid default gen_random_uuid(), -- For now, auto-generate or link to a Teams table if needed
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Reports table
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date default CURRENT_DATE not null,
  sentiment text check (sentiment in ('red', 'yellow', 'green')) not null,
  blockers text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

-- Create Plan Items table
create table public.plan_items (
  id uuid default gen_random_uuid() primary key,
  report_id uuid references public.reports(id) on delete cascade not null,
  content text not null,
  status text check (status in ('todo', 'done', 'carried_over')) default 'todo',
  type text check (type in ('plan_for_tomorrow', 'actual_done_today')) not null
);

-- RLS Policies

-- Profiles
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update their own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Reports
alter table public.reports enable row level security;

create policy "Users can view their own reports"
  on public.reports for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own reports"
  on public.reports for insert
  with check ( auth.uid() = user_id );

-- Managers can view all reports in their team (Implied team logic - for now, simpler: Managers view all)
-- Assuming we have a way to identify managers. 
-- For MVP without complex team logic, we might let Managers see ALL profiles/reports.
create policy "Managers can view all reports"
  on public.reports for select
  using ( 
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'manager'
    )
  );

-- Plan Items
alter table public.plan_items enable row level security;

create policy "Users can view their own plan items"
  on public.plan_items for select
  using ( 
    exists (
      select 1 from public.reports
      where reports.id = plan_items.report_id and reports.user_id = auth.uid()
    )
  );

create policy "Users can manage their own plan items"
  on public.plan_items for all
  using (
    exists (
      select 1 from public.reports
      where reports.id = plan_items.report_id and reports.user_id = auth.uid()
    )
  );
