import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildMonthGrid,
  fromDateKey,
  formatMonth,
  shiftMonth,
  WEEKDAY_LABELS,
} from '@/lib/time';
import { cn } from '@/lib/utils';

interface MonthCalendarProps {
  selectedDate: string;
  today: string;
  entryDates: Set<string>;
  onSelectDate: (date: string) => void;
}

export function MonthCalendar({
  selectedDate,
  today,
  entryDates,
  onSelectDate,
}: MonthCalendarProps) {
  const selectedMonthKey = selectedDate.slice(0, 7);
  const [displayMonth, setDisplayMonth] = useState(selectedMonthKey);

  useEffect(() => {
    setDisplayMonth(selectedMonthKey);
  }, [selectedMonthKey]);

  const cells = useMemo(() => buildMonthGrid(displayMonth), [displayMonth]);
  const monthLabel = formatMonth(displayMonth);

  function prevMonth() {
    setDisplayMonth((m) => shiftMonth(m, -1));
  }

  function nextMonth() {
    setDisplayMonth((m) => shiftMonth(m, 1));
  }

  return (
    <div className="select-none">
      <div className="flex items-center gap-1 mb-3">
        <span className="flex-1 min-w-0 truncate text-sm font-semibold tabular-nums">
          {monthLabel}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={prevMonth}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setDisplayMonth(today.slice(0, 7));
              onSelectDate(today);
            }}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={nextMonth}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0 w-full mb-1">
        {WEEKDAY_LABELS.map((d, i) => (
          <div
            key={i}
            className="text-center text-[11px] font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0 w-full">
        {cells.map((cell, i) => {
          const isSelected = cell.key === selectedDate;
          const isToday = cell.key === today;
          const hasEntry = entryDates.has(cell.key);
          const date = fromDateKey(cell.key);
          const ariaLabel = date.toLocaleDateString('en-AU', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          return (
            <button
              key={i}
              onClick={() => onSelectDate(cell.key)}
              aria-label={ariaLabel}
              aria-pressed={isSelected}
              className={cn(
                'relative flex flex-col items-center justify-center w-full rounded-md py-1.5 text-sm transition-colors',
                'hover:bg-accent focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring',
                !cell.inMonth && !isSelected && 'text-muted-foreground/40',
                isToday && !isSelected && 'font-semibold text-accent-blue',
                isSelected &&
                  'bg-accent-blue text-white font-medium hover:bg-accent-blue',
              )}
            >
              <span className="tabular-nums">{cell.day}</span>
              {hasEntry && (
                <span
                  className={cn(
                    'absolute bottom-0.5 h-1 w-1 rounded-full',
                    isSelected ? 'bg-white' : 'bg-green-500',
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
