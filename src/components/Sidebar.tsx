import { type WorkEntry } from '@/lib/entries';
import { MonthCalendar } from './MonthCalendar';
import { Summary } from './Summary';

interface SidebarProps {
  selectedDate: string;
  today: string;
  entries: WorkEntry[];
  onSelectDate: (date: string) => void;
}

export function Sidebar({
  selectedDate,
  today,
  entries,
  onSelectDate,
}: SidebarProps) {
  const entryDates = new Set(entries.map((e) => e.date));

  return (
    <div className="flex flex-col gap-6 w-full p-4 h-full">
      <MonthCalendar
        selectedDate={selectedDate}
        today={today}
        entryDates={entryDates}
        onSelectDate={onSelectDate}
      />
      <div className="h-px bg-border" />
      <Summary entries={entries} selectedDate={selectedDate} today={today} />
    </div>
  );
}
