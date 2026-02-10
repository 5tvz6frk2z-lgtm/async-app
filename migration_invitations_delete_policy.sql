-- Add delete policy for invitations
-- Run this in Supabase SQL Editor

-- Allow managers to delete invitations for their teams
CREATE POLICY "Managers delete invites"
  ON public.invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = invitations.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'manager'
    )
  );

-- Verify
SELECT 'Delete policy added for invitations' as status;
