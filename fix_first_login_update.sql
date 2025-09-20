-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to update their own first_login field
CREATE POLICY "Users can update their own first_login" ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Alternative: If the above doesn't work, try this more permissive policy
-- CREATE POLICY "Users can update their own record" ON users
--     FOR UPDATE USING (auth.uid() = id);

-- If you need to allow users to update any field on their own record:
-- DROP POLICY IF EXISTS "Users can update their own first_login" ON users;
-- CREATE POLICY "Users can update their own record" ON users
--     FOR UPDATE USING (auth.uid() = id)
--     WITH CHECK (auth.uid() = id);
