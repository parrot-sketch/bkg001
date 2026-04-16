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
    User,
    Stethoscope,
    Scissors,
} from 'lucide-react';

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

// ── Types ──────────────────────────────────────────────────────────────────
interface CalendarEvent {
    id: number | string;
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
    calendarEvents?: any[];
    workingDays?: any[];
    blocks?: any[];
    overrides?: any[];
    onSetupScheduleClick?: () => void;
}

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { bg: string; border: string; dot: string; label: string }> = {
    PENDING_DOCTOR_CONFIRMATION: { bg: '#fef3c7', border: '#f59e0b', dot: '#f59e0b', label: 'Needs Review' },
    PENDING:        { bg: '#fffbeb', border: '#d97706', dot: '#d97706', label: 'Pending' },
    TENTATIVE:      { bg: '#fef3c7', border: '#f59e0b', dot: '#f59e0b', label: 'Tentative' },
    SCHEDULED:      { bg: '#eff6ff', border: '#3b82f6', dot: '#3b82f6', label: 'Confirmed' },
    CONFIRMED:      { bg: '#f0fdf4', border: '#16a34a', dot: '#16a34a', label: 'Confirmed' },
    CHECKED_IN:     { bg: '#ecfeff', border: '#0891b2', dot: '#0891b2', label: 'Checked In' },
    IN_CONSULTATION:{ bg: '#faf5ff', border: '#7c3aed', dot: '#7c3aed', label: 'In Consult' },
    IN_PROGRESS:    { bg: '#e0e7ff', border: '#6366f1', dot: '#6366f1', label: 'In Progress' },
    COMPLETED:      { bg: '#f9fafb', border: '#6b7280', dot: '#6b7280', label: 'Completed' },
    CANCELLED:      { bg: '#fff1f2', border: '#e11d48', dot: '#e11d48', label: 'Cancelled' },
    NO_SHOW:        { bg: '#f9fafb', border: '#9ca3af', dot: '#9ca3af', label: 'No Show' },
};

const TYPE_ICONS: Record<string, any> = {
    Consultation: Stethoscope,
    Surgery: Scissors,
    'Follow-up': Clock,
    'Initial Consultation': Stethoscope,
    'Follow Up': Clock,
};

function getEventKindLabel(event: CalendarEvent): string {
    if (event.type !== 'Surgery') {
        return event.type;
    }

    if (event.status === 'CONFIRMED' || event.status === 'IN_PROGRESS' || event.status === 'COMPLETED') {
        return 'Theater Booking';
    }

    return 'Tentative Surgery';
}

function getStatusLabel(event: CalendarEvent): string {
    if (event.type === 'Surgery' && event.status === 'CONFIRMED') {
        return 'Booked';
    }

    return STATUS_CONFIG[event.status]?.label ?? event.status;
}

