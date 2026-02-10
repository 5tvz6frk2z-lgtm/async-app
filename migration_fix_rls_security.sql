-- Security Fix: Restrict team_members INSERT policy
-- This migration replaces the overly permissive "Join team" policy
-- with one that only allows joins via invitation or manager action.

-- Drop the permissive policy
DROP POLICY IF EXISTS "Join team" ON public.team_members;

-- Create restrictive policy: only allow insert if:
-- 1. User has a valid pending invitation for this team, OR
-- 2. User is a manager of this team (can add members directly)
CREATE POLICY "Join team via invite or manager" ON public.team_members FOR INSERT 
WITH CHECK (
  -- Allow if user has a pending invitation for this team
  EXISTS (
    SELECT 1 FROM public.invitations 
    WHERE invitations.team_id = team_members.team_id 
    AND invitations.status = 'pending'
    AND invitations.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  OR
  -- Allow managers to add members to their own teams
  EXISTS (
    SELECT 1 FROM public.team_members existing
    WHERE existing.team_id = team_members.team_id
    AND existing.user_id = auth.uid()
    AND existing.role = 'manager'
  )
  OR
  -- Allow users to create their own membership when creating a new team
  -- (team creator becomes first manager)
  (
    auth.uid() = team_members.user_id 
    AND team_members.role = 'manager'
    AND NOT EXISTS (
      SELECT 1 FROM public.team_members existing
      WHERE existing.team_id = team_members.team_id
    )
  )
);

-- Success confirmation
SELECT 'RLS Security Migration Complete' as status;
