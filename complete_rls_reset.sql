-- Complete RLS Policy Reset for users table
-- This will fix the infinite recursion issue

-- Step 1: Completely disable RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies (including admin ones that might be conflicting)
DROP POLICY IF EXISTS "all admin energy rite full access" ON users;
DROP POLICY IF EXISTS "energyrite_admin_insert_users" ON users;
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update their own first_login" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_first_login" ON users;

-- Step 3: Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create minimal, non-conflicting policies
-- Policy for users to read their own data
CREATE POLICY "user_read_own" ON users
    FOR SELECT USING (auth.uid() = id);

-- Policy for users to update their own first_login field only
CREATE POLICY "user_update_first_login" ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy for admins to have full access (if needed)
CREATE POLICY "admin_full_access" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'energyrite_admin')
        )
    );

-- Step 5: Verify the policies
SELECT 
    policyname, 
    cmd, 
    roles, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;