// ── Custom Toolbar ─────────────────────────────────────────────────────────
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
            if (weekStart.getMonth() === weekEnd.getMonth())
                return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'd, yyyy')}`;
            return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
        }
        if (view === Views.DAY) return format(date, 'EEEE, MMMM d, yyyy');
        return format(date, 'MMMM yyyy');
    };

    const viewButtons: { key: View; label: string }[] = [
        { key: Views.DAY,    label: 'Day' },
        { key: Views.WEEK,   label: 'Week' },
        { key: Views.MONTH,  label: 'Month' },
        { key: Views.AGENDA, label: 'List' },
    ];

    return (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6">
            <div className="flex items-center gap-4">
                <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                    {getLabel()}
                </h2>
                {eventCount > 0 && (
                    <Badge variant="secondary" className="hidden sm:flex text-xs font-normal">
                        {eventCount} schedule items
                    </Badge>
                )}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <div className="flex items-center bg-muted/50 rounded-lg p-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => onNavigate(new Date())} className="h-7 text-xs px-3">
                        Today
                    </Button>
                    <div className="w-px h-4 bg-border mx-1" />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goBack}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goForward}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center bg-muted/50 rounded-lg p-1 shrink-0">
                    {viewButtons.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => onView(key)}
                            className={cn(
                                'px-3 py-1 text-xs font-medium rounded-md transition-all',
                                view === key
                                    ? 'bg-background shadow-sm text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Rich Event Card ────────────────────────────────────────────────────────
function AppointmentEvent({ event }: { event: CalendarEvent }) {
    const cfg = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.SCHEDULED;
    const isSurgery = event.type === 'Surgery';
    const TypeIcon = TYPE_ICONS[event.type] ?? Stethoscope;
    const durationMins = Math.round((event.end.getTime() - event.start.getTime()) / 60000);
    const isShort = durationMins < 30;
    const isCancelled = event.status === 'CANCELLED' || event.status === 'NO_SHOW';
    const eventKindLabel = getEventKindLabel(event);
    const statusLabel = getStatusLabel(event);

    if (isShort) {
        return (
            <div className="flex items-center gap-1.5 overflow-hidden h-full px-1">
                <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cfg.dot }}
                />
                <span className={cn(
                    'text-[0.65rem] font-semibold leading-none truncate',
                    isCancelled && 'line-through opacity-60'
                )}>
                    {event.title}
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full px-1 py-1 gap-1">
            {/* Title Row */}
            <div className="flex items-center gap-1.5">
                <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isSurgery ? '#3b82f6' : cfg.dot }}
                />
                <span className={cn(
                    'text-xs font-semibold leading-tight truncate text-slate-800',
                    isCancelled && 'line-through opacity-50'
                )}>
                    {event.title}
                </span>
            </div>

            {/* Meta Row */}
            <div className="flex items-center gap-1 text-[0.65rem] text-slate-500">
                <TypeIcon className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{eventKindLabel}</span>
                <span className="opacity-60 text-[10px]">·</span>
                <span className="whitespace-nowrap font-medium">{format(event.start, 'h:mm a')}</span>
            </div>

            {/* Status Tag (if tall enough) */}
            {durationMins >= 45 && !isCancelled && (
                <div className="mt-auto pt-1">
                    <span
                        className="text-[0.6rem] font-medium px-1.5 py-0.5 rounded-md inline-block bg-white/60 text-slate-700 shadow-sm border border-slate-100 backdrop-blur-sm"
                    >
                        {statusLabel}
                    </span>
                </div>
            )}
        </div>
    );
}



// ── Main Component ─────────────────────────────────────────────────────────
export function ScheduleCalendarView({
    appointments: initialAppointments,
    calendarEvents = [],
    workingDays = [],
    blocks = [],
    overrides = [],
    onSetupScheduleClick,
}: ScheduleCalendarViewProps) {
    const [view, setView] = useState<View>(Views.WEEK);
    const [date, setDate] = useState(new Date());
    const calendarRef = useRef<HTMLDivElement>(null);

    // Transform appointments + surgicalCases → events
    const events: CalendarEvent[] = useMemo(() => {
        const appointmentEvents = initialAppointments
            .map(apt => {
                let startDate: Date;
                if (apt.scheduled_at) {
                    startDate = new Date(apt.scheduled_at);
                } else if (apt.appointment_date && apt.time) {
                    const [hours, mins] = apt.time.split(':').map(Number);
                    startDate = new Date(apt.appointment_date);
                    startDate.setHours(hours, mins, 0, 0);
                } else if (apt.appointment_date) {
                    startDate = new Date(apt.appointment_date);
                    startDate.setHours(9, 0, 0, 0);
                } else {
                    return null;
                }
                if (isNaN(startDate.getTime())) return null;

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
            })
            .filter(Boolean) as CalendarEvent[];

        const surgicalEvents = calendarEvents
            .map(ce => {
                const sc = ce.surgical_case;
                const durationMinutes =
                    sc?.total_theatre_minutes && sc.total_theatre_minutes > 0
                        ? sc.total_theatre_minutes
                        : 60;

                let start: Date | null = ce.start_time ? new Date(ce.start_time) : null;
                let end: Date | null = ce.end_time ? new Date(ce.end_time) : null;

                // Planned surgical cases can exist before a theater slot is confirmed.
                // In that state we still show the case on the planned procedure date as a
                // tentative placeholder so the doctor's schedule reflects the commitment.
                if ((!start || !end) && sc?.procedure_date) {
                    start = new Date(sc.procedure_date);
                    start.setHours(9, 0, 0, 0);
                    end = new Date(start.getTime() + durationMinutes * 60000);
                }

                if (!start || !end) return null;
                if (isNaN(start.getTime())) return null;

                const roleFormatted = ce.team_member_role?.replace(/_/g, ' ') || 'Surgery';
                const fileNum = sc?.patient?.file_number ? `(${sc.patient.file_number})` : '';

                return {
                    id: `ce-${ce.id}`,
                    title: sc?.patient
                        ? `[${roleFormatted}] ${sc.patient.first_name || ''} ${sc.patient.last_name || ''} ${fileNum}`.trim()
                        : `[${roleFormatted}] ${sc?.procedure_name || 'Generic Surgery'}`,
                    start,
                    end,
                    status: ce.status,
                    type: 'Surgery',
                    version: 0,
                    resource: ce,
                    resourceType: 'CALENDAR_EVENT',
                };
            })
            .filter(Boolean) as CalendarEvent[];

        return [...appointmentEvents, ...surgicalEvents];
    }, [initialAppointments, calendarEvents]);

    // Pending review count — appointments the doctor needs to confirm
    const pendingCount = useMemo(
        () => events.filter(e =>
            e.status === 'PENDING_DOCTOR_CONFIRMATION' || e.status === 'PENDING'
        ).length,
        [events]
    );


    // Drag & drop
    const onEventDrop = useCallback(async (args: any) => {
        const { event, start } = args;
        try {
            const result = await moveAppointment({
                appointmentId: event.id,
                newDate: new Date(start),
                version: event.version,
            });
            if (result.success) toast.success('Appointment rescheduled');
        } catch (error: any) {
            toast.error(error.message || 'Failed to move appointment');
        }
    }, []);

    // Event style — glassmorphic, modern feeling
    const eventStyleGetter = useCallback((event: CalendarEvent) => {
        const cfg = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.SCHEDULED;
        const isSurgery = event.type === 'Surgery';
        const bg = isSurgery ? '#eff6ff' : cfg.bg; // Keep surgery distinct blue

        return {
            style: {
                backgroundColor: bg,
                color: '#0f172a',
                border: '1px solid rgba(0,0,0,0.08)',
                borderLeft: `3px solid ${isSurgery ? '#3b82f6' : cfg.border}`,
                borderRadius: '6px',
                padding: '1px',
                opacity: event.isOptimistic ? 0.6 : 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                overflow: 'hidden',
                minHeight: '28px',
            },
        };
    }, []);

    // Scroll to now
    useEffect(() => {
        const timer = setTimeout(() => {
            if (calendarRef.current) {
                const indicator = calendarRef.current.querySelector('.rbc-current-time-indicator');
                if (indicator) indicator.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [view]);

    // Working hours
    const { minTime, maxTime } = useMemo(() => {
        if (workingDays.length === 0)
            return { minTime: new Date(2000, 0, 1, 7, 0), maxTime: new Date(2000, 0, 1, 20, 0) };
        let earliest = 24, latest = 0;
        for (const wd of workingDays) {
            const [sh] = wd.startTime.split(':').map(Number);
            const [eh] = wd.endTime.split(':').map(Number);
            if (sh < earliest) earliest = sh;
            if (eh > latest) latest = eh;
        }
        return {
            minTime: new Date(2000, 0, 1, Math.max(earliest - 1, 0), 0),
            maxTime: new Date(2000, 0, 1, Math.min(latest + 1, 23), 0),
        };
    }, [workingDays]);

    const hasNoSchedule = workingDays.length === 0;

    return (
        <div className="flex flex-col gap-4">
            {/* Pending review banner */}
            {pendingCount > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-md shrink-0">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            {pendingCount} appointment{pendingCount !== 1 ? 's' : ''} awaiting your confirmation
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                            These are shown in amber on the calendar. Confirm them so the frontdesk can check patients in.
                        </p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700 shrink-0">
                        {pendingCount} pending
                    </Badge>
                </div>
            )}
            {/* Setup prompt */}
            {hasNoSchedule && (
                <div className="flex items-center justify-between gap-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-md">
                            <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                No availability hours set
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                Set your weekly hours in the My Availability tab so patients and staff can book with you.
                            </p>
                        </div>
                    </div>
                    {onSetupScheduleClick && (
                        <Button
                            size="sm"
                            onClick={onSetupScheduleClick}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shrink-0"
                        >
                            Set Up Availability
                        </Button>
                    )}
                </div>
            )}

            {/* Calendar card */}
            <Card className="border shadow-sm overflow-hidden">
                <CardContent className="p-4 flex flex-col">
                    <CustomToolbar
                        date={date}
                        view={view}
                        onNavigate={setDate}
                        onView={setView}
                        eventCount={events.length}
                    />

                    <div ref={calendarRef} className="min-h-[500px]">
                        <DnDCalendar
                            localizer={calendarLocalizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: 500 }}
                            view={view}
                            onView={setView}
                            date={date}
                            onNavigate={setDate}
                            eventPropGetter={eventStyleGetter}
                            components={{ event: AppointmentEvent }}
                            formats={{
                                dayHeaderFormat: (date: Date) => {
                                    const d = format(date, 'EEE d');
                                    return isToday(date) ? `◉ ${d}` : d;
                                },
                                dayFormat: (date: Date) => format(date, 'EEE d'),
                                dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                                    `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`,
                                timeGutterFormat: (date: Date) => format(date, 'h a'),
                                agendaDateFormat: (date: Date) => format(date, 'EEE, MMM d'),
                                agendaTimeFormat: (date: Date) => format(date, 'h:mm a'),
                                agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
                                    `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`,
                            }}
                            tooltipAccessor={(event: CalendarEvent) =>
                                `${event.title}\n${getEventKindLabel(event)} · ${getStatusLabel(event)}\n${format(event.start, 'h:mm a')} – ${format(event.end, 'h:mm a')}`
                            }
                            popup
                            resizable
                            selectable
                            onEventDrop={onEventDrop}
                            getNow={() => new Date()}
                            scrollToTime={new Date()}
                            min={minTime}
                            max={maxTime}
                            step={30}
                            timeslots={2}
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
