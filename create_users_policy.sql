-- RLS Policy to allow users to create other users
-- This policy allows admin users to insert new users into the users table

-- Create a policy for INSERT operations on users table
CREATE POLICY "admin_can_create_users" ON users
    FOR INSERT WITH CHECK (
        -- Allow if the current user is an admin
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'energyrite_admin')
        )
    );

-- Alternative: If you want to allow specific roles to create users
-- CREATE POLICY "admin_can_create_users" ON users
--     FOR INSERT WITH CHECK (
--         -- Allow if the current user is an admin or energyrite_admin
--         EXISTS (
--             SELECT 1 FROM users 
--             WHERE id = auth.uid() 
--             AND role IN ('admin', 'energyrite_admin')
--         )
--     );

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
