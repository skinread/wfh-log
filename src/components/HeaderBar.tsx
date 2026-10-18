import { FileDown, FileUp, Monitor, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDuration, formatLongDate, workedMinutes } from '@/lib/time';
import { type WorkEntry } from '@/lib/entries';
import { cn } from '@/lib/utils';

interface HeaderBarProps {
  selectedDate: string;
  entry: WorkEntry | undefined;
  theme: 'auto' | 'light' | 'dark';
  onThemeChange: (t: 'auto' | 'light' | 'dark') => void;
  onImport: () => void;
  onExport: () => void;
}

export function HeaderBar({
  selectedDate,
  entry,
  theme,
  onThemeChange,
  onImport,
  onExport,
}: HeaderBarProps) {
  const subtitle = entry
    ? `${formatDuration(workedMinutes(entry))} worked from home`
    : 'Not logged';

  return (
    <div className="flex items-start justify-between gap-4 px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight truncate">
          {formatLongDate(selectedDate)}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onImport}
              aria-label="Import CSV"
            >
              <FileDown className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import CSV…</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onExport}
              aria-label="Export CSV"
            >
              <FileUp className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export CSV…</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Theme">
              {theme === 'light' ? (
                <Sun className="h-4 w-4" />
              ) : theme === 'dark' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onThemeChange('auto')}>
              <Monitor
                className={cn('mr-2 h-4 w-4', theme === 'auto' && 'text-accent-blue')}
              />
              Auto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onThemeChange('light')}>
              <Sun
                className={cn('mr-2 h-4 w-4', theme === 'light' && 'text-accent-blue')}
              />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onThemeChange('dark')}>
              <Moon
                className={cn('mr-2 h-4 w-4', theme === 'dark' && 'text-accent-blue')}
              />
              Dark
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
