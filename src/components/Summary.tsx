import { type WorkEntry, inRange } from '@/lib/entries';
import { financialYear, formatDuration, formatMonth, plural, sumMinutes } from '@/lib/time';
import { useMemo } from 'react';

interface SummaryProps {
  entries: WorkEntry[];
  selectedDate: string;
  today: string;
}

interface FyBucket {
  start: string;
  end: string;
  label: string;
  days: number;
  minutes: number;
}

export function Summary({ entries, selectedDate, today }: SummaryProps) {
  const monthKey = selectedDate.slice(0, 7);

  const monthEntries = useMemo(
    () => entries.filter((e) => e.date.startsWith(monthKey)),
    [entries, monthKey],
  );

  const currentFy = financialYear(selectedDate);
  const fyToDateEnd = today < currentFy.end ? today : currentFy.end;
  const fyEntries = useMemo(
    () => inRange(entries, currentFy.start, fyToDateEnd),
    [entries, currentFy.start, fyToDateEnd],
  );

  const previousFys = useMemo<FyBucket[]>(() => {
    const buckets = new Map<string, { start: string; end: string; label: string; dates: string[] }>();
    for (const e of entries) {
      const fy = financialYear(e.date);
      if (fy.start === currentFy.start) continue;
      let bucket = buckets.get(fy.label);
      if (!bucket) {
        bucket = { ...fy, dates: [] };
        buckets.set(fy.label, bucket);
      }
      bucket.dates.push(e.date);
    }
    return [...buckets.values()]
      .map((b) => ({
        start: b.start,
        end: b.end,
        label: b.label,
        days: b.dates.length,
        minutes: sumMinutes(entries.filter((e) => b.dates.includes(e.date))),
      }))
      .sort((a, b) => (a.start < b.start ? 1 : -1));
  }, [entries, currentFy.start]);

  return (
    <div className="space-y-3 px-1">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Summary
      </h3>
      <SummaryRow
        title={formatMonth(monthKey)}
        subtitle={plural(monthEntries.length)}
        hours={formatDuration(sumMinutes(monthEntries))}
      />
      <SummaryRow
        title={`${currentFy.label} to date`}
        subtitle={plural(fyEntries.length)}
        hours={formatDuration(sumMinutes(fyEntries))}
      />
      {previousFys.length > 0 && <div className="h-px bg-border" />}
      {previousFys.map((fy) => (
        <SummaryRow
          key={fy.start}
          title={fy.label}
          subtitle={plural(fy.days)}
          hours={formatDuration(fy.minutes)}
        />
      ))}
    </div>
  );
}

function SummaryRow({
  title,
  subtitle,
  hours,
}: {
  title: string;
  subtitle: string;
  hours: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <div className="text-sm font-medium tabular-nums text-muted-foreground">
        {hours}
      </div>
    </div>
  );
}
