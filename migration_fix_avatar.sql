
-- Fix missing avatar_url column in profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Ensure RLS allows updates to avatar_url for the owner
-- Existing policy "Users can update own profile" should cover this if loop is simple.
-- Let's verify policies just in case.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING ( id = auth.uid() );

-- Grant permissions just in case
GRANT ALL ON public.profiles TO authenticated;
