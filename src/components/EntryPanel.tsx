import { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { TimeSelect } from './TimeSelect';
import {
  type WorkEntry,
  defaultsFor,
  breakSliderMax,
  formError,
  DEFAULT_BREAK_MINUTES,
  MINUTE_STEP,
} from '@/lib/entries';
import {
  formatClock,
  formatBreak,
  formatDuration,
  workedMinutes,
  toMinutes,
} from '@/lib/time';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EntryPanelProps {
  selectedDate: string;
  entry: WorkEntry | undefined;
  entries: WorkEntry[];
  loading: boolean;
  loadError: string | null;
  onSave: (entry: WorkEntry) => Promise<WorkEntry>;
  onDelete: (date: string) => Promise<void>;
}

interface FormState {
  start: string;
  finish: string;
  breakMinutes: number;
  notes: string;
}

export function EntryPanel({
  selectedDate,
  entry,
  entries,
  loading,
  loadError,
  onSave,
  onDelete,
}: EntryPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FormState>({
    start: '09:00',
    finish: '17:00',
    breakMinutes: DEFAULT_BREAK_MINUTES,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const hasEntry = !!entry;
  const entryKey = `${selectedDate}|${JSON.stringify(entry)}`;
  const prevKey = useRef(entryKey);

  // Reset the panel whenever selected date or stored entry changes
  useEffect(() => {
    if (prevKey.current !== entryKey) {
      prevKey.current = entryKey;
      setIsEditing(false);

      if (!entry) {
        const defaults = defaultsFor(entries, selectedDate);
        setForm({
          start: defaults.start,
          finish: defaults.finish,
          breakMinutes: DEFAULT_BREAK_MINUTES,
          notes: '',
        });
      } else {
        setForm({
          start: entry.start,
          finish: entry.finish,
          breakMinutes: entry.breakMinutes,
          notes: entry.notes,
        });
      }
    }
  }, [entryKey, entry, entries, selectedDate]);

  // New days open straight into the form
  useEffect(() => {
    if (!loading && !loadError && !hasEntry) {
      setIsEditing(true);
    }
  }, [loading, loadError, hasEntry, selectedDate]);

  const error = useMemo(
    () => formError(form.start, form.finish, form.breakMinutes),
    [form.start, form.finish, form.breakMinutes],
  );

  const worked = useMemo(() => {
    if (error) return null;
    const span = toMinutes(form.finish) - toMinutes(form.start);
    return span - form.breakMinutes;
  }, [error, form.start, form.finish, form.breakMinutes]);

  // Dirty check
  const isDirty = useMemo(() => {
    if (!hasEntry) {
      const defaults = defaultsFor(entries, selectedDate);
      const initial: FormState = {
        start: defaults.start,
        finish: defaults.finish,
        breakMinutes: DEFAULT_BREAK_MINUTES,
        notes: '',
      };
      return (
        form.start !== initial.start ||
        form.finish !== initial.finish ||
        form.breakMinutes !== initial.breakMinutes ||
        form.notes.trim() !== initial.notes
      );
    }
    return (
      form.start !== entry!.start ||
      form.finish !== entry!.finish ||
      form.breakMinutes !== entry!.breakMinutes ||
      form.notes.trim() !== entry!.notes
    );
  }, [form, hasEntry, entry, entries, selectedDate]);

  const canSave = !error && (hasEntry ? isDirty : true) && !saving;

  const breakMax = useMemo(
    () => (entry ? breakSliderMax(entry.breakMinutes) : 150),
    [entry],
  );

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        date: selectedDate,
        start: form.start,
        finish: form.finish,
        breakMinutes: form.breakMinutes,
        notes: form.notes.trim(),
      });
      toast.success(hasEntry ? 'Entry updated' : 'Day logged');
      setIsEditing(false);
    } catch (e) {
      toast.error("Couldn't save entry", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await onDelete(selectedDate);
      toast.success('Entry removed');
      setIsEditing(false);
    } catch (e) {
      toast.error("Couldn't remove entry", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  }

  function handleCancel() {
    if (entry) {
      setForm({
        start: entry.start,
        finish: entry.finish,
        breakMinutes: entry.breakMinutes,
        notes: entry.notes,
      });
    } else {
      const defaults = defaultsFor(entries, selectedDate);
      setForm({
        start: defaults.start,
        finish: defaults.finish,
        breakMinutes: DEFAULT_BREAK_MINUTES,
        notes: '',
      });
    }
    setIsEditing(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[672px] px-6 py-8">
        <div className="h-[288px] rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-[672px] px-6 py-8">
        <p className="text-sm text-destructive">
          Couldn't load entries: {loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[672px] px-6 py-6">
      <EntryPanelInner
        key={entryKey}
        hasEntry={hasEntry}
        isEditing={isEditing}
        form={form}
        setForm={setForm}
        worked={worked}
        error={error}
        canSave={canSave}
        saving={saving}
        entry={entry}
        breakMax={breakMax}
        onSave={handleSave}
        onDelete={handleDelete}
        onCancel={handleCancel}
        onEdit={() => setIsEditing(true)}
      />
    </div>
  );
}

interface InnerProps {
  hasEntry: boolean;
  isEditing: boolean;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  worked: number | null;
  error: string | null;
  canSave: boolean;
  saving: boolean;
  entry: WorkEntry | undefined;
  breakMax: number;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onEdit: () => void;
}

function EntryPanelInner({
  hasEntry,
  isEditing,
  form,
  setForm,
  worked,
  error,
  canSave,
  saving,
  entry,
  breakMax,
  onSave,
  onDelete,
  onCancel,
  onEdit,
}: InnerProps) {
  if (hasEntry && !isEditing) {
    return <ReadOnlyView entry={entry!} onEdit={onEdit} onDelete={onDelete} />;
  }

  return (
    <FormView
      hasEntry={hasEntry}
      isEditing={isEditing}
      form={form}
      setForm={setForm}
      worked={worked}
      error={error}
      canSave={canSave}
      saving={saving}
      breakMax={breakMax}
      onSave={onSave}
      onDelete={onDelete}
      onCancel={onCancel}
    />
  );
}

function ReadOnlyView({
  entry,
  onEdit,
  onDelete,
}: {
  entry: WorkEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Worked from home</h2>
      <div className="space-y-3">
        <Row label="Started" value={formatClock(entry.start)} />
        <Row label="Finished" value={formatClock(entry.finish)} />
        <Row
          label="Break"
          value={formatBreak(entry.breakMinutes)}
          muted={entry.breakMinutes === 0}
        />
        <Row
          label="Notes"
          value={entry.notes || '—'}
          muted={!entry.notes}
          truncate
        />
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Hours worked</span>
            <span className="text-2xl font-bold tabular-nums">
              {formatDuration(workedMinutes(entry))}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-6">
        <Button variant="secondary" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Remove Entry
        </Button>
        <Button
          onClick={onEdit}
          className="bg-accent-blue hover:bg-accent-blue/90 text-white"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>
    </div>
  );
}

interface FormViewProps {
  hasEntry: boolean;
  isEditing: boolean;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  worked: number | null;
  error: string | null;
  canSave: boolean;
  saving: boolean;
  breakMax: number;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

function FormView({
  hasEntry,
  isEditing,
  form,
  setForm,
  worked,
  error,
  canSave,
  saving,
  breakMax,
  onSave,
  onDelete,
  onCancel,
}: FormViewProps) {
  const breakSteps = Math.floor(breakMax / MINUTE_STEP);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">
        {hasEntry ? 'Edit entry' : 'Add time worked from home'}
      </h2>
      {!isEditing && (
        <p className="text-sm text-muted-foreground mb-4">
          Times step in 15-minute increments. Use ↑ ↓ or the arrows.
        </p>
      )}

      <div className="space-y-4 mt-4">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="start" className="text-sm font-medium">
            Started
          </label>
          <TimeSelect
            id="start"
            value={form.start}
            onChange={(v) => setForm((f) => ({ ...f, start: v }))}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <label htmlFor="finish" className="text-sm font-medium">
            Finished
          </label>
          <TimeSelect
            id="finish"
            value={form.finish}
            onChange={(v) => setForm((f) => ({ ...f, finish: v }))}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Break</label>
            <span className="text-sm tabular-nums text-muted-foreground">
              {formatBreak(form.breakMinutes)}
            </span>
          </div>
          <div className="relative pt-1 pb-2">
            <Slider
              value={[form.breakMinutes]}
              min={0}
              max={breakMax}
              step={MINUTE_STEP}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, breakMinutes: v[0] }))
              }
              className="w-full"
            />
            <div className="absolute left-0 right-0 flex justify-between pointer-events-none mt-1">
              {Array.from({ length: breakSteps + 1 }, (_, i) => (
                <div key={i} className="w-px h-1 bg-border" />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes
          </label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional"
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Hours worked</span>
            {worked !== null ? (
              <span className="text-2xl font-bold tabular-nums">
                {formatDuration(worked)}
              </span>
            ) : (
              <span className="text-sm text-destructive">{error}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-6">
        {!hasEntry ? (
          <Button
            onClick={onSave}
            disabled={!canSave}
            className="ml-auto bg-accent-blue hover:bg-accent-blue/90 text-white"
          >
            Add Time
          </Button>
        ) : isEditing ? (
          <>
            <Button variant="secondary" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Entry
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={!canSave}
              className="ml-auto bg-accent-blue hover:bg-accent-blue/90 text-white"
            >
              Save Changes
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  truncate,
}: {
  label: string;
  value: string;
  muted?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-sm tabular-nums',
          muted && 'text-muted-foreground',
          truncate && 'truncate ml-4 max-w-[60%] text-right',
        )}
      >
        {value}
      </span>
    </div>
  );
}
