/*
# Make work entries private per user

This migration converts the work_entries table from a public/shared
single-tenant model to a multi-user, owner-scoped model so each signed-in
user can only see and modify their own work log entries.

1. Schema changes
   - Add `user_id uuid NOT NULL DEFAULT auth.uid()` to `work_entries`.
     The DEFAULT fills the owner from the authenticated session so the
     frontend insert (which omits user_id) still satisfies the INSERT
     policy's WITH CHECK.
   - Existing public rows are backfilled with a sentinel UUID
     (00000000-0000-0000-0000-000000000000). Under the new owner-scoped
     RLS these rows are invisible to every authenticated user
     (auth.uid() never equals the sentinel). They remain in the table
     for manual cleanup but are unreachable from the app.
   - Add a foreign key from `user_id` to `auth.users(id)` with ON DELETE
     CASCADE, added as NOT VALID so it only enforces on new rows (the
     sentinel backfill value is not a real auth.users entry).
   - Change the primary key from `date` alone to `(user_id, date)` so
     multiple users can each have an entry for the same day.
   - Add an index on `user_id` for fast per-user filtering.

2. Data safety
   - No rows are deleted. Existing public rows get the sentinel owner
     and become invisible under the new RLS policies.
   - New rows inserted by the frontend get user_id from DEFAULT auth.uid().

3. Security changes (RLS)
   - DROP the old anon-all-access policies.
   - GRANT SELECT, INSERT, UPDATE, DELETE to `authenticated` only.
   - REVOKE all grants from `anon` so the anon key can no longer read or
     write any rows.
   - Create four owner-scoped policies (one per CRUD verb) using
     `auth.uid() = user_id`.

4. Important notes
   - After this migration, the frontend MUST send an authenticated
     session — the anon key returns zero rows from work_entries.
   - The upsert conflict target changes from `date` to `(user_id, date)`.
*/

-- 1. Add user_id column (nullable first)
ALTER TABLE work_entries ADD COLUMN IF NOT EXISTS user_id uuid;

-- 2. Backfill existing rows with a sentinel UUID
UPDATE work_entries
   SET user_id = '00000000-0000-0000-0000-000000000000'
 WHERE user_id IS NULL;

-- 3. Make NOT NULL with DEFAULT auth.uid()
ALTER TABLE work_entries
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 4. Foreign key to auth.users (NOT VALID: only enforces on new rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'work_entries_user_id_fkey'
      AND table_name = 'work_entries'
  ) THEN
    ALTER TABLE work_entries
      ADD CONSTRAINT work_entries_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

-- 5. Change primary key from (date) to (user_id, date)
ALTER TABLE work_entries DROP CONSTRAINT IF EXISTS work_entries_pkey;
ALTER TABLE work_entries ADD PRIMARY KEY (user_id, date);

-- 6. Index for per-user queries
CREATE INDEX IF NOT EXISTS idx_work_entries_user_id ON work_entries (user_id);

-- 7. Security: revoke anon access, grant authenticated CRUD
REVOKE ALL ON work_entries FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON work_entries TO authenticated;

-- 8. Drop old public policies
DROP POLICY IF EXISTS "anon_select_work_entries" ON work_entries;
DROP POLICY IF EXISTS "anon_insert_work_entries" ON work_entries;
DROP POLICY IF EXISTS "anon_update_work_entries" ON work_entries;
DROP POLICY IF EXISTS "anon_delete_work_entries" ON work_entries;

-- 9. Create owner-scoped policies (authenticated only)
DROP POLICY IF EXISTS "select_own_work_entries" ON work_entries;
CREATE POLICY "select_own_work_entries"
  ON work_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_work_entries" ON work_entries;
CREATE POLICY "insert_own_work_entries"
  ON work_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_work_entries" ON work_entries;
CREATE POLICY "update_own_work_entries"
  ON work_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_work_entries" ON work_entries;
CREATE POLICY "delete_own_work_entries"
  ON work_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
