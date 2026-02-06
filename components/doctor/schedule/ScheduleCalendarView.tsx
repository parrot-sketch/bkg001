'use client';

import { useState, useOptimistic, useTransition, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View, Views, SlotInfo } from 'react-big-calendar';
import withDragAndDrop, { withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { moveAppointment } from '@/app/actions/schedule';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// Setup Localizer
const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

// Types
interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    resource?: any;
    status: string;
    version: number;
    isOptimistic?: boolean;
}

interface ScheduleCalendarViewProps {
    appointments: any[]; // In strict mode, define specifically or import type
    workingDays?: any[];
    blocks?: any[];
    onSetupScheduleClick?: () => void;
}

export function ScheduleCalendarView({ appointments: initialAppointments, workingDays = [], onSetupScheduleClick }: ScheduleCalendarViewProps) {
    const [view, setView] = useState<View>(Views.WEEK);
    const [date, setDate] = useState(new Date());
    const [isPending, startTransition] = useTransition();

    // Transform initial data to events
    const initialEvents: CalendarEvent[] = initialAppointments.map(apt => ({
        id: apt.id,
        title: `${apt.type} with ${apt.patient?.first_name} ${apt.patient?.last_name}`,
        start: new Date(apt.scheduled_at),
        end: new Date(new Date(apt.scheduled_at).getTime() + (apt.duration_minutes || 30) * 60000),
        status: apt.status,
        version: apt.version,
        resource: apt,
    }));

    // Optimistic State
    const [optimisticEvents, addOptimisticEvent] = useOptimistic(
        initialEvents,
        (state: CalendarEvent[], newEvent: CalendarEvent) => {
            // Replace if exists (update), else add
            const exists = state.find(e => e.id === newEvent.id);
            if (exists) {
                return state.map(e => e.id === newEvent.id ? { ...newEvent, isOptimistic: true } : e);
            }
            return [...state, { ...newEvent, isOptimistic: true }];
        }
    );

    // Event Handlers
    const onEventDrop = useCallback(async (args: any) => {
        const { event, start, end } = args;
        const appointmentId = event.id;

        // 1. Optimistic Update
        const updatedEvent: CalendarEvent = {
            ...event,
            start: new Date(start),
            end: new Date(end),
        };
        addOptimisticEvent(updatedEvent);

        // 2. Server Action
        startTransition(async () => {
            try {
                const result = await moveAppointment({
                    appointmentId,
                    newDate: start,
                    version: event.version,
                });

                if (result.success) {
                    toast.success('Appointment rescheduled');
                }
            } catch (error: any) {
                toast.error(error.message || 'Failed to move appointment');
                // In a real app, strict rollback might be needed here if useOptimistic doesn't revert auto-magically on revalidate (it usually relies on re-render from parent)
            }
        });
    }, [addOptimisticEvent]);

    const eventStyleGetter = (event: CalendarEvent) => {
        let backgroundColor = '#3b82f6'; // default blue
        if (event.status === 'CONFIRMED') backgroundColor = '#22c55e';
        if (event.status === 'PENDING') backgroundColor = '#eab308';
        if (event.status === 'CANCELLED') backgroundColor = '#ef4444';
        if (event.status === 'COMPLETED') backgroundColor = '#6b7280';

        // Dim if optimistic
        const opacity = event.isOptimistic ? 0.5 : 1.0;
        const border = event.isOptimistic ? '2px dashed #fff' : '0px';

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity,
                color: 'white',
                border,
                display: 'block',
            },
        };
    };

    return (
        <Card className="h-full border-none shadow-none flex flex-col">
            {workingDays?.length === 0 && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 flex items-center justify-between mx-4 mt-4">
                    <div className="flex items-center">
                        <Info className="h-5 w-5 text-blue-400 mr-2" />
                        <p className="text-sm text-blue-700">
                            You haven't set up your weekly schedule yet.
                        </p>
                    </div>
                    {onSetupScheduleClick && (
                        <Button variant="outline" size="sm" onClick={onSetupScheduleClick} className="bg-white hover:bg-blue-50 border-blue-200 text-blue-700">
                            Set up Weekly Schedule
                        </Button>
                    )}
                </div>
            )}
            <CardContent className="p-0 h-[800px] flex-1">
                <DnDCalendar
                    localizer={localizer}
                    events={optimisticEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    view={view}
                    onView={setView}
                    date={date}
                    onNavigate={setDate}
                    eventPropGetter={eventStyleGetter}
                    tooltipAccessor={(event: CalendarEvent) => `${event.title} (${event.status})`}
                    popup
                    resizable
                    selectable
                    onEventDrop={onEventDrop}
                // blocks customization would go here using `backgroundEvents` or custom `DayWrapper`
                />
            </CardContent>
        </Card>
    );
}
