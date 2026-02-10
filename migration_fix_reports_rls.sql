-- MIGRATION: Fix Reports RLS Policies (Insert/Update)
-- Fixes "row-level security policy violation" on report submission.

-- 1. DROP EXISTING POLICIES to ensure clean slate
DROP POLICY IF EXISTS "Enable insert for own reports" ON public.reports;
DROP POLICY IF EXISTS "Enable update for own reports" ON public.reports;
DROP POLICY IF EXISTS "Enable read access for own reports" ON public.reports;
DROP POLICY IF EXISTS "Enable read access for team managers" ON public.reports;
DROP POLICY IF EXISTS "Users can insert their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;

-- 2. CREATE PERMISSIVE POLICIES

-- INSERT: Allow users to insert rows where they are the owner
CREATE POLICY "Enable insert for own reports" ON public.reports
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Allow users to update rows where they are the owner
CREATE POLICY "Enable update for own reports" ON public.reports
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- SELECT: Allow users to view own reports
CREATE POLICY "Enable read access for own reports" ON public.reports
    FOR SELECT
    USING (auth.uid() = user_id);

-- SELECT: Allow managers to view reports for their team
-- Uses the safe 'get_my_team_ids' function if available, or raw join if not.
-- Assuming 'get_my_team_ids' exists from V4. If not, we use raw exists.
CREATE POLICY "Enable read access for team managers" ON public.reports
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = public.reports.team_id
            AND tm.user_id = auth.uid()
            AND tm.role = 'manager'
        )
    );

SELECT 'Migration Applied: Reports RLS Fixed for Insert/Update' as status;
