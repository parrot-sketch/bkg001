'use client';

import { useState, useMemo } from 'react';
import { format, addDays, addWeeks, isAfter } from 'date-fns';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const FOLLOW_UP_TYPES = [
  { value: 'Follow-up', label: 'Follow-up Consultation' },
  { value: 'Review', label: 'Review / Check-up' },
  { value: 'Procedure', label: 'Procedure / Investigation' },
  { value: 'Other', label: 'Other' },
];

const FOLLOW_UP_DEFAULTS: Record<string, { days: number; duration: string }> = {
  'Follow-up': { days: 14, duration: '20' },
  'Review': { days: 7, duration: '15' },
  'Procedure': { days: 21, duration: '60' },
  'Other': { days: 14, duration: '30' },
};

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const hh = hour.toString().padStart(2, '0');
  const label = format(new Date(`2000-01-01T${hh}:00`), 'h:mm a');
  return { value: `${hh}:00`, label };
});

interface FollowUpSchedulerProps {
  appointmentType?: string;
  defaultDate?: Date;
  defaultTime?: string;
  defaultType?: string;
  onChange: (data: {
    followUpDate?: Date;
    followUpTime?: string;
    followUpType?: string;
  }) => void;
}

export function FollowUpScheduler({
  appointmentType,
  defaultDate,
  defaultTime,
  defaultType,
  onChange,
}: FollowUpSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(defaultDate);
  const [selectedTime, setSelectedTime] = useState(defaultTime || '');
  const [selectedType, setSelectedType] = useState(defaultType || 'Follow-up');

  const recommendation = useMemo(() => {
    const normalized = (appointmentType || '').toLowerCase();
    let type = 'Follow-up';
    if (normalized.includes('initial')) type = 'Follow-up';
    else if (normalized.includes('follow')) type = 'Review';
    else if (normalized.includes('procedure') || normalized.includes('surgery')) type = 'Procedure';
    else if (normalized.includes('routine') || normalized.includes('checkup')) type = 'Review';
    return FOLLOW_UP_DEFAULTS[type] || FOLLOW_UP_DEFAULTS['Follow-up'];
  }, [appointmentType]);

  const suggestedDate = useMemo(() => {
    return addDays(new Date(), recommendation.days);
  }, [recommendation.days]);

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    const defaults = FOLLOW_UP_DEFAULTS[value] || FOLLOW_UP_DEFAULTS['Follow-up'];
    if (!selectedDate) {
      setSelectedDate(addDays(new Date(), defaults.days));
    }
    onChange({
      followUpDate: selectedDate || addDays(new Date(), defaults.days),
      followUpTime: selectedTime || undefined,
      followUpType: value,
    });
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    onChange({
      followUpDate: date,
      followUpTime: selectedTime || undefined,
      followUpType: selectedType,
    });
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    onChange({
      followUpDate: selectedDate,
      followUpTime: time,
      followUpType: selectedType,
    });
  };

  const isDateValid = selectedDate ? isAfter(selectedDate, new Date()) : false;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-[#e7d6bf]/30 flex items-center justify-center border border-[#e7d6bf]">
          <Calendar className="h-4 w-4 text-[#caa26a]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#2c2e4b]">Follow-up Appointment</h3>
          <p className="text-[10px] text-[#2c2e4b]/60">
            Recommended: {recommendation.days} days • {recommendation.duration} min
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-[#2c2e4b]/60">
            Type
          </Label>
          <Select value={selectedType} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-9 rounded-lg border-[#e7d6bf] bg-white text-sm text-[#2c2e4b]">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {FOLLOW_UP_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-wider text-[#2c2e4b]/60">
            Time
          </Label>
          <Select value={selectedTime} onValueChange={handleTimeChange}>
            <SelectTrigger className="h-9 rounded-lg border-[#e7d6bf] bg-white text-sm text-[#2c2e4b]">
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              {TIME_SLOTS.map((time) => (
                <SelectItem key={time.value} value={time.value}>
                  {time.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] font-semibold uppercase tracking-wider text-[#2c2e4b]/60">
          Date
        </Label>
        <div className="rounded-lg border border-[#e7d6bf] bg-white p-3">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={handleDateChange}
            disabled={(date) => isAfter(new Date(), date) || isAfter(addDays(new Date(), 60), date)}
            className="rounded-md"
          />
        </div>
        {selectedDate && !isDateValid && (
          <div className="flex items-center gap-1.5 text-[10px] text-red-600">
            <AlertCircle className="h-3 w-3" />
            Please select a future date
          </div>
        )}
        {selectedDate && isDateValid && (
          <p className="text-[10px] text-[#2c2e4b]/50">
            Suggested: {format(suggestedDate, 'EEE, MMM d, yyyy')}
            {selectedDate.toDateString() === suggestedDate.toDateString() && (
              <span className="text-[#caa26a] font-medium ml-1">(recommended)</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
