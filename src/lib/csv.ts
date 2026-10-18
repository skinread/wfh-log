// Ported from the desktop backend (main/services/entries-store.ts, CSV section).
// Pure string-in/string-out — no file system. Parsing rules are unchanged.

import { toMinutes, type WorkEntry } from "./time";
import { isRealDate, validationError } from "./entries";

const BOM = "﻿";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const CSV_ACCEPT = ".csv,.txt,.tsv";

// ---------- Export ----------

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Entries must already be filtered to the export range and sorted. */
export function entriesToCsv(entries: WorkEntry[]): string {
  const rows = [["Date", "Day", "Start", "Finish", "Break (minutes)", "Hours", "Notes"]];
  for (const e of entries) {
    const [y, m, d] = e.date.split("-").map(Number);
    const worked = toMinutes(e.finish) - toMinutes(e.start) - e.breakMinutes;
    rows.push([
      e.date,
      WEEKDAYS[new Date(y, m - 1, d).getDay()],
      e.start,
      e.finish,
      String(e.breakMinutes),
      (worked / 60).toFixed(2),
      e.notes,
    ]);
  }
  return BOM + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** "FY 2026–27" → "Work From Home Hours - FY 2026-27.csv" */
export function exportFileName(label: string): string {
  return `Work From Home Hours - ${label.replace("–", "-")}.csv`;
}

export function downloadCsv(text: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Import ----------

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const counts: Array<[string, number]> = [",", ";", "\t"].map((d) => [
    d,
    firstLine.split(d).length - 1,
  ]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

export function parseCsv(text: string): string[][] {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** yyyy-M-d (any of - / .) or day-first D/M/YYYY or D/M/YY. */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  let match = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) {
    const date = `${match[1]}-${pad(Number(match[2]))}-${pad(Number(match[3]))}`;
    return isRealDate(date) ? date : null;
  }
  // Day-first (Australian) format: D/M/YYYY
  match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (match) {
    const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
    const date = `${year}-${pad(Number(match[2]))}-${pad(Number(match[1]))}`;
    return isRealDate(date) ? date : null;
  }
  return null;
}

/** 24h ("9:00", "09.30", "17:45:00") or 12h ("9am", "9:30 pm", "930pm", "9:30 p.m."). */
export function parseTime(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "");
  const twelve = s.match(/^(\d{1,2})(?::?(\d{2}))?(?::\d{2})?([ap])\.?m?\.?$/);
  if (twelve) {
    let h = Number(twelve[1]);
    const m = Number(twelve[2] ?? "0");
    if (h < 1 || h > 12 || m > 59) return null;
    if (twelve[3] === "p" && h !== 12) h += 12;
    if (twelve[3] === "a" && h === 12) h = 0;
    return `${pad(h)}:${pad(m)}`;
  }
  const day = s.match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?$/);
  if (day) {
    const h = Number(day[1]);
    const m = Number(day[2]);
    if (h > 23 || m > 59) return null;
    return `${pad(h)}:${pad(m)}`;
  }
  return null;
}

/** "" / "none" → 0, "1:30" → 90, "45", "45 min" → 45. Unparseable → null (row skipped). */
export function parseBreak(raw: string | undefined): number | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "" || s === "none") return 0;
  const hm = s.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const num = s.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minutes)?$/);
  if (num) return Math.round(Number(num[1]));
  return null;
}

/** Parse CSV text into valid entries (deduped by date, last wins) plus a skipped-row count. */
export function parseEntriesCsv(input: string): { entries: WorkEntry[]; skipped: number } {
  const rows = parseCsv(input.replace(BOM, ""));
  if (rows.length === 0) return { entries: [], skipped: 0 };

  const header = rows[0].map((c) => c.trim().toLowerCase());
  const find = (...keys: string[]) => header.findIndex((h) => keys.some((k) => h.includes(k)));
  let cols = { date: 0, start: 1, finish: 2, brk: 3, notes: 4 };
  let dataRows = rows;
  const dateIdx = find("date");
  const startIdx = find("start", "from", "begin");
  const finishIdx = find("finish", "end", "until");
  if (dateIdx >= 0 && startIdx >= 0 && finishIdx >= 0) {
    cols = { date: dateIdx, start: startIdx, finish: finishIdx, brk: find("break"), notes: find("note") };
    dataRows = rows.slice(1);
  } else if (!parseDate(rows[0][0] ?? "")) {
    dataRows = rows.slice(1);
  }

  const imported = new Map<string, WorkEntry>();
  let skipped = 0;
  for (const row of dataRows) {
    const date = parseDate(row[cols.date] ?? "");
    const start = parseTime(row[cols.start] ?? "");
    const finish = parseTime(row[cols.finish] ?? "");
    const breakMinutes = cols.brk >= 0 ? parseBreak(row[cols.brk]) : 0;
    if (!date || !start || !finish || breakMinutes === null) {
      skipped++;
      continue;
    }
    const entry: WorkEntry = {
      date,
      start,
      finish,
      breakMinutes,
      notes: cols.notes >= 0 ? (row[cols.notes] ?? "").trim() : "",
    };
    if (validationError(entry)) {
      skipped++;
      continue;
    }
    imported.set(date, entry);
  }
  return { entries: [...imported.values()], skipped };
}
