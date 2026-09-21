-- Safe migration for databases created by an earlier VenueHub build.
-- Run after the current supabase/schema.sql. It renames the old college-specific
-- "department" field without touching user records.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='department'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='organization'
  ) THEN
    ALTER TABLE users RENAME COLUMN department TO organization;
  END IF;
END $$;

-- If the older public.users table was not linked to Supabase Auth, add the link.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_auth_users_fkey'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_auth_users_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
