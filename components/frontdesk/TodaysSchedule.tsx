import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Calendar, CheckCircle, Clock, Search, MoreVertical,
    User, Filter, ArrowRight, Loader2, Stethoscope, CalendarClock
} from 'lucide-react';
import { CheckInDialog } from './CheckInDialog';
import { useTodaysSchedule } from '@/hooks/frontdesk/useTodaysSchedule';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { format, isAfter, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { AppointmentStatus, canCheckIn } from '@/domain/enums/AppointmentStatus';

/**
 * Check if an appointment can be checked in (status AND date validation)
 */
function canCheckInAppointment(appointment: AppointmentResponseDto): {
    canCheckIn: boolean;
    reason?: string;
    daysUntil?: number;
} {
    // First check status
    if (!canCheckIn(appointment.status as AppointmentStatus)) {
        return {
            canCheckIn: false,
            reason: appointment.status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION
                ? 'Awaiting doctor confirmation'
                : 'Appointment not confirmed',
        };
    }

    // Then check date - prevent checking in for future appointments
    const now = new Date();
    const appointmentDate = new Date(appointment.appointmentDate);
    const appointmentDateOnly = startOfDay(appointmentDate);
    const todayOnly = startOfDay(now);

    if (isAfter(appointmentDateOnly, todayOnly)) {
        const daysUntil = Math.ceil((appointmentDateOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24));
        return {
            canCheckIn: false,
            reason: `Appointment is scheduled for ${format(appointmentDate, 'MMM d, yyyy')} (${daysUntil} day${daysUntil !== 1 ? 's' : ''} away). Please check in on or after the appointment date.`,
            daysUntil,
        };
    }

    return { canCheckIn: true };
}

export function TodaysSchedule() {
    const { data: schedule, isLoading, error } = useTodaysSchedule();
    const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponseDto | null>(null);
    const [isCheckInOpen, setIsCheckInOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleCheckInClick = (appointment: AppointmentResponseDto) => {
        // Double-check before opening dialog
        const checkInStatus = canCheckInAppointment(appointment);
        if (!checkInStatus.canCheckIn) {
            // This shouldn't happen if UI is correct, but safety check
            return;
        }
        setSelectedAppointment(appointment);
        setIsCheckInOpen(true);
    };

    if (isLoading) {
        return (
            <Card className="h-full min-h-[400px] flex items-center justify-center border-slate-200 shadow-sm">
                <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
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

    // Combine lists for searching if needed, or keep sections.
    // Let's filter the sections based on search query
    const filterAppointments = (list: AppointmentResponseDto[] = []) => {
        if (!searchQuery) return list;
        const lowerQuery = searchQuery.toLowerCase();
        return list.filter(apt =>
            apt.patient?.firstName.toLowerCase().includes(lowerQuery) ||
            apt.patient?.lastName.toLowerCase().includes(lowerQuery) ||
            apt.doctor?.name.toLowerCase().includes(lowerQuery)
        );
    };

    const scheduled = filterAppointments(schedule?.scheduled);
    const checkedIn = filterAppointments(schedule?.checkedIn);
    const inConsultation = filterAppointments(schedule?.inConsultation);
    const completed = filterAppointments(schedule?.completed);

    return (
        <>
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-2xl">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-indigo-600" />
                                Today's Schedule
                            </CardTitle>
                            <p className="text-sm text-slate-500 mt-1">
                                Manage appointment flow and patient check-ins
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search patient or doctor..."
                                    className="pl-9 w-full sm:w-[250px] bg-white border-slate-200 focus:border-indigo-500 rounded-xl"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="icon" className="shrink-0 rounded-xl border-slate-200 text-slate-600">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                        {/* Scheduled Section */}
                        <Section
                            title="Scheduled / Arriving"
                            count={scheduled.length}
                            color="blue"
                            icon={Clock}
                            emptyMessage="No scheduled appointments pending arrival."
                        >
                            {scheduled.map(apt => {
                                const checkInStatus = canCheckInAppointment(apt);
                                return (
                                    <AppointmentRow
                                        key={apt.id}
                                        appointment={apt}
                                        action={
                                            checkInStatus.canCheckIn ? (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleCheckInClick(apt)}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm shadow-indigo-200"
                                                >
                                                    Check In
                                                </Button>
                                            ) : (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span>
                                                                <Button
                                                                    size="sm"
                                                                    disabled
                                                                    className="bg-slate-300 text-slate-500 font-semibold rounded-lg cursor-not-allowed"
                                                                >
                                                                    <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
                                                                    Check In
                                                                </Button>
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="max-w-xs">
                                                            <p className="text-xs font-medium">{checkInStatus.reason}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )
                                        }
                                    />
                                );
                            })}
                        </Section>

                        {/* Checked In Section */}
                        <Section
                            title="Waiting Room"
                            count={checkedIn.length}
                            color="amber"
                            icon={User}
                            emptyMessage="Waiting room is empty."
                        >
                            {checkedIn.map(apt => (
                                <AppointmentRow
                                    key={apt.id}
                                    appointment={apt}
                                    statusBadge={<Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">Waiting</Badge>}
                                />
                            ))}
                        </Section>

                        {/* In Consultation Section */}
                        <Section
                            title="In Consultation"
                            count={inConsultation.length}
                            color="emerald"
                            icon={Stethoscope}
                            emptyMessage="No active consultations."
                        >
                            {inConsultation.map(apt => (
                                <AppointmentRow
                                    key={apt.id}
                                    appointment={apt}
                                    statusBadge={<Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 animate-pulse">In Progress</Badge>}
                                />
                            ))}
                        </Section>

                        {/* Completed Section (Optional/Collapsible could be better, but showing simple list for now) */}
                        {completed.length > 0 && (
                            <Section
                                title="Completed Today"
                                count={completed.length}
                                color="slate"
                                icon={CheckCircle}
                            >
                                {completed.map(apt => (
                                    <AppointmentRow
                                        key={apt.id}
                                        appointment={apt}
                                        isCompleted
                                        statusBadge={<Badge variant="outline" className="text-slate-500 border-slate-200">Completed</Badge>}
                                    />
                                ))}
                            </Section>
                        )}
                    </div>
                </CardContent>
            </Card>

            <CheckInDialog
                open={isCheckInOpen}
                onOpenChange={setIsCheckInOpen}
                appointment={selectedAppointment}
            />
        </>
    );
}

// Sub-components for cleaner code

function Section({ title, count, children, color, icon: Icon, emptyMessage }: any) {
    const colorMap: any = {
        blue: "text-blue-600 bg-blue-50",
        amber: "text-amber-600 bg-amber-50",
        emerald: "text-emerald-600 bg-emerald-50",
        slate: "text-slate-600 bg-slate-50",
    };

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className={cn("p-2 rounded-lg", colorMap[color])}>
                    <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h3>
                <Badge variant="secondary" className="ml-auto font-bold bg-slate-100 text-slate-600">{count}</Badge>
            </div>

            {count === 0 && emptyMessage ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-400">{emptyMessage}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {children}
                </div>
            )}
        </div>
    );
}

function AppointmentRow({ appointment, action, statusBadge, isCompleted }: { appointment: AppointmentResponseDto, action?: React.ReactNode, statusBadge?: React.ReactNode, isCompleted?: boolean }) {
    const patientName = appointment.patient
        ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
        : 'Unknown Patient';
    const initials = patientName.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const fileNumber = appointment.patient?.fileNumber;
    const doctorName = appointment.doctor?.name || 'Unknown Doctor';
    const reason = (appointment as any).reason as string | undefined;

    return (
        <div className={cn(
            "flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md hover:border-indigo-100 group",
            isCompleted && "opacity-75 bg-slate-50/50"
        )}>
            <div className="flex items-center gap-4">
                {/* Local initials avatar — no external API call */}
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 bg-gradient-to-br from-slate-500 to-slate-700 border border-slate-100">
                    {initials}
                </div>

                <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors flex items-center gap-2">
                        {patientName}
                        {fileNumber && (
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                #{fileNumber}
                            </span>
                        )}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {appointment.time}
                        </span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {doctorName}
                        </span>
                        {reason && (
                            <>
                                <span className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block" />
                                <span className="hidden sm:block truncate max-w-[140px] text-slate-400">{reason}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
                {statusBadge}
                {action}
                {!action && !statusBadge && (
                    <Button variant="ghost" size="icon" className="text-slate-400">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
