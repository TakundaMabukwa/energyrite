-- Fix RLS policies for first_login updates
-- Run this in your Supabase SQL editor

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can update their own first_login" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;

-- Create a policy to allow users to update their own first_login field
CREATE POLICY "Users can update their own first_login" ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users';
