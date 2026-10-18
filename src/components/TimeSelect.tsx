import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

export function TimeSelect({ value, onChange, id, className }: TimeSelectProps) {
  const [h, m] = value.split(':').map(Number);

  const hourLabel = useMemo(() => {
    return new Date(2000, 0, 1, h, 0).toLocaleTimeString('en-AU', {
      hour: 'numeric',
    });
  }, [h]);

  const minuteLabel = `${String(m).padStart(2, '0')} min`;

  function onHourChange(newH: string) {
    onChange(`${String(Number(newH)).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }

  function onMinuteChange(newM: string) {
    onChange(`${String(h).padStart(2, '0')}:${String(Number(newM)).padStart(2, '0')}`);
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select value={String(h)} onValueChange={onHourChange}>
        <SelectTrigger id={id} className="w-[80px] tabular-nums">
          <SelectValue>{hourLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {HOURS.map((hr) => (
              <SelectItem key={hr} value={String(hr)} className="tabular-nums">
                {new Date(2000, 0, 1, hr, 0).toLocaleTimeString('en-AU', {
                  hour: 'numeric',
                })}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <span className="text-muted-foreground text-sm">:</span>
      <Select value={String(m)} onValueChange={onMinuteChange}>
        <SelectTrigger className="w-[82px] tabular-nums">
          <SelectValue>{minuteLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {MINUTES.map((mn) => (
              <SelectItem key={mn} value={String(mn)} className="tabular-nums">
                {String(mn).padStart(2, '0')} min
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
