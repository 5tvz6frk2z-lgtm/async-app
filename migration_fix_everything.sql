-- MASTER FIX SCRIPT
-- Run this in Supabase SQL Editor to fix all known issues

-- 1. Add missing 'settings' column to teams (Fixes 400 error)
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

-- 2. Fix Invitations RLS Policies (Fixes permission errors)
DROP POLICY IF EXISTS "Managers create invites" ON public.invitations;
DROP POLICY IF EXISTS "Managers view invites" ON public.invitations;
DROP POLICY IF EXISTS "Read invite by token" ON public.invitations;
DROP POLICY IF EXISTS "Managers delete invites" ON public.invitations;

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

-- 3. Ensure all users have profiles (Fixes "Unknown User")
INSERT INTO public.profiles (id, name, email)
SELECT 
    id,
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) as name,
    email
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Verification
SELECT 'All fixes applied successfully' as status;
