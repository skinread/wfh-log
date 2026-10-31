import { sql } from 'void/db';
import { integer, primaryKey, sqliteTable, text } from 'void/schema-d1';

/** One row per user per day. Dates and times are plain local strings ("yyyy-MM-dd", "HH:mm"). */
export const workEntries = sqliteTable(
  'work_entries',
  {
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
    start: text('start').notNull(),
    finish: text('finish').notNull(),
    breakMinutes: integer('break_minutes').notNull().default(0),
    notes: text('notes').notNull().default(''),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })],
);
