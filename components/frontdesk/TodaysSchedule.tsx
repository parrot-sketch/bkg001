import { useState, type ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    ArrowUpRight,
    Calendar,
    CalendarClock,
    CheckCircle,
    Clock,
    Filter,
    Loader2,
    Search,
    Stethoscope,
    User,
} from 'lucide-react';
import { useTodaysSchedule } from '@/hooks/frontdesk/use-frontdesk-dashboard';
import { FrontdeskAppointment } from '@/actions/frontdesk/get-dashboard-data';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FrontdeskAppointmentCard } from './FrontdeskAppointmentCard';

type ScheduleSectionKey = 'scheduled' | 'checkedIn' | 'inConsultation' | 'completed';

interface ScheduleSectionDefinition {
    key: ScheduleSectionKey;
    title: string;
    description: string;
    emptyMessage: string;
    icon: typeof Clock;
    tone: string;
    borderTone: string;
    badgeTone: string;
}

const SCHEDULE_SECTIONS: ScheduleSectionDefinition[] = [
    {
        key: 'scheduled',
        title: 'Scheduled / Arriving',
        description: 'Patients expected today who still need frontdesk movement.',
        emptyMessage: 'No scheduled appointments pending arrival.',
        icon: Clock,
        tone: 'bg-slate-100 text-slate-700',
        borderTone: 'border-slate-200',
        badgeTone: 'bg-slate-900 text-white border-slate-900',
    },
    {
        key: 'checkedIn',
        title: 'Waiting Room',
        description: 'Checked-in patients who should be assigned or called next.',
        emptyMessage: 'Waiting room is empty.',
        icon: User,
        tone: 'bg-amber-50 text-amber-700',
        borderTone: 'border-amber-200/80',
        badgeTone: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
        key: 'inConsultation',
        title: 'In Consultation',
        description: 'Active consults currently underway with the clinical team.',
        emptyMessage: 'No active consultations.',
        icon: Stethoscope,
        tone: 'bg-emerald-50 text-emerald-700',
        borderTone: 'border-emerald-200/80',
        badgeTone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
        key: 'completed',
        title: 'Completed Today',
        description: 'Visits already closed out and completed today.',
        emptyMessage: 'No completed appointments yet.',
        icon: CheckCircle,
        tone: 'bg-slate-100 text-slate-600',
        borderTone: 'border-slate-200',
        badgeTone: 'bg-slate-100 text-slate-700 border-slate-200',
    },
];

function mapScheduleAppointmentToDto(appointment: FrontdeskAppointment): AppointmentResponseDto {
    return {
        id: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        appointmentDate: new Date(appointment.appointmentDate),
        time: appointment.time,
        status: appointment.status,
        type: appointment.type,
        patient: appointment.patient,
        doctor: appointment.doctor,
    };
}

