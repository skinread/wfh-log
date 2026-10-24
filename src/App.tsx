import { useCallback, useMemo, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { Sidebar } from '@/components/Sidebar';
import { HeaderBar } from '@/components/HeaderBar';
import { EntryPanel } from '@/components/EntryPanel';
import { MonthTable } from '@/components/MonthTable';
import { ExportDialog } from '@/components/ExportDialog';
import { AuthScreen } from '@/components/AuthScreen';
import { useEntries } from '@/hooks/use-entries';
import { useSelectedDate } from '@/hooks/use-selected-date';
import { useTheme } from '@/hooks/use-theme';
import { useTodayKey } from '@/lib/use-today';
import { useAuth, signIn as authSignIn, signUp as authSignUp } from '@/hooks/use-auth';
import { parseEntriesCsv, CSV_ACCEPT } from '@/lib/csv';
import { toast } from 'sonner';

export default function App() {
  const today = useTodayKey();
  const { selectedDate, setSelectedDate } = useSelectedDate(today);
  const { entries, loading, error, save, remove, importEntries } = useEntries();
  const { theme, setTheme } = useTheme();

  const [exportOpen, setExportOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const entry = useMemo(
    () => entries.find((e) => e.date === selectedDate),
    [entries, selectedDate],
  );

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const result = parseEntriesCsv(text);
        await importEntries(result.entries);
        toast.success(`Imported ${result.entries.length} day(s)`, {
          description:
            result.skipped > 0
              ? `${result.skipped} rows couldn't be read and were skipped.`
              : undefined,
        });
      } catch (err) {
        toast.error('Import failed', {
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        e.target.value = '';
      }
    },
    [importEntries],
  );

  const handleExport = useCallback(() => {
    if (entries.length === 0) {
      toast.error('Nothing to export yet');
      return;
    }
    setExportOpen(true);
  }, [entries.length]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-[280px] shrink-0 border-r bg-background overflow-y-auto">
          <Sidebar
            selectedDate={selectedDate}
            today={today}
            entries={entries}
            onSelectDate={setSelectedDate}
          />
        </aside>

        {/* Mobile sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed top-3 left-3 z-20"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open calendar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile sidebar drawer */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-[280px] p-0 overflow-y-auto">
            <SheetHeader className="sr-only">
              <SheetTitle>Calendar & Summary</SheetTitle>
            </SheetHeader>
            <Sidebar
              selectedDate={selectedDate}
              today={today}
              entries={entries}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setMobileSidebarOpen(false);
              }}
            />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <HeaderBar
            selectedDate={selectedDate}
            entry={entry}
            theme={theme}
            onThemeChange={setTheme}
            onImport={handleImport}
            onExport={handleExport}
          />

          <EntryPanel
            selectedDate={selectedDate}
            entry={entry}
            entries={entries}
            loading={loading}
            loadError={error}
            onSave={save}
            onDelete={remove}
          />

          <div className="border-t" />

          <MonthTable
            selectedDate={selectedDate}
            entries={entries}
            onSelectDate={setSelectedDate}
          />
        </main>

        {/* Export dialog */}
        <ExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          entries={entries}
          selectedDate={selectedDate}
        />

        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept={CSV_ACCEPT}
          className="hidden"
          onChange={handleFileChange}
        />

        <Toaster richColors position="bottom-right" />
      </div>
    </TooltipProvider>
  );
}
