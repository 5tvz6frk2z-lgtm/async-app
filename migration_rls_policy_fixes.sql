-- RLS Policy Fixes for App Store Security Compliance
-- Run this in Supabase SQL Editor
-- Safe to re-run: Uses DROP IF EXISTS before CREATE

-- 1. Reports UPDATE policy (allows editing own reports)
DROP POLICY IF EXISTS "Update own reports" ON public.reports;
CREATE POLICY "Update own reports" ON public.reports 
  FOR UPDATE 
  USING (auth.uid() = user_id AND team_id IN (SELECT get_my_team_ids()))
  WITH CHECK (auth.uid() = user_id AND team_id IN (SELECT get_my_team_ids()));

-- 2. Reports DELETE policy (allows deleting own reports)
DROP POLICY IF EXISTS "Delete own reports" ON public.reports;
CREATE POLICY "Delete own reports" ON public.reports 
  FOR DELETE 
  USING (auth.uid() = user_id AND team_id IN (SELECT get_my_team_ids()));

-- 3. Team Members DELETE policy (allows leaving a team)
DROP POLICY IF EXISTS "Leave team" ON public.team_members;
CREATE POLICY "Leave team" ON public.team_members 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- 4. Fix plan_items policy - Replace overly permissive "for all" with specific policies
DROP POLICY IF EXISTS "View/Manage plan items" ON public.plan_items;
DROP POLICY IF EXISTS "View plan items" ON public.plan_items;
DROP POLICY IF EXISTS "Insert plan items" ON public.plan_items;
DROP POLICY IF EXISTS "Update own plan items" ON public.plan_items;
DROP POLICY IF EXISTS "Delete own plan items" ON public.plan_items;

-- Create specific policies for plan_items
CREATE POLICY "View plan items" ON public.plan_items 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.reports 
      WHERE reports.id = plan_items.report_id 
      AND reports.team_id IN (SELECT get_my_team_ids())
    )
  );

CREATE POLICY "Insert plan items" ON public.plan_items 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reports 
      WHERE reports.id = plan_items.report_id 
      AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Update own plan items" ON public.plan_items 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.reports 
      WHERE reports.id = plan_items.report_id 
      AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Delete own plan items" ON public.plan_items 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.reports 
      WHERE reports.id = plan_items.report_id 
      AND reports.user_id = auth.uid()
    )
  );

-- Success
SELECT 'RLS Policy Fixes Applied Successfully' as status;
