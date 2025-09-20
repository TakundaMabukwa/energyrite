-- Fix infinite recursion in RLS policies for users table
-- Run this in your Supabase SQL editor

-- First, disable RLS temporarily to clean up policies
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on the users table
DROP POLICY IF EXISTS "Users can update their own first_login" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
DROP POLICY IF EXISTS "Users can delete their own data" ON users;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create a simple, non-recursive policy for updates
CREATE POLICY "Users can update their own first_login" ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Create a policy for reading own data
CREATE POLICY "Users can read their own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- Verify the policies were created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users';

-- Test the policy (optional - replace with actual user ID)
-- UPDATE users SET first_login = false WHERE id = 'your-user-id';
