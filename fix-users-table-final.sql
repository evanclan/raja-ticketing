-- Final fix for users table - handles all edge cases
-- This version checks everything and handles existing objects gracefully

-- Step 1: Create the function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 2: Create users table only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        CREATE TABLE users (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255),
            role VARCHAR(50) DEFAULT 'user',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable Row Level Security
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Created users table successfully';
    ELSE
        RAISE NOTICE 'Users table already exists, skipping creation';
    END IF;
END
$$;

-- Step 3: Drop and recreate policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR ALL USING (auth.role() = 'authenticated');

-- Step 4: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Step 5: Drop and recreate trigger to avoid conflicts
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Create user signup handler function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Drop and recreate auth trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 8: Migrate existing users (safe with ON CONFLICT)
INSERT INTO public.users (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  COALESCE(au.raw_user_meta_data->>'role', 'user') as role
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, users.full_name),
  role = COALESCE(EXCLUDED.role, users.role);

-- Success message
SELECT 'Users table setup completed successfully!' as result;