/*
# Create work_entries table (single-tenant, no auth)

This table stores work-from-home day logs for the Work Hours app.
It is a single-user app with no sign-in, so the anon-key frontend
reads and writes directly. RLS allows both anon and authenticated
roles full CRUD — the data is intentionally public/shared.

1. New Tables
- `work_entries`
  - `date` (text, primary key) — local calendar date "yyyy-MM-dd",
    one entry per day maximum.
  - `start` (text, not null) — 24h "HH:mm" start time.
  - `finish` (text, not null) — 24h "HH:mm" finish time.
  - `break_minutes` (integer, not null, default 0) — break length.
  - `notes` (text, not null, default '') — optional notes.
  - `created_at` (timestamptz, default now()) — record creation time.
  - `updated_at` (timestamptz, default now()) — last modification time.

2. Security
- Enable RLS on `work_entries`.
- Four policies (SELECT/INSERT/UPDATE/DELETE) for `anon, authenticated`
  because the app has no sign-in screen and operates via the anon key.
- `USING (true)` / `WITH CHECK (true)` is acceptable here because this
  is a single-tenant app with intentionally public data.

3. Indexes
- Primary key on `date` (unique constraint, one entry per day).
*/

CREATE TABLE IF NOT EXISTS work_entries (
  date text PRIMARY KEY,
  start text NOT NULL,
  finish text NOT NULL,
  break_minutes integer NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE work_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_work_entries" ON work_entries;
CREATE POLICY "anon_select_work_entries"
  ON work_entries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_work_entries" ON work_entries;
CREATE POLICY "anon_insert_work_entries"
  ON work_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_work_entries" ON work_entries;
CREATE POLICY "anon_update_work_entries"
  ON work_entries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_work_entries" ON work_entries;
CREATE POLICY "anon_delete_work_entries"
  ON work_entries FOR DELETE
  TO anon, authenticated USING (true);
