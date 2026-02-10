-- Production Performance Indexes
-- Run this migration to optimize queries for 1000 users / 245 teams

-- 1. Reports table - Critical for dashboard queries
CREATE INDEX IF NOT EXISTS idx_reports_user_date ON public.reports(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_team_user ON public.reports(team_id, user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- 2. Plan Items - Critical for aggregation queries
CREATE INDEX IF NOT EXISTS idx_plan_items_report_type ON public.plan_items(report_id, type);
CREATE INDEX IF NOT EXISTS idx_plan_items_type_status ON public.plan_items(type, status);

-- 3. Team Members - Critical for permission checks
CREATE INDEX IF NOT EXISTS idx_team_members_role ON public.team_members(team_id, role);

-- 4. Invitations - For pending invite queries
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status, team_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token) WHERE status = 'pending';

-- 5. Composite index for common burnout query pattern
CREATE INDEX IF NOT EXISTS idx_reports_burnout_lookup ON public.reports(team_id, user_id, date DESC);

-- Analyze tables to update statistics
ANALYZE public.reports;
ANALYZE public.plan_items;
ANALYZE public.team_members;
ANALYZE public.invitations;
