'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Calendar, View, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, addDays, subDays, addMonths, subMonths, startOfWeek, isToday } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import '@/styles/schedule-calendar.css';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { moveAppointment } from '@/app/actions/schedule';
import { cn } from '@/lib/utils';
import { calendarLocalizer } from '@/lib/calendar';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Clock,
    AlertCircle,
    Layers,
    LayoutGrid,
    List,
    Maximize2,
} from 'lucide-react';

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

// ── Types ──
interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    resource?: any;
    status: string;
    type: string;
    version: number;
    isOptimistic?: boolean;
    isBackground?: boolean;
}

interface ScheduleCalendarViewProps {
    appointments: any[];
    workingDays?: any[];
    blocks?: any[];
    overrides?: any[];
    onSetupScheduleClick?: () => void;
}

// ── Status Colors ──
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    SCHEDULED: { bg: '#3b82f6', text: '#ffffff', border: '#2563eb' },
    CONFIRMED: { bg: '#059669', text: '#ffffff', border: '#047857' },
    CHECKED_IN: { bg: '#0891b2', text: '#ffffff', border: '#0e7490' },
    IN_CONSULTATION: { bg: '#7c3aed', text: '#ffffff', border: '#6d28d9' },
    PENDING: { bg: '#d97706', text: '#ffffff', border: '#b45309' },
    COMPLETED: { bg: '#6b7280', text: '#ffffff', border: '#4b5563' },
    CANCELLED: { bg: '#ef4444', text: '#ffffff', border: '#dc2626' },
    NO_SHOW: { bg: '#9ca3af', text: '#ffffff', border: '#6b7280' },
};

const STATUS_LABELS: Record<string, string> = {
    SCHEDULED: 'Scheduled',
    CONFIRMED: 'Confirmed',
    CHECKED_IN: 'Checked In',
    IN_CONSULTATION: 'In Consult',
    PENDING: 'Pending',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    NO_SHOW: 'No Show',
};

