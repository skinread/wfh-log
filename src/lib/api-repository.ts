import { fetch, FetchError } from 'void/client';
import { normalizeEntry, validationError, type EntriesRepository, type WorkEntry } from './entries';

/** Surfaces the server's `{ error }` message instead of a bare status code. */
async function call<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof FetchError) {
      const message = (e.data as { error?: unknown } | undefined)?.error;
      throw new Error(typeof message === 'string' ? message : `Request failed (${e.status})`);
    }
    throw e;
  }
}

export function createApiRepository(): EntriesRepository {
  return {
    async list() {
      return call(() => fetch('/api/entries')) as Promise<WorkEntry[]>;
    },

    async save(input) {
      const entry = normalizeEntry(input);
      if (!entry) throw new Error('Invalid entry: expected a date, start, finish and break.');
      const problem = validationError(entry);
      if (problem) throw new Error(problem);
      return call(() =>
        fetch('/api/entries/:date', { method: 'PUT', params: { date: entry.date }, body: { ...entry } }),
      ) as Promise<WorkEntry>;
    },

    async delete(date) {
      await call(() => fetch('/api/entries/:date', { method: 'DELETE', params: { date } }));
    },

    async importEntries(imported) {
      const { total } = (await call(() =>
        fetch('/api/entries', { method: 'POST', body: { entries: imported } }),
      )) as { total: number };
      return total;
    },
  };
}
