-- Simple RLS Policy to allow any authenticated user to create other users
-- This policy allows any logged-in user to insert new users into the users table

-- Create a policy for INSERT operations on users table
CREATE POLICY "authenticated_users_can_create_users" ON users
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Verify the policy was created
SELECT 
    policyname, 
    cmd, 
    roles, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND cmd = 'INSERT';