export function TodaysSchedule() {
    // ALL hooks must be called unconditionally at the top
    const { data: schedule, isLoading, error } = useTodaysSchedule();
    const [searchQuery, setSearchQuery] = useState('');

    // Filter function defined before any conditionals
    const filterAppointments = (list: FrontdeskAppointment[] = []) => {
        if (!searchQuery) return list;
        const lowerQuery = searchQuery.toLowerCase();
        return list.filter(apt =>
            apt.patientName.toLowerCase().includes(lowerQuery) ||
            apt.doctorName.toLowerCase().includes(lowerQuery)
        );
    };

    // Computed values before any early returns
    const scheduled = filterAppointments(schedule?.scheduled ?? []);
    const checkedIn = filterAppointments(schedule?.checkedIn ?? []);
    const inConsultation = filterAppointments(schedule?.inConsultation ?? []);
    const completed = filterAppointments(schedule?.completed ?? []);
    const totalAppointments = scheduled.length + checkedIn.length + inConsultation.length + completed.length;

    const sections = SCHEDULE_SECTIONS;

    const appointmentMap: Record<ScheduleSectionKey, FrontdeskAppointment[]> = {
        scheduled,
        checkedIn,
        inConsultation,
        completed,
    };

    // Early returns AFTER all hooks are called - now React-compliant
    if (isLoading) {
        return (
            <Card className="h-full min-h-[400px] flex items-center justify-center border-slate-200 shadow-sm">
                <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    <p>Loading today's schedule...</p>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="h-full min-h-[400px] flex items-center justify-center border-red-200 bg-red-50 shadow-sm">
                <p className="text-red-600 font-medium">Failed to load schedule. Please try again.</p>
            </Card>
        );
    }

    return (
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-2xl">
            <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-slate-500">
                                <CalendarClock className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-[0.18em]">
                                    Daily Operations
                                </span>
                            </div>
                            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-semibold tracking-tight text-slate-900">
                                <Calendar className="h-5 w-5 text-slate-600" />
                                Today's Schedule
                            </CardTitle>
                            <p className="max-w-2xl text-sm text-slate-500">
                                Track arrivals, waiting room movement, and active consultations from one clear board.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
                            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
                                <CalendarClock className="h-4 w-4 text-slate-500" />
                                <span>{format(new Date(), 'EEEE, dd MMM yyyy')}</span>
                            </div>
                            <div className="relative min-w-0 sm:min-w-[260px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search patient or doctor..."
                                    className="w-full rounded-xl border-slate-200 bg-white pl-9 focus:border-slate-400"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="icon" className="shrink-0 rounded-xl border-slate-200 text-slate-600">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        <ScheduleSummaryTile
                            label="Total Visible"
                            value={totalAppointments}
                            meta={searchQuery ? 'Filtered results' : 'All appointments'}
                        />
                        <ScheduleSummaryTile
                            label="Awaiting Arrival"
                            value={scheduled.length}
                            meta="Scheduled / confirmed"
                        />
                        <ScheduleSummaryTile
                            label="Waiting Room"
                            value={checkedIn.length}
                            meta="Checked in and ready"
                        />
                        <ScheduleSummaryTile
                            label="Active Consults"
                            value={inConsultation.length}
                            meta="Currently in progress"
                        />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 lg:p-6">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {sections.map((section) => (
                        <ScheduleLane
                            key={section.key}
                            title={section.title}
                            description={section.description}
                            count={appointmentMap[section.key].length}
                            icon={section.icon}
                            tone={section.tone}
                            borderTone={section.borderTone}
                            badgeTone={section.badgeTone}
                            emptyMessage={section.emptyMessage}
                        >
                            {appointmentMap[section.key].map((appointment) => (
                                <FrontdeskAppointmentCard
                                    key={appointment.id}
                                    appointment={mapScheduleAppointmentToDto(appointment)}
                                />
                            ))}
                        </ScheduleLane>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function ScheduleSummaryTile({
    label,
    value,
    meta,
}: {
    label: string;
    value: number;
    meta: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
                    <p className="text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
                    <p className="text-xs text-slate-500">{meta}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300" />
            </div>
        </div>
    );
}

function ScheduleLane({
    title,
    description,
    count,
    icon: Icon,
    tone,
    borderTone,
    badgeTone,
    emptyMessage,
    children,
}: {
    title: string;
    description: string;
    count: number;
    icon: typeof Clock;
    tone: string;
    borderTone: string;
    badgeTone: string;
    emptyMessage: string;
    children: ReactNode;
}) {
    return (
        <section className={cn('overflow-hidden rounded-2xl border bg-slate-50/40', borderTone)}>
            <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-4 py-4 sm:px-5">
                <div className="min-w-0">
                    <div className="flex items-center gap-3">
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tone)}>
                            <Icon className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                            <p className="text-xs text-slate-500">{description}</p>
                        </div>
                    </div>
                </div>
                <Badge variant="outline" className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', badgeTone)}>
                    {count}
                </Badge>
            </div>

            <div className="max-h-[560px] overflow-y-auto p-3 sm:p-4">
                {count === 0 ? (
                    <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 text-center">
                        <p className="text-sm text-slate-500">{emptyMessage}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {children}
                    </div>
                )}
            </div>
        </section>
    );
}
