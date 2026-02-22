/**
 * WeeklyTemplateEditor Component
 * 
 * Handles the calendar-based template editing interface.
 * Extracted from ScheduleSettingsPanelV2 for better component organization.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { CalendarAvailabilitySlot, SlotType } from '@/domain/types/schedule';
import { calendarLocalizer } from '@/lib/calendar';
import { SLOT_TYPE_CONFIG } from '../constants';
import { TemplateEventComponent } from './TemplateEventComponent';

const DnDCalendar = withDragAndDrop<CalendarAvailabilitySlot>(Calendar);

const BASE_DATE = new Date(2000, 0, 2);
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface WeeklyTemplateEditorProps {
  events: CalendarAvailabilitySlot[];
  onEventDrop: (event: CalendarAvailabilitySlot, start: Date, end: Date) => void;
  onEventResize: (event: CalendarAvailabilitySlot, start: Date, end: Date) => void;
  onSelectSlot: (start: Date, end: Date) => void;
  onSelectEvent: (event: CalendarAvailabilitySlot) => void;
}

export function WeeklyTemplateEditor({
  events,
  onEventDrop,
  onEventResize,
  onSelectSlot,
  onSelectEvent,
}: WeeklyTemplateEditorProps) {
  const eventStyleGetter = useCallback((event: CalendarAvailabilitySlot) => {
    const config = SLOT_TYPE_CONFIG[event.type] || SLOT_TYPE_CONFIG.CLINIC;
    return {
      style: {
        backgroundColor: config.color,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        fontSize: '0.75rem',
        padding: '4px 8px',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
      },
    };
  }, []);

  const handleEventDrop = useCallback(({ event, start, end }: any) => {
    onEventDrop(event, start, end);
  }, [onEventDrop]);

  const handleEventResize = useCallback(({ event, start, end }: any) => {
    onEventResize(event, start, end);
  }, [onEventResize]);

  return (
    <Card className="shadow-lg border-2">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Weekly Template</CardTitle>
            <CardDescription className="text-sm mt-1">
              Drag to create, resize, or move availability blocks
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {Object.entries(SLOT_TYPE_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <div key={key} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm shadow-sm" 
                    style={{ backgroundColor: config.color }} 
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="schedule-template-calendar h-[600px]">
          <DnDCalendar
            localizer={calendarLocalizer}
            events={events}
            defaultView={Views.WEEK}
            views={[Views.WEEK]}
            defaultDate={BASE_DATE}
            toolbar={false}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            onSelectSlot={({ start, end }: any) => onSelectSlot(start, end)}
            onSelectEvent={onSelectEvent}
            eventPropGetter={eventStyleGetter}
            components={{
              event: TemplateEventComponent,
            }}
            formats={{
              dayFormat: (date: Date) => DAY_NAMES_SHORT[date.getDay()],
              dayHeaderFormat: (date: Date) => DAY_NAMES[date.getDay()],
            }}
            resizable
            selectable
            step={15}
            timeslots={2}
            min={new Date(2000, 0, 1, 6, 0, 0)}
            max={new Date(2000, 0, 1, 22, 0, 0)}
            date={BASE_DATE}
            onNavigate={() => {}}
            style={{ height: '100%' }}
            dayPropGetter={() => ({
              className: 'bg-background',
            })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
