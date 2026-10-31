import { workEntries } from '@schema';
import { defineHandler } from 'void';
import { requireAuth } from 'void/auth';
import { and, db, eq } from 'void/db';
import { checkEntry, entryColumns, onConflictReplace, toRow } from './_shared';

/** PUT /api/entries/:date: create or replace the entry for that day. */
export const PUT = defineHandler(async (c) => {
  const user = requireAuth(c);
  const date = c.req.param('date') ?? '';
  const body = await c.req.json().catch(() => null);
  const result = checkEntry({ ...(body ?? {}), date });
  if ('error' in result) return c.json({ error: result.error }, 400);

  const [saved] = await db
    .insert(workEntries)
    .values(toRow(user.id, result.entry))
    .onConflictDoUpdate(onConflictReplace)
    .returning(entryColumns);
  return saved;
});

/** DELETE /api/entries/:date: remove that day's entry (no-op if none). */
export const DELETE = defineHandler(async (c) => {
  const user = requireAuth(c);
  const date = c.req.param('date') ?? '';
  await db
    .delete(workEntries)
    .where(and(eq(workEntries.userId, user.id), eq(workEntries.date, date)));
  return null;
});
