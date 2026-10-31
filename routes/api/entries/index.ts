import { workEntries } from '@schema';
import { defineHandler } from 'void';
import { requireAuth } from 'void/auth';
import { asc, count, db, eq } from 'void/db';
import type { WorkEntry } from '../../../src/lib/entries';
import { checkEntry, entryColumns, onConflictReplace, toRow } from './_shared';

// D1 allows 100 bound parameters per statement; each row binds 6.
const ROWS_PER_INSERT = 15;

/** GET /api/entries: the signed-in user's entries, oldest first. */
export const GET = defineHandler(async (c) => {
  const user = requireAuth(c);
  return db
    .select(entryColumns)
    .from(workEntries)
    .where(eq(workEntries.userId, user.id))
    .orderBy(asc(workEntries.date));
});

/** POST /api/entries: bulk import. Imported entries replace same-date entries. */
export const POST = defineHandler(async (c) => {
  const user = requireAuth(c);
  const body = (await c.req.json().catch(() => null)) as { entries?: unknown } | null;
  if (!body || !Array.isArray(body.entries)) {
    return c.json({ error: 'Expected { entries: [...] }' }, 400);
  }

  const entries: WorkEntry[] = [];
  for (const [i, raw] of body.entries.entries()) {
    const result = checkEntry(raw);
    if ('error' in result) return c.json({ error: `Entry ${i + 1}: ${result.error}` }, 400);
    entries.push(result.entry);
  }

  // Last one wins for duplicate dates, matching the CSV import rule.
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const rows = [...byDate.values()].map((e) => toRow(user.id, e));
  const statements = [];
  for (let i = 0; i < rows.length; i += ROWS_PER_INSERT) {
    statements.push(
      db
        .insert(workEntries)
        .values(rows.slice(i, i + ROWS_PER_INSERT))
        .onConflictDoUpdate(onConflictReplace),
    );
  }
  if (statements.length > 0) {
    await db.batch(statements as [(typeof statements)[number], ...typeof statements]);
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(workEntries)
    .where(eq(workEntries.userId, user.id));
  return { total };
});
