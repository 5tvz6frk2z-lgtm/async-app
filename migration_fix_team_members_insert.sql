-- Fix team_members INSERT policy to allow invited users to join
-- The issue: users accepting invites can't insert themselves into team_members

DROP POLICY IF EXISTS "Users can insert themselves as team members" ON team_members;

CREATE POLICY "Users can insert themselves as team members"
ON team_members FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);
