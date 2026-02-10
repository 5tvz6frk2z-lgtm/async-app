-- Add settings column to teams table
-- Run this in Supabase SQL Editor

ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

-- Verify
SELECT 'settings column added to teams' as status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teams';
