'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DateTimeSelectionStepProps {
  doctorId: string;
  selectedDate: string;
  selectedSlot: string | null;
  onSelect: (date: string, slot: string | null) => void;
}

export function DateTimeSelectionStep({
  doctorId,
  selectedDate,
  selectedSlot,
  onSelect
}: DateTimeSelectionStepProps) {
  const [dateValue, setDateValue] = useState(selectedDate || '');
  const [timeValue, setTimeValue] = useState(selectedSlot || '');

  useEffect(() => {
    setDateValue(selectedDate || '');
  }, [selectedDate]);

  useEffect(() => {
    setTimeValue(selectedSlot || '');
  }, [selectedSlot]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDateValue(val);
    onSelect(val, timeValue || null);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTimeValue(val);
    if (dateValue) {
      onSelect(dateValue, val || null);
    }
  };

  const formattedDate = dateValue ? format(new Date(dateValue + 'T00:00:00'), 'EEEE, MMMM d, yyyy') : null;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-[#2c2e4b] mb-1">Select Date & Time</h3>
        <p className="text-xs text-[#2c2e4b]/60">Choose a convenient date and time for this appointment request</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#2c2e4b]">Preferred Date *</Label>
          <div className="relative">
            <Input
              type="date"
              value={dateValue}
              onChange={handleDateChange}
              min={format(new Date(), 'yyyy-MM-dd')}
              className={cn(
                'border-[#e7d6bf] text-xs h-11 rounded-lg pl-10',
                'focus-visible:ring-[#caa26a] focus-visible:border-[#caa26a]'
              )}
            />
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#caa26a]/60 pointer-events-none" />
          </div>
          {formattedDate && (
            <p className="text-xs font-medium text-[#caa26a]">{formattedDate}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[#2c2e4b]">Preferred Time *</Label>
          <div className="relative">
            <Input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className={cn(
                'border-[#e7d6bf] text-xs h-11 rounded-lg pl-10',
                'focus-visible:ring-[#caa26a] focus-visible:border-[#caa26a]'
              )}
            />
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#caa26a]/60 pointer-events-none" />
          </div>
        </div>
      </div>

      {dateValue && timeValue && (
        <div className="rounded-lg border border-[#e7d6bf] bg-[#e7d6bf]/10 px-4 py-3 flex items-start gap-3">
          <div className="mt-0.5">
            <div className="h-5 w-5 rounded-full bg-[#caa26a]/20 flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-[#caa26a]" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#2c2e4b]">Appointment Request</p>
            <p className="text-[11px] text-[#2c2e4b]/60 mt-0.5">
              {formattedDate} at {timeValue} — This request will be sent to the doctor for confirmation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
