
-- Allow users to view invitations sent to their email
-- This enables "Recovery" from the Onboarding page if they lost the link.

DROP POLICY IF EXISTS "Users can view own invitations" ON "public"."invitations";

CREATE POLICY "Users can view own invitations"
ON "public"."invitations"
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  email = (select auth.email())
);
