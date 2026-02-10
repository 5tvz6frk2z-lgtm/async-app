-- Ensure Members can view the teams they belong to
DROP POLICY IF EXISTS "Members can view their own teams" ON teams;

CREATE POLICY "Members can view their own teams"
ON teams FOR SELECT
USING (
  id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
  )
);
