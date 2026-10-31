import { useCallback, useEffect, useState } from 'react';
import { createApiRepository } from '@/lib/api-repository';
import type { EntriesRepository, WorkEntry } from '@/lib/entries';

export function useEntries(repo?: EntriesRepository) {
  const [repository] = useState<EntriesRepository>(() => repo ?? createApiRepository());
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!repository) return;
    setLoading(true);
    setError(null);
    try {
      const list = await repository.list();
      setEntries(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    if (repository) refresh();
  }, [repository, refresh]);

  const save = useCallback(
    async (entry: WorkEntry) => {
      if (!repository) throw new Error('Database not connected');
      const saved = await repository.save(entry);
      await refresh();
      return saved;
    },
    [repository, refresh],
  );

  const remove = useCallback(
    async (date: string) => {
      if (!repository) throw new Error('Database not connected');
      await repository.delete(date);
      await refresh();
    },
    [repository, refresh],
  );

  const importEntries = useCallback(
    async (imported: WorkEntry[]) => {
      if (!repository) throw new Error('Database not connected');
      const total = await repository.importEntries(imported);
      await refresh();
      return total;
    },
    [repository, refresh],
  );

  return { entries, loading, error, refresh, save, remove, importEntries };
}
