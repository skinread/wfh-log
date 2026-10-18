import { useCallback, useEffect, useState } from 'react';
import { isRealDate } from '@/lib/entries';
import { todayKey } from '@/lib/time';

function readDateFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('date');
  if (!raw) return null;
  if (!isRealDate(raw)) return null;
  return raw;
}

export function useSelectedDate(today: string) {
  const [selectedDate, setSelectedDateState] = useState<string>(() => {
    const fromUrl = readDateFromUrl();
    return fromUrl ?? today;
  });

  useEffect(() => {
    if (!readDateFromUrl()) {
      setSelectedDateState(today);
    }
  }, [today]);

  useEffect(() => {
    function onPop() {
      const fromUrl = readDateFromUrl();
      setSelectedDateState(fromUrl ?? todayKey());
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const setSelectedDate = useCallback((date: string) => {
    const params = new URLSearchParams(window.location.search);
    if (date === todayKey()) {
      params.delete('date');
    } else {
      params.set('date', date);
    }
    const qs = params.toString();
    const newUrl = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.pushState({}, '', newUrl);
    setSelectedDateState(date);
  }, []);

  return { selectedDate, setSelectedDate };
}
