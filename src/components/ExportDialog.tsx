import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { type WorkEntry, inRange } from '@/lib/entries';
import {
  financialYear,
  formatDuration,
  formatMonth,
  plural,
  sumMinutes,
} from '@/lib/time';
import { entriesToCsv, downloadCsv, exportFileName } from '@/lib/csv';
import { toast } from 'sonner';

type PeriodType = 'month' | 'fy' | 'all';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: WorkEntry[];
  selectedDate: string;
}

function monthEndKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${monthKey}-${String(lastDay).padStart(2, '0')}`;
}

export function ExportDialog({
  open,
  onOpenChange,
  entries,
  selectedDate,
}: ExportDialogProps) {
  const selectedMonthKey = selectedDate.slice(0, 7);
  const selectedFY = financialYear(selectedDate);

  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedValue, setSelectedValue] = useState<string>('');

  // Reset every time dialog opens, seeded from selected date
  useEffect(() => {
    if (open) {
      setPeriodType('month');
      setSelectedValue(selectedMonthKey);
    }
  }, [open, selectedMonthKey]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) set.add(e.date.slice(0, 7));
    set.add(selectedMonthKey);
    return Array.from(set).sort().reverse();
  }, [entries, selectedMonthKey]);

  const fyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      set.add(financialYear(e.date).start);
    }
    set.add(selectedFY.start);
    return Array.from(set).sort().reverse();
  }, [entries, selectedFY.start]);

  const { filteredEntries, periodLabel } = useMemo(() => {
    if (periodType === 'all') {
      return { filteredEntries: entries, periodLabel: 'All time' };
    }
    if (periodType === 'month') {
      const mk = selectedValue || selectedMonthKey;
      const filtered = entries.filter((e) => e.date.startsWith(mk));
      return { filteredEntries: filtered, periodLabel: formatMonth(mk) };
    }
    const fyStart = selectedValue || selectedFY.start;
    const fy = financialYear(`${fyStart.slice(0, 4)}-01-01`);
    // Use the FY start directly
    const fyObj = {
      start: fyStart,
      end: `${Number(fyStart.slice(0, 4)) + 1}-06-30`,
      label: `FY ${fyStart.slice(0, 4)}–${String(Number(fyStart.slice(0, 4)) + 1).slice(2)}`,
    };
    const filtered = inRange(entries, fyObj.start, fyObj.end);
    return { filteredEntries: filtered, periodLabel: fyObj.label };
  }, [periodType, selectedValue, entries, selectedMonthKey, selectedFY.start]);

  const dayCount = filteredEntries.length;
  const hourCount = sumMinutes(filteredEntries);
  const hasDays = dayCount > 0;

  function handleExport() {
    if (!hasDays) return;

    let from: string | undefined;
    let to: string | undefined;

    if (periodType === 'month') {
      const mk = selectedValue || selectedMonthKey;
      from = `${mk}-01`;
      to = monthEndKey(mk);
    } else if (periodType === 'fy') {
      const fyStart = selectedValue || selectedFY.start;
      from = fyStart;
      to = `${Number(fyStart.slice(0, 4)) + 1}-06-30`;
    }

    const filtered = inRange(entries, from, to).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const csv = entriesToCsv(filtered);
    const filename = exportFileName(periodLabel);
    downloadCsv(csv, filename);
    toast.success(`Exported ${plural(filtered.length)}`, {
      description: periodLabel,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Work Hours</DialogTitle>
          <DialogDescription>
            Choose the period to include in the CSV file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <ToggleGroup
            type="single"
            value={periodType}
            onValueChange={(v) => v && setPeriodType(v as PeriodType)}
            className="grid grid-cols-3 w-full rounded-md border p-1 bg-muted/30"
          >
            <ToggleGroupItem
              value="month"
              className="flex-1 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-sm text-sm"
            >
              Month
            </ToggleGroupItem>
            <ToggleGroupItem
              value="fy"
              className="flex-1 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-sm text-sm"
            >
              Financial year
            </ToggleGroupItem>
            <ToggleGroupItem
              value="all"
              className="flex-1 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-sm text-sm"
            >
              All time
            </ToggleGroupItem>
          </ToggleGroup>

          {periodType === 'month' && (
            <Select
              value={selectedValue || selectedMonthKey}
              onValueChange={setSelectedValue}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((mk) => (
                  <SelectItem key={mk} value={mk} className="tabular-nums">
                    {formatMonth(mk)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {periodType === 'fy' && (
            <Select
              value={selectedValue || selectedFY.start}
              onValueChange={setSelectedValue}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fyOptions.map((fyStart) => {
                  const label = `FY ${fyStart.slice(0, 4)}–${String(
                    Number(fyStart.slice(0, 4)) + 1,
                  ).slice(2)}`;
                  return (
                    <SelectItem key={fyStart} value={fyStart}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}

          {periodType === 'all' && (
            <p className="text-sm text-muted-foreground py-1">
              Includes all logged days.
            </p>
          )}

          <div className="text-sm tabular-nums">
            {hasDays ? (
              <span className="text-muted-foreground">
                {plural(dayCount)} · {formatDuration(hourCount)}
              </span>
            ) : (
              <span className="text-destructive">
                No days logged in this period.
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!hasDays}
            className="bg-accent-blue hover:bg-accent-blue/90 text-white"
          >
            Export…
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
