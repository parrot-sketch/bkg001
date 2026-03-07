/**
 * WeeklyTemplateEditor
 *
 * Drag-and-drop calendar for building the weekly availability template.
 * Shows Mon–Sun with configurable time blocks the doctor can draw/resize.
 */

'use client';

import { useCallback } from 'react';
import { Calendar, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { CalendarAvailabilitySlot } from '@/domain/types/schedule';
import { calendarLocalizer } from '@/lib/calendar';
import { SLOT_TYPE_CONFIG, BASE_DATE, DAY_NAMES, DAY_NAMES_SHORT } from '../constants';
import { TemplateEventComponent } from './TemplateEventComponent';
import { cn } from '@/lib/utils';

const DnDCalendar = withDragAndDrop<CalendarAvailabilitySlot>(Calendar);

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
                opacity: 0.92,
                color: 'white',
                border: 'none',
                fontSize: '0.72rem',
                padding: '3px 7px',
                cursor: 'pointer',
                transition: 'filter 0.15s ease, box-shadow 0.15s ease',
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
        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
            {/* Legend strip */}
            <div className="flex items-center justify-between gap-4 px-4 py-3 bg-muted/30 border-b border-border">
                <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Draw</span> on the calendar to add a block · <span className="font-medium text-foreground">Drag</span> to move · <span className="font-medium text-foreground">Resize</span> bottom edge to adjust
                </p>
                <div className="flex items-center gap-4 shrink-0">
                    {Object.entries(SLOT_TYPE_CONFIG).map(([key, config]) => (
                        <div key={key} className="flex items-center gap-1.5">
                            <span
                                className="w-2.5 h-2.5 rounded-sm shadow-sm"
                                style={{ backgroundColor: config.color }}
                            />
                            <span className="text-xs font-medium text-muted-foreground">
                                {config.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Calendar */}
            <div className="schedule-template-calendar" style={{ height: 620 }}>
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
                    components={{ event: TemplateEventComponent }}
                    formats={{
                        dayFormat: (date: Date) => DAY_NAMES_SHORT[date.getDay()],
                        dayHeaderFormat: (date: Date) => DAY_NAMES[date.getDay()],
                        timeGutterFormat: (date: Date) => {
                            const h = date.getHours();
                            if (h === 0) return '12 AM';
                            if (h === 12) return '12 PM';
                            return h < 12 ? `${h} AM` : `${h - 12} PM`;
                        },
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
                    dayPropGetter={() => ({ className: 'bg-background' })}
                />
            </div>
        </div>
    );
}
