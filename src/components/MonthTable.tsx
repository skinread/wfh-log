import { useMemo } from 'react';
import { type WorkEntry } from '@/lib/entries';
import {
  formatBreak,
  formatClock,
  formatDuration,
  formatMonth,
  formatShortDate,
  plural,
  sumMinutes,
  workedMinutes,
} from '@/lib/time';
import { cn } from '@/lib/utils';

interface MonthTableProps {
  selectedDate: string;
  entries: WorkEntry[];
  onSelectDate: (date: string) => void;
}

export function MonthTable({
  selectedDate,
  entries,
  onSelectDate,
}: MonthTableProps) {
  const monthKey = selectedDate.slice(0, 7);

  const monthEntries = useMemo(
    () =>
      entries
        .filter((e) => e.date.startsWith(monthKey))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [entries, monthKey],
  );

  const monthLabel = formatMonth(monthKey);
  const days = monthEntries.length;
  const hours = sumMinutes(monthEntries);

  return (
    <div className="mx-auto max-w-[672px] px-6 pb-12">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-base font-semibold">{monthLabel}</h3>
        {days > 0 && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {plural(days)} · {formatDuration(hours)}
          </span>
        )}
      </div>

      {monthEntries.length === 0 ? (
        <div className="rounded-lg bg-muted/50 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">No days logged this month</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left font-medium px-3 py-2 text-muted-foreground">
                  Date
                </th>
                <th className="text-left font-medium px-3 py-2 text-muted-foreground">
                  Started
                </th>
                <th className="text-left font-medium px-3 py-2 text-muted-foreground">
                  Finished
                </th>
                <th className="text-left font-medium px-3 py-2 text-muted-foreground">
                  Break
                </th>
                <th className="text-right font-medium px-3 py-2 text-muted-foreground">
                  Hours
                </th>
              </tr>
            </thead>
            <tbody>
              {monthEntries.map((e) => {
                const isSelected = e.date === selectedDate;
                return (
                  <tr
                    key={e.date}
                    onClick={() => onSelectDate(e.date)}
                    aria-selected={isSelected}
                    className={cn(
                      'cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/40',
                      isSelected && 'bg-accent/30',
                    )}
                  >
                    <td
                      className={cn(
                        'px-3 py-2 tabular-nums',
                        isSelected && 'text-accent-blue font-medium',
                      )}
                    >
                      {formatShortDate(e.date)}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatClock(e.start)}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatClock(e.finish)}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2 tabular-nums',
                        e.breakMinutes === 0 && 'text-muted-foreground',
                      )}
                    >
                      {e.breakMinutes > 0 ? formatBreak(e.breakMinutes) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {formatDuration(workedMinutes(e))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
