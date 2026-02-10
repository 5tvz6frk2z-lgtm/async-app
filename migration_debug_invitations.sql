-- Debug and fix invitations issues
-- Run this in Supabase SQL Editor

-- 1. Check what's in the invitations table
SELECT * FROM public.invitations ORDER BY created_at DESC LIMIT 10;

-- 2. Clean up ALL pending invitations (for testing)
DELETE FROM public.invitations WHERE status = 'pending';

-- 3. Check if there's a unique constraint on email per team
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'invitations' 
  AND tc.constraint_type = 'UNIQUE';

-- 4. Verify RLS policies allow insert
SELECT polname, polcmd, polroles 
FROM pg_policies 
WHERE tablename = 'invitations';
