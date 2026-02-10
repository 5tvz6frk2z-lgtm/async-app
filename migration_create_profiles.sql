-- Migration to ensure all existing users have profile entries
-- Run this in the Supabase SQL Editor

-- Create profiles for existing users who don't have one
-- Uses their email as the name initially
INSERT INTO public.profiles (id, name, email)
SELECT 
    id,
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) as name,
    email
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Update existing profiles that have NULL names with email prefix
UPDATE public.profiles 
SET name = COALESCE(
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE auth.users.id = profiles.id),
    split_part(email, '@', 1)
)
WHERE name IS NULL;

-- Update test accounts with proper names
UPDATE public.profiles SET name = 'Test Manager' WHERE email = 'manager@test.com';
UPDATE public.profiles SET name = 'Test Member' WHERE email = 'member@test.com';

-- Verify the results
SELECT id, name, email FROM public.profiles;
