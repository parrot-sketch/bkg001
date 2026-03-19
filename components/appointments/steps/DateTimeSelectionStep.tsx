'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { doctorApi } from '@/lib/api/doctor';
import { toast } from 'sonner';
import { format, startOfToday } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Loader2, Sun, Sunset, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AvailableSlotResponseDto } from '@/application/dtos/AvailableSlotResponseDto';

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
  const [proposedDate, setProposedDate] = useState<Date | undefined>(
    selectedDate ? new Date(selectedDate) : startOfToday()
  );
  const [availableSlots, setAvailableSlots] = useState<AvailableSlotResponseDto[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (proposedDate && doctorId) {
      loadSlots(proposedDate);
    }
  }, [proposedDate, doctorId]);

  const loadSlots = async (date: Date) => {
    setLoadingSlots(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const res = await doctorApi.getAvailableSlots(doctorId, dateStr);
      if (res.success) {
        setAvailableSlots(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load slots', err);
      toast.error('Failed to load time slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (!date) return;
    setProposedDate(date);
    onSelect(format(date, 'yyyy-MM-dd'), null);
  };

  const categorizedSlots = useMemo(() => {
    const morning: AvailableSlotResponseDto[] = [];
    const afternoon: AvailableSlotResponseDto[] = [];
    const evening: AvailableSlotResponseDto[] = [];

    availableSlots.forEach((slot) => {
      const hour = parseInt(slot.startTime.split(':')[0]);
      if (hour < 12) morning.push(slot);
      else if (hour < 17) afternoon.push(slot);
      else evening.push(slot);
    });

    return { morning, afternoon, evening };
  }, [availableSlots]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Select Date & Time</h3>
        <p className="text-sm text-slate-500">Choose a convenient date and time slot</p>
      </div>

      {/* Stacked Layout: Calendar on top, slots below */}
      <div className="space-y-6">
        {/* Calendar Section */}
        <div className="flex flex-col items-center">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <Calendar
              mode="single"
              selected={proposedDate}
              onSelect={handleDateChange}
              disabled={(date: Date) => date < startOfToday()}
              className="bg-transparent"
              classNames={{
                day_selected: "bg-slate-900 text-white hover:bg-slate-800",
                day_today: "bg-cyan-50 text-cyan-700 font-bold border border-cyan-100",
              }}
            />
          </div>
          {proposedDate && (
            <p className="mt-2 text-sm font-medium text-cyan-600">
              {format(proposedDate, 'EEEE, MMMM d, yyyy')}
            </p>
          )}
        </div>

        {/* Time Slots Section - Always visible */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-600" />
            <Label className="text-sm font-semibold text-slate-700">Available Times</Label>
          </div>

          <div className="min-h-[200px] border border-slate-200 rounded-2xl p-4">
            {loadingSlots ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-10">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500/40" />
                <p className="text-xs text-slate-400">Loading available slots...</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-10 text-center">
                <CalendarIcon className="h-10 w-10 text-slate-300" />
                <div>
                  <p className="font-medium text-slate-600">No available slots</p>
                  <p className="text-xs text-slate-400 mt-1">Select a different date</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5 max-h-[250px] overflow-y-auto pr-2">
                {categorizedSlots.morning.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Sun className="h-3.5 w-3.5 text-amber-500" /> Morning
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {categorizedSlots.morning.map(slot => (
                        <SlotButton
                          key={slot.startTime}
                          slot={slot}
                          selected={selectedSlot === slot.startTime}
                          onSelect={() => onSelect(format(proposedDate!, 'yyyy-MM-dd'), slot.startTime)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {categorizedSlots.afternoon.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Sunset className="h-3.5 w-3.5 text-orange-500" /> Afternoon
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {categorizedSlots.afternoon.map(slot => (
                        <SlotButton
                          key={slot.startTime}
                          slot={slot}
                          selected={selectedSlot === slot.startTime}
                          onSelect={() => onSelect(format(proposedDate!, 'yyyy-MM-dd'), slot.startTime)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {categorizedSlots.evening.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Moon className="h-3.5 w-3.5 text-indigo-400" /> Evening
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {categorizedSlots.evening.map(slot => (
                        <SlotButton
                          key={slot.startTime}
                          slot={slot}
                          selected={selectedSlot === slot.startTime}
                          onSelect={() => onSelect(format(proposedDate!, 'yyyy-MM-dd'), slot.startTime)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedSlot && (
            <p className="text-sm text-center text-cyan-600 font-medium">
              Selected: {selectedSlot}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SlotButton({ slot, selected, onSelect }: { slot: AvailableSlotResponseDto; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!slot.isAvailable}
      className={cn(
        "h-10 rounded-xl text-sm font-medium transition-all border",
        selected
          ? "bg-slate-900 border-slate-900 text-white shadow-md"
          : slot.isAvailable
            ? "bg-white border-slate-200 text-slate-600 hover:border-cyan-500 hover:text-cyan-600 hover:bg-cyan-50"
            : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
      )}
    >
      {slot.startTime}
    </button>
  );
}
