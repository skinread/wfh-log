// Ported unchanged from the desktop app (renderer/lib/time.ts), plus an explicit locale.
// All dates are local "yyyy-MM-dd" strings; all times are 24h "HH:mm".

export const LOCALE = "en-AU";

export interface WorkEntry {
  date: string;
  start: string;
  finish: string;
  breakMinutes: number;
  notes: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function workedMinutes(e: Pick<WorkEntry, "start" | "finish" | "breakMinutes">): number {
  return toMinutes(e.finish) - toMinutes(e.start) - e.breakMinutes;
}

/** 45m · 7h · 7h 15m */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** No break · 45 min · 1 hr · 1 hr 30 min */
export function formatBreak(minutes: number): string {
  if (minutes === 0) return "No break";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** "09:00" → "9:00 am" */
export function formatClock(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Friday 16 October 2026 */
export function formatLongDate(key: string): string {
  return fromDateKey(key).toLocaleDateString(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Fri 16 Oct */
export function formatShortDate(key: string): string {
  return fromDateKey(key).toLocaleDateString(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** "2026-10" → October 2026 */
export function formatMonth(monthKey: string): string {
  return fromDateKey(`${monthKey}-01`).toLocaleDateString(LOCALE, {
    month: "long",
    year: "numeric",
  });
}

/** Australian financial year (1 July – 30 June) containing the given date. */
export function financialYear(key: string): { start: string; end: string; label: string } {
  const d = fromDateKey(key);
  const startYear = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return {
    start: `${startYear}-07-01`,
    end: `${startYear + 1}-06-30`,
    label: `FY ${startYear}–${String(startYear + 1).slice(2)}`,
  };
}

export function sumMinutes(entries: WorkEntry[]): number {
  return entries.reduce((total, e) => total + workedMinutes(e), 0);
}

export function plural(n: number, word = "day"): string {
  return `${n} ${n === 1 ? word : `${word}s`}`;
}

// ---- Calendar helpers (from components/month-calendar.tsx) ----

export const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function shiftMonth(monthKey: string, delta: number): string {
  const d = fromDateKey(`${monthKey}-01`);
  d.setMonth(d.getMonth() + delta);
  return toDateKey(d).slice(0, 7);
}

/** Always 6 weeks, Monday first, so the grid never changes height. */
export function buildMonthGrid(
  monthKey: string,
): Array<{ key: string; day: number; inMonth: boolean }> {
  const first = fromDateKey(`${monthKey}-01`);
  const offset = (first.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(first.getFullYear(), first.getMonth(), 1 - offset + i);
    cells.push({ key: toDateKey(d), day: d.getDate(), inMonth: d.getMonth() === first.getMonth() });
  }
  return cells;
}
