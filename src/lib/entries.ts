// Ported from the desktop backend (main/services/entries-store.ts) with the Node file
// I/O replaced by a pluggable repository. Rules are unchanged.

import { toMinutes, type WorkEntry } from "./time";

export type { WorkEntry };

export interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_TIMES = { start: "09:00", finish: "17:00" };
/** Breaks always start at 1 hour for a newly logged day. */
export const DEFAULT_BREAK_MINUTES = 60;
export const MAX_BREAK_MINUTES = 150;
export const MINUTE_STEP = 15;

export function isRealDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const parsed = new Date(y, m - 1, d);
  return parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d;
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && DATE_RE.test(value);
}

/** Returns a clean entry, or null if the shape/values are invalid. */
export function normalizeEntry(raw: unknown): WorkEntry | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { date, start, finish, breakMinutes, notes } = raw as Record<string, unknown>;
  if (typeof date !== "string" || !isRealDate(date)) return null;
  if (typeof start !== "string" || !TIME_RE.test(start)) return null;
  if (typeof finish !== "string" || !TIME_RE.test(finish)) return null;
  if (typeof breakMinutes !== "number" || !Number.isFinite(breakMinutes) || breakMinutes < 0) {
    return null;
  }
  return {
    date,
    start,
    finish,
    breakMinutes: Math.round(breakMinutes),
    notes: typeof notes === "string" ? notes : "",
  };
}

export function validationError(entry: WorkEntry): string | null {
  const span = toMinutes(entry.finish) - toMinutes(entry.start);
  if (span <= 0) return "Finish time must be after start time.";
  if (entry.breakMinutes >= span) return "Break must be shorter than the time worked.";
  return null;
}

/** Friendlier wording used live in the edit form. */
export function formError(start: string, finish: string, breakMinutes: number): string | null {
  if (!start || !finish) return "Enter a start and finish time.";
  const span = toMinutes(finish) - toMinutes(start);
  if (span <= 0) return "Finish must be after start.";
  if (span - breakMinutes <= 0) return "Break is longer than the time worked.";
  return null;
}

export function sortEntries(entries: WorkEntry[]): WorkEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

export function upsert(entries: WorkEntry[], input: unknown): { entries: WorkEntry[]; entry: WorkEntry } {
  const entry = normalizeEntry(input);
  if (!entry) throw new Error("Invalid entry: expected a date, start, finish and break.");
  const problem = validationError(entry);
  if (problem) throw new Error(problem);
  return { entries: sortEntries([...entries.filter((e) => e.date !== entry.date), entry]), entry };
}

export function remove(entries: WorkEntry[], date: string): WorkEntry[] {
  return entries.filter((e) => e.date !== date);
}

/** Imported entries replace existing entries with the same date. */
export function merge(existing: WorkEntry[], imported: WorkEntry[]): WorkEntry[] {
  const dates = new Set(imported.map((e) => e.date));
  return sortEntries([...existing.filter((e) => !dates.has(e.date)), ...imported]);
}

export function inRange(entries: WorkEntry[], from?: string, to?: string): WorkEntry[] {
  return entries.filter((e) => (!from || e.date >= from) && (!to || e.date <= to));
}

/**
 * Prefill for a new day: start/finish from the most recent entry before `date`,
 * else the latest entry overall, else 09:00–17:00. Break is NOT copied.
 */
export function defaultsFor(entries: WorkEntry[], date: string): { start: string; finish: string } {
  const previous =
    [...entries].reverse().find((e) => e.date < date) ?? entries[entries.length - 1];
  return previous ? { start: previous.start, finish: previous.finish } : DEFAULT_TIMES;
}

/** Imported breaks can exceed 2.5 hr; extend the slider to fit (rounded up to 15). */
export function breakSliderMax(breakMinutes: number): number {
  return Math.max(MAX_BREAK_MINUTES, Math.ceil(breakMinutes / MINUTE_STEP) * MINUTE_STEP);
}

// ---- Persistence ----

export interface EntriesRepository {
  list(): Promise<WorkEntry[]>;
  save(entry: WorkEntry): Promise<WorkEntry>;
  delete(date: string): Promise<void>;
  /** Replace-by-date merge; returns the merged total. */
  importEntries(imported: WorkEntry[]): Promise<number>;
}

// ---- Supabase repository ----

/** Maps a database row (snake_case) to a WorkEntry (camelCase). */
function rowToEntry(row: {
  date: string;
  start: string;
  finish: string;
  break_minutes: number;
  notes: string;
}): WorkEntry {
  return {
    date: row.date,
    start: row.start,
    finish: row.finish,
    breakMinutes: row.break_minutes,
    notes: row.notes,
  };
}

export async function createSupabaseRepository(): Promise<EntriesRepository> {
  const { supabase } = await import('./supabase-client');

  return {
    async list() {
      const { data, error } = await supabase
        .from('work_entries')
        .select('date, start, finish, break_minutes, notes')
        .order('date', { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []).map(rowToEntry);
    },

    async save(input) {
      const entry = normalizeEntry(input);
      if (!entry) throw new Error('Invalid entry: expected a date, start, finish and break.');
      const problem = validationError(entry);
      if (problem) throw new Error(problem);

      const { data, error } = await supabase
        .from('work_entries')
        .upsert({
          date: entry.date,
          start: entry.start,
          finish: entry.finish,
          break_minutes: entry.breakMinutes,
          notes: entry.notes,
          updated_at: new Date().toISOString(),
        })
        .select('date, start, finish, break_minutes, notes')
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error('Save returned no data');
      return rowToEntry(data);
    },

    async delete(date) {
      const { error } = await supabase.from('work_entries').delete().eq('date', date);
      if (error) throw new Error(error.message);
    },

    async importEntries(imported) {
      const rows = imported.map((e) => ({
        date: e.date,
        start: e.start,
        finish: e.finish,
        break_minutes: e.breakMinutes,
        notes: e.notes,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('work_entries')
        .upsert(rows);

      if (error) throw new Error(error.message);

      const { count, error: countError } = await supabase
        .from('work_entries')
        .select('*', { count: 'exact', head: true });

      if (countError) throw new Error(countError.message);
      return count ?? 0;
    },
  };
}

const STORAGE_KEY = "work-hours:entries:v1";

export function createLocalStorageRepository(storage: Storage = window.localStorage): EntriesRepository {
  const read = (): WorkEntry[] => {
    const text = storage.getItem(STORAGE_KEY);
    if (!text) return [];
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Unexpected data format in saved entries.");
    return sortEntries(parsed.map(normalizeEntry).filter((e): e is WorkEntry => e !== null));
  };
  const write = (entries: WorkEntry[]) => storage.setItem(STORAGE_KEY, JSON.stringify(entries));

  return {
    async list() {
      return read();
    },
    async save(input) {
      const { entries, entry } = upsert(read(), input);
      write(entries);
      return entry;
    },
    async delete(date) {
      write(remove(read(), date));
    },
    async importEntries(imported) {
      const merged = merge(read(), imported);
      write(merged);
      return merged.length;
    },
  };
}
