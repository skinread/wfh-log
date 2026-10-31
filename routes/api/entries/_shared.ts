import { workEntries } from '@schema';
import { sql } from 'void/db';
import { normalizeEntry, validationError, type WorkEntry } from '../../../src/lib/entries';

export const entryColumns = {
  date: workEntries.date,
  start: workEntries.start,
  finish: workEntries.finish,
  breakMinutes: workEntries.breakMinutes,
  notes: workEntries.notes,
};

/** Same rules the browser applies; returns the clean entry or an error message. */
export function checkEntry(raw: unknown): { entry: WorkEntry } | { error: string } {
  const entry = normalizeEntry(raw);
  if (!entry) return { error: 'Invalid entry: expected a date, start, finish and break.' };
  const problem = validationError(entry);
  return problem ? { error: problem } : { entry };
}

/** Insert values for an entry owned by `userId`. */
export function toRow(userId: string, entry: WorkEntry) {
  return { userId, ...entry };
}

/** Upsert target and update set: an entry replaces the same user's entry for that day. */
export const onConflictReplace = {
  target: [workEntries.userId, workEntries.date],
  set: {
    start: sql`excluded.start`,
    finish: sql`excluded.finish`,
    breakMinutes: sql`excluded.break_minutes`,
    notes: sql`excluded.notes`,
    updatedAt: sql`datetime('now')`,
  },
};
