-- MIGRATION: Fix Constraints, RLS Policies, and Recursion (V4)
-- Run this in the Supabase SQL Editor to resolve "duplicate key" errors, "Leave Team" permission issues, and "Redirect Loops".

-- 1. FIX REPORTS UNIQUE CONSTRAINT
-- Ensure uniqueness is based on (team_id, user_id, date).
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE public.reports DROP CONSTRAINT reports_user_id_date_key;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        ALTER TABLE public.reports DROP CONSTRAINT reports_team_id_user_id_date_key;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    BEGIN
        DROP INDEX IF EXISTS reports_user_id_date_key;
    EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

ALTER TABLE public.reports 
ADD CONSTRAINT reports_team_id_user_id_date_key UNIQUE (team_id, user_id, date);

-- 2. FIX RECURSION & SELECT POLICIES
-- Ensure the helper function is SECURITY DEFINER to avoid infinite recursion in RLS.
CREATE OR REPLACE FUNCTION public.get_my_team_ids()
RETURNS setof uuid
LANGUAGE sql
SECURITY DEFINER -- CRITICAL: Bypasses RLS to read team_members
STABLE
AS $$
  select team_id from public.team_members where user_id = auth.uid()
$$;

-- Refine SELECT policy to use the safe function
DROP POLICY IF EXISTS "View members of my teams" ON public.team_members;
CREATE POLICY "View members of my teams" ON public.team_members
    FOR SELECT USING (team_id IN (SELECT get_my_team_ids()));

-- 3. FIX DELETE POLICIES (Leave Team / Remove Member)
DROP POLICY IF EXISTS "Self leave team" ON public.team_members;
CREATE POLICY "Self leave team" ON public.team_members
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Manager remove member" ON public.team_members;
CREATE POLICY "Manager remove member" ON public.team_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.team_members AS managers
            WHERE managers.team_id = public.team_members.team_id
            AND managers.role = 'manager'
            AND managers.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Delete own reports" ON public.reports;
CREATE POLICY "Delete own reports" ON public.reports
    FOR DELETE USING (auth.uid() = user_id);

SELECT 'Migration V4 Applied: Constraints, RLS Recursion, and Delete Policies Fixed' as status;
