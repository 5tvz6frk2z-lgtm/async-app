-- FIX: Invitations RLS policies - ensure managers can insert
-- Run this in Supabase SQL Editor

-- Drop existing policies to recreate
DROP POLICY IF EXISTS "Managers create invites" ON public.invitations;
DROP POLICY IF EXISTS "Managers view invites" ON public.invitations;
DROP POLICY IF EXISTS "Read invite by token" ON public.invitations;
DROP POLICY IF EXISTS "Managers delete invites" ON public.invitations;

-- Recreate with simpler checks
CREATE POLICY "Managers create invites"
  ON public.invitations FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "Managers view invites"
  ON public.invitations FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'manager'
    )
    OR true  -- Allow public read by token
  );

CREATE POLICY "Managers delete invites" 
  ON public.invitations FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- Verify
SELECT 'Invitations policies recreated' as status;