// ── Custom Toolbar ──
function CustomToolbar({
    date,
    view,
    onNavigate,
    onView,
    eventCount,
}: {
    date: Date;
    view: View;
    onNavigate: (date: Date) => void;
    onView: (view: View) => void;
    eventCount: number;
}) {
    const goToToday = () => onNavigate(new Date());
    const goBack = () => {
        if (view === Views.MONTH) onNavigate(subMonths(date, 1));
        else if (view === Views.WEEK) onNavigate(subDays(date, 7));
        else onNavigate(subDays(date, 1));
    };
    const goForward = () => {
        if (view === Views.MONTH) onNavigate(addMonths(date, 1));
        else if (view === Views.WEEK) onNavigate(addDays(date, 7));
        else onNavigate(addDays(date, 1));
    };

    const getLabel = () => {
        if (view === Views.MONTH) return format(date, 'MMMM yyyy');
        if (view === Views.WEEK) {
            const weekStart = startOfWeek(date, { weekStartsOn: 0 });
            const weekEnd = addDays(weekStart, 6);
            if (weekStart.getMonth() === weekEnd.getMonth()) {
                return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'd, yyyy')}`;
            }
            return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
        }
        if (view === Views.DAY) return format(date, 'EEEE, MMMM d, yyyy');
        return format(date, 'MMMM yyyy');
    };

    const viewButtons: { key: View; icon: any; label: string }[] = [
        { key: Views.DAY, icon: Maximize2, label: 'Day' },
        { key: Views.WEEK, icon: Layers, label: 'Week' },
        { key: Views.MONTH, icon: LayoutGrid, label: 'Month' },
        { key: Views.AGENDA, icon: List, label: 'Agenda' },
    ];

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1 pb-4">
            {/* Left: Navigation */}
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                    className={cn(
                        "h-8 px-3 text-xs font-medium",
                        isToday(date) && "bg-primary/5 border-primary/30 text-primary"
                    )}
                >
                    <Clock className="h-3 w-3 mr-1.5" />
                    Today
                </Button>
                <div className="flex items-center border rounded-md overflow-hidden">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={goBack}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-l" onClick={goForward}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <h2 className="text-base font-semibold text-foreground ml-1 whitespace-nowrap">
                    {getLabel()}
                </h2>
            </div>

            {/* Right: View Switcher + Count */}
            <div className="flex items-center gap-3">
                {eventCount > 0 && (
                    <Badge variant="secondary" className="text-xs font-normal">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {eventCount} appointment{eventCount !== 1 ? 's' : ''}
                    </Badge>
                )}
                <div className="flex items-center border rounded-md overflow-hidden">
                    {viewButtons.map(({ key, icon: Icon, label }) => (
                        <Button
                            key={key}
                            variant={view === key ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onView(key)}
                            className={cn(
                                "h-8 px-3 text-xs font-medium rounded-none border-r last:border-r-0",
                                view === key
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className="h-3 w-3 mr-1.5" />
                            <span className="hidden sm:inline">{label}</span>
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Main Component ──
export function ScheduleCalendarView({
    appointments: initialAppointments,
    workingDays = [],
    blocks = [],
    overrides = [],
    onSetupScheduleClick
}: ScheduleCalendarViewProps) {
    const [view, setView] = useState<View>(Views.WEEK);
    const [date, setDate] = useState(new Date());
    const calendarRef = useRef<HTMLDivElement>(null);

    // Transform appointments → events
    const events: CalendarEvent[] = useMemo(() => {
        return initialAppointments.map(apt => {
            // Handle both scheduled_at and appointment_date + time formats
            let startDate: Date;
            if (apt.scheduled_at) {
                startDate = new Date(apt.scheduled_at);
            } else if (apt.appointment_date && apt.time) {
                const [hours, mins] = apt.time.split(':').map(Number);
                startDate = new Date(apt.appointment_date);
                startDate.setHours(hours, mins, 0, 0);
            } else {
                startDate = new Date(apt.appointment_date || apt.created_at);
            }

            const durationMs = (apt.duration_minutes || apt.slot_duration || 30) * 60000;

            return {
                id: apt.id,
                title: apt.patient
                    ? `${apt.patient.first_name} ${apt.patient.last_name}`
                    : `Appointment #${apt.id}`,
                start: startDate,
                end: new Date(startDate.getTime() + durationMs),
                status: apt.status,
                type: apt.type || 'Consultation',
                version: apt.version || 0,
                resource: apt,
            };
        });
    }, [initialAppointments]);

    // Drag & drop handler
    const onEventDrop = useCallback(async (args: any) => {
        const { event, start, end } = args;

        try {
            const result = await moveAppointment({
                appointmentId: event.id,
                newDate: new Date(start),
                version: event.version,
            });

            if (result.success) {
                toast.success('Appointment rescheduled');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to move appointment');
        }
    }, []);

    // Event styles
    const eventStyleGetter = useCallback((event: CalendarEvent) => {
        const colors = STATUS_COLORS[event.status] || STATUS_COLORS.SCHEDULED;
        const isOptimistic = event.isOptimistic;

        return {
            style: {
                backgroundColor: colors.bg,
                color: colors.text,
                borderLeft: `3px solid ${colors.border}`,
                borderRadius: '6px',
                opacity: isOptimistic ? 0.5 : 1,
                border: isOptimistic ? '2px dashed rgba(255,255,255,0.5)' : `1px solid ${colors.border}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                fontSize: '0.75rem',
                padding: '2px 6px',
            },
        };
    }, []);

    // Custom event component
    const EventComponent = useCallback(({ event }: { event: CalendarEvent }) => {
        const statusLabel = STATUS_LABELS[event.status] || event.status;
        return (
            <div className="flex flex-col gap-0.5 overflow-hidden">
                <span className="font-medium text-[0.7rem] leading-tight truncate">
                    {event.title}
                </span>
                <span className="text-[0.6rem] opacity-80 leading-tight">
                    {event.type} · {statusLabel}
                </span>
            </div>
        );
    }, []);

    // Scroll to current time on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            if (calendarRef.current) {
                const timeIndicator = calendarRef.current.querySelector('.rbc-current-time-indicator');
                if (timeIndicator) {
                    timeIndicator.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [view]);

    // Calculate working hours range for day/week views
    const { minTime, maxTime } = useMemo(() => {
        if (workingDays.length === 0) {
            return {
                minTime: new Date(2000, 0, 1, 7, 0, 0),
                maxTime: new Date(2000, 0, 1, 20, 0, 0),
            };
        }

        let earliest = 24;
        let latest = 0;
        for (const wd of workingDays) {
            const [startH] = wd.startTime.split(':').map(Number);
            const [endH] = wd.endTime.split(':').map(Number);
            if (startH < earliest) earliest = startH;
            if (endH > latest) latest = endH;
        }

        return {
            minTime: new Date(2000, 0, 1, Math.max(earliest - 1, 0), 0, 0),
            maxTime: new Date(2000, 0, 1, Math.min(latest + 1, 23), 0, 0),
        };
    }, [workingDays]);

    // Format day header
    const dayHeaderFormat = useCallback((date: Date) => {
        const dayName = format(date, 'EEE');
        const dayNum = format(date, 'd');
        const todayClass = isToday(date);
        return todayClass ? `● ${dayName} ${dayNum}` : `${dayName} ${dayNum}`;
    }, []);

    const hasNoSchedule = workingDays.length === 0;

    return (
        <div className="flex flex-col h-full">
            {/* Setup Prompt */}
            {hasNoSchedule && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                Weekly schedule not configured
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                Set up your availability so patients and staff can book appointments.
                            </p>
                        </div>
                    </div>
                    {onSetupScheduleClick && (
                        <Button
                            size="sm"
                            onClick={onSetupScheduleClick}
                            className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                        >
                            Set Up Schedule
                        </Button>
                    )}
                </div>
            )}

            {/* Calendar Card */}
            <Card className="flex-1 border shadow-sm overflow-hidden">
                <CardContent className="p-4 flex flex-col h-full">
                    {/* Custom Toolbar */}
                    <CustomToolbar
                        date={date}
                        view={view}
                        onNavigate={setDate}
                        onView={setView}
                        eventCount={events.length}
                    />

                    {/* Status Legend */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-3 border-b mb-3">
                        {Object.entries(STATUS_COLORS)
                            .filter(([key]) => ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED'].includes(key))
                            .map(([key, colors]) => (
                                <div key={key} className="flex items-center gap-1.5">
                                    <div
                                        className="w-2.5 h-2.5 rounded-sm"
                                        style={{ backgroundColor: colors.bg }}
                                    />
                                    <span className="text-[0.65rem] text-muted-foreground font-medium">
                                        {STATUS_LABELS[key]}
                                    </span>
                                </div>
                            ))}
                    </div>

                    {/* Calendar */}
                    <div ref={calendarRef} className="flex-1 min-h-[600px]">
                        <DnDCalendar
                            localizer={calendarLocalizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: '100%' }}
                            view={view}
                            onView={setView}
                            date={date}
                            onNavigate={setDate}
                            eventPropGetter={eventStyleGetter}
                            components={{
                                event: EventComponent,
                            }}
                            formats={{
                                dayHeaderFormat: (date: Date) => dayHeaderFormat(date),
                                dayFormat: (date: Date) => format(date, 'EEE d'),
                                dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                                    `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`,
                            }}
                            tooltipAccessor={(event: CalendarEvent) =>
                                `${event.title}\n${event.type} · ${STATUS_LABELS[event.status] || event.status}\n${format(event.start, 'h:mm a')} – ${format(event.end, 'h:mm a')}`
                            }
                            popup
                            resizable
                            selectable
                            onEventDrop={onEventDrop}
                            getNow={() => new Date()}
                            scrollToTime={new Date()}
                            min={minTime}
                            max={maxTime}
                            step={15}
                            timeslots={4}
                            dayPropGetter={(day: Date) => ({
                                className: isToday(day) ? 'rbc-today' : '',
                            })}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
