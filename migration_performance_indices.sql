-- PERFORMANCE INDICES
-- 1. Index for plan_items foreign key (Critical for joins and cascading deletes)
create index if not exists idx_plan_items_report_id on public.plan_items(report_id);

-- 2. Index for User History lookups (e.g. "Get my last 5 reports")
create index if not exists idx_reports_user_id_date on public.reports(user_id, date desc);

-- 3. Composite index for efficient "Team's Daily Status" lookup
-- Existing index is (team_id, date). This is good for "Everyone on Team A on Date X".
-- We can ensure it is optimal by explicitly defining sorting if queries use it.
drop index if exists idx_reports_team_date;
create index idx_reports_team_date on public.reports(team_id, date desc);
