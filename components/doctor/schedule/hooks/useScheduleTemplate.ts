/**
 * useScheduleTemplate Hook
 * 
 * Manages the weekly availability template state and operations.
 * Extracted from ScheduleSettingsPanelV2 for better separation of concerns.
 */

import { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarAvailabilitySlot, WorkingDay, SlotType } from '@/domain/types/schedule';
import { mapWorkingDaysToCalendar, mapCalendarToWorkingDay } from '@/infrastructure/mappers/ScheduleMapper';

const BASE_DATE = new Date(2000, 0, 2);

interface UseScheduleTemplateOptions {
  initialWorkingDays?: WorkingDay[];
}

export function useScheduleTemplate({ initialWorkingDays = [] }: UseScheduleTemplateOptions) {
  // Initialize calendar events from working days
  const initialEvents = useMemo(() => {
    return mapWorkingDaysToCalendar(initialWorkingDays);
  }, [initialWorkingDays]);

  const [events, setEvents] = useState<CalendarAvailabilitySlot[]>(initialEvents);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(events) !== JSON.stringify(initialEvents);
  }, [events, initialEvents]);

  // Convert events back to working days
  const getWorkingDays = useCallback((): WorkingDay[] => {
    return events.map(mapCalendarToWorkingDay);
  }, [events]);

  // Update event (for drag/resize)
  const updateEvent = useCallback((eventId: string, updates: Partial<CalendarAvailabilitySlot>) => {
    setEvents(prev => prev.map(ev => 
      ev.id === eventId ? { ...ev, ...updates } : ev
    ));
  }, []);

  // Add new event
  const addEvent = useCallback((slot: Omit<CalendarAvailabilitySlot, 'id'>) => {
    const newEvent: CalendarAvailabilitySlot = {
      ...slot,
      id: Math.random().toString(36).substr(2, 9),
    };
    setEvents(prev => [...prev, newEvent]);
  }, []);

  // Delete event
  const deleteEvent = useCallback((eventId: string) => {
    setEvents(prev => prev.filter(ev => ev.id !== eventId));
  }, []);

  // Replace all events (for presets/bulk operations)
  const replaceEvents = useCallback((newEvents: CalendarAvailabilitySlot[]) => {
    setEvents(newEvents);
  }, []);

  // Reset to initial state
  const reset = useCallback(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  return {
    events,
    hasChanges,
    getWorkingDays,
    updateEvent,
    addEvent,
    deleteEvent,
    replaceEvents,
    reset,
  };
}
