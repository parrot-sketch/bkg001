'use client';

/**
 * TimeSlotPicker Component
 *
 * A visual time slot picker for theater booking.
 * Shows theaters as columns with their daily schedule.
 * Users can select available time slots.
 *
 * - Shows theaters with existing bookings
 * - Highlights available vs occupied slots
 * - Allows selecting start/end time
 */

import { useMemo, useState } from 'react';
import { format, addMinutes, differenceInMinutes, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import type { TheaterWithBookings, TheaterBookingSlot } from '@/hooks/theater-tech/useTheaterBooking';

interface TimeSlotPickerProps {
  theaters: TheaterWithBookings[];
  selectedDate: string;
  caseDurationMinutes: number; // Required duration from case plan
  selectedTheaterId?: string;
  selectedStartTime?: string;
  selectedEndTime?: string;
  onDateChange: (date: string) => void;
  onSelectSlot: (theaterId: string, startTime: string, endTime: string) => void;
  isLoading?: boolean;
}

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i); // 0-23 hours
const SLOT_HEIGHT = 48; // px per hour

export function TimeSlotPicker({
  theaters,
  selectedDate,
  caseDurationMinutes,
  selectedTheaterId,
  selectedStartTime,
  selectedEndTime,
  onDateChange,
  onSelectSlot,
  isLoading = false,
}: TimeSlotPickerProps) {
  const [hoveredSlot, setHoveredSlot] = useState<{ theaterId: string; hour: number } | null>(null);

  // Calculate start of day
  const dayStart = useMemo(() => {
    return parseISO(selectedDate);
  }, [selectedDate]);

  // Calculate slot positions
  const getSlotPosition = (hour: number) => {
    return hour * SLOT_HEIGHT;
  };

  // Get booking style based on status
  const getBookingStyle = (booking: TheaterBookingSlot) => {
    const startHour = booking.startTime instanceof Date 
      ? booking.startTime.getHours() + booking.startTime.getMinutes() / 60
      : new Date(booking.startTime).getHours() + new Date(booking.startTime).getMinutes() / 60;
    
    const endHour = booking.endTime instanceof Date
      ? booking.endTime.getHours() + booking.endTime.getMinutes() / 60
      : new Date(booking.endTime).getHours() + new Date(booking.endTime).getMinutes() / 60;

    const top = getSlotPosition(startHour);
    const height = (endHour - startHour) * SLOT_HEIGHT;

    const isProvisional = booking.status === 'PROVISIONAL';
    const isConfirmed = booking.status === 'CONFIRMED';

    return {
      top,
      height: Math.max(height, 20), // Min height for visibility
      isProvisional,
      isConfirmed,
    };
  };

  // Check if a time slot is available
  const isSlotAvailable = (theaterId: string, hour: number): boolean => {
    const theater = theaters.find(t => t.id === theaterId);
    if (!theater) return false;

    const slotStart = addMinutes(dayStart, hour * 60);
    const slotEnd = addMinutes(slotStart, 60);

    for (const booking of theater.bookings) {
      const bookingStart = booking.startTime instanceof Date 
        ? booking.startTime 
        : new Date(booking.startTime);
      const bookingEnd = booking.endTime instanceof Date 
        ? booking.endTime 
        : new Date(booking.endTime);

      // Check overlap
      if (slotStart < bookingEnd && slotEnd > bookingStart) {
        return false; // Occupied
      }
    }
    return true;
  };

  // Handle slot click
  const handleSlotClick = (theaterId: string, hour: number) => {
    const startTime = addMinutes(dayStart, hour * 60);
    const endTime = addMinutes(startTime, caseDurationMinutes);
    
    // Check if the full duration fits within available slots
    let available = true;
    let checkTime = startTime;
    while (checkTime < endTime) {
      const checkHour = checkTime.getHours();
      if (!isSlotAvailable(theaterId, checkHour)) {
        available = false;
        break;
      }
      checkTime = addMinutes(checkTime, 60);
    }

    if (available) {
      onSelectSlot(theaterId, startTime.toISOString(), endTime.toISOString());
    }
  };

  // Render time labels
  const renderTimeLabels = () => {
    return (
      <div className="flex flex-col border-r border-slate-200 pr-2">
        {TIME_SLOTS.filter(h => h >= 7 && h <= 20).map(hour => (
          <div
            key={hour}
            className="text-[10px] text-slate-400 font-medium text-right pr-1"
            style={{ height: SLOT_HEIGHT }}
          >
            {format(new Date().setHours(hour, 0), 'h a')}
          </div>
        ))}
      </div>
    );
  };

  // Render a single theater column
  const renderTheaterColumn = (theater: TheaterWithBookings) => {
    const isSelected = selectedTheaterId === theater.id;
    const filteredHours = TIME_SLOTS.filter(h => h >= 7 && h <= 20);

    return (
      <div
        key={theater.id}
        className={cn(
          'flex-1 min-w-[140px] border-r border-slate-100 last:border-r-0 relative',
          isSelected && 'bg-blue-50/30'
        )}
      >
        {/* Theater header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-2 py-2">
          <div className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: '#64748b' }}
            />
            <span className="text-xs font-semibold text-slate-800 truncate">
              {theater.name}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {theater.type} · KES {Math.round((theater.hourlyRate || 0) / 60).toLocaleString('en-KE')}/min
            <span className="text-slate-300"> · </span>
            KES {Math.round(theater.hourlyRate || 0).toLocaleString('en-KE')}/hr
          </div>
        </div>

        {/* Time slots grid */}
        <div className="relative" style={{ height: filteredHours.length * SLOT_HEIGHT }}>
          {/* Background grid */}
          {filteredHours.map(hour => {
            const available = isSlotAvailable(theater.id, hour);
            const isHovered = hoveredSlot?.theaterId === theater.id && hoveredSlot?.hour === hour;
            const isPartOfSelection = selectedTheaterId === theater.id && selectedStartTime && selectedEndTime && 
              (() => {
                const selStart = new Date(selectedStartTime).getTime();
                const selEnd = new Date(selectedEndTime).getTime();
                const slotStart = addMinutes(dayStart, hour * 60).getTime();
                const slotEnd = addMinutes(slotStart, 60).getTime();
                return slotStart >= selStart && slotEnd <= selEnd;
              })();

            return (
              <div
                key={hour}
                className={cn(
                  'absolute left-0 right-0 border-b border-slate-50 cursor-pointer transition-colors',
                  available && 'hover:bg-emerald-50',
                  !available && 'bg-slate-50',
                  isHovered && available && 'bg-emerald-100',
                  isPartOfSelection && 'bg-blue-100'
                )}
                style={{ top: (hour - 7) * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                onClick={() => available && handleSlotClick(theater.id, hour)}
                onMouseEnter={() => setHoveredSlot({ theaterId: theater.id, hour })}
                onMouseLeave={() => setHoveredSlot(null)}
              >
                {/* Hour markers */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {!available && (
                    <div className="w-full h-px bg-slate-200" />
                  )}
                </div>
              </div>
            );
          })}

          {/* Render bookings */}
          {theater.bookings.map(booking => {
            const hour = booking.startTime instanceof Date 
              ? booking.startTime.getHours() 
              : new Date(booking.startTime).getHours();
            
            if (hour < 7 || hour > 20) return null;

            const style = getBookingStyle(booking);
            
            return (
              <div
                key={booking.id}
                className={cn(
                  'absolute left-1 right-1 rounded-md px-2 py-1 text-[10px] overflow-hidden',
                  style.isConfirmed && 'bg-purple-100 text-purple-800 border border-purple-200',
                  style.isProvisional && 'bg-amber-100 text-amber-800 border border-amber-200',
                  !style.isConfirmed && !style.isProvisional && 'bg-slate-100 text-slate-600'
                )}
                style={{
                  top: style.top - ((hour - 7) * SLOT_HEIGHT),
                  height: style.height,
                }}
              >
                <div className="font-medium truncate">{booking.patientName}</div>
                <div className="truncate opacity-75">{booking.procedure}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Handle date navigation
  const handlePrevDay = () => {
    const prev = new Date(dayStart);
    prev.setDate(prev.getDate() - 1);
    onDateChange(format(prev, 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const next = new Date(dayStart);
    next.setDate(next.getDate() + 1);
    onDateChange(format(next, 'yyyy-MM-dd'));
  };

  const handleToday = () => {
    onDateChange(format(new Date(), 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-3">
      {/* Date selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevDay}>
            ←
          </Button>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="text-sm font-medium text-slate-800 bg-transparent border-none focus:outline-none"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleNextDay}>
            →
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={handleToday}>
          Today
        </Button>
      </div>

      {/* Duration info */}
      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-md">
        <Clock className="h-3.5 w-3.5" />
        <span>Case duration: <span className="font-medium text-slate-700">{caseDurationMinutes} minutes</span></span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-emerald-50 border border-emerald-200 rounded-sm" />
          <span className="text-slate-500">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-amber-100 border border-amber-200 rounded-sm" />
          <span className="text-slate-500">Provisional</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded-sm" />
          <span className="text-slate-500">Confirmed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-slate-50 border border-slate-200 rounded-sm" />
          <span className="text-slate-500">Occupied</span>
        </div>
      </div>

      {/* Time grid */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <div className="flex">
          {/* Time labels */}
          <div className="shrink-0 w-12 bg-slate-50 border-r border-slate-200 pt-10">
            {renderTimeLabels()}
          </div>

          {/* Theater columns */}
          <div className="flex-1 flex min-w-0">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : theaters.length === 0 ? (
              <div className="flex-1 text-center py-12 text-sm text-slate-400">
                No theaters available
              </div>
            ) : (
              theaters.map(renderTheaterColumn)
            )}
          </div>
        </div>
      </div>

      {/* Selected slot display */}
      {selectedTheaterId && selectedStartTime && selectedEndTime && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-blue-900">
                {theaters.find(t => t.id === selectedTheaterId)?.name}
              </div>
              <div className="text-xs text-blue-700">
                {format(new Date(selectedStartTime), 'MMM d, h:mm a')} - {format(new Date(selectedEndTime), 'h:mm a')}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onSelectSlot('', '', '');
              onSelectSlot(selectedTheaterId, selectedStartTime, selectedEndTime);
            }}
          >
            Change
          </Button>
        </div>
      )}
    </div>
  );
}
