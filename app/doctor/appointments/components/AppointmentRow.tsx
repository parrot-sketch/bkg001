'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, isToday } from 'date-fns';
import { 
    Clock, 
    AlertTriangle, 
    Play, 
    Stethoscope, 
    FileText, 
    ChevronRight 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

// ============================================================================
// STATUS CONFIG - Refined palette
// ============================================================================

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; border: string; sortOrder: number }> = {
    IN_CONSULTATION: { 
        label: 'In Consult', 
        color: 'text-violet-700', 
        bg: 'bg-violet-50', 
        dot: 'bg-violet-500',
        border: 'border-violet-200/60',
        sortOrder: 0 
    },
    CHECKED_IN: { 
        label: 'Checked In', 
        color: 'text-emerald-700', 
        bg: 'bg-emerald-50', 
        dot: 'bg-emerald-500',
        border: 'border-emerald-200/60',
        sortOrder: 1 
    },
    READY_FOR_CONSULTATION: { 
        label: 'Ready', 
        color: 'text-emerald-700', 
        bg: 'bg-emerald-50', 
        dot: 'bg-emerald-500',
        border: 'border-emerald-200/60',
        sortOrder: 2 
    },
    PENDING_DOCTOR_CONFIRMATION: { 
        label: 'Needs Confirm', 
        color: 'text-amber-700', 
        bg: 'bg-amber-50', 
        dot: 'bg-amber-500',
        border: 'border-amber-200/60',
        sortOrder: 3 
    },
    SCHEDULED: { 
        label: 'Scheduled', 
        color: 'text-stone-600', 
        bg: 'bg-stone-50', 
        dot: 'bg-stone-400',
        border: 'border-stone-200/60',
        sortOrder: 4 
    },
    CONFIRMED: { 
        label: 'Confirmed', 
        color: 'text-stone-600', 
        bg: 'bg-stone-50', 
        dot: 'bg-stone-400',
        border: 'border-stone-200/60',
        sortOrder: 5 
    },
    COMPLETED: { 
        label: 'Completed', 
        color: 'text-stone-500', 
        bg: 'bg-stone-50', 
        dot: 'bg-stone-300',
        border: 'border-stone-200/60',
        sortOrder: 6 
    },
    CANCELLED: { 
        label: 'Cancelled', 
        color: 'text-red-600', 
        bg: 'bg-red-50', 
        dot: 'bg-red-400',
        border: 'border-red-200/60',
        sortOrder: 7 
    },
    NO_SHOW: { 
        label: 'No Show', 
        color: 'text-red-600', 
        bg: 'bg-red-50', 
        dot: 'bg-red-400',
        border: 'border-red-200/60',
        sortOrder: 8 
    },
    PENDING: { 
        label: 'Pending', 
        color: 'text-amber-700', 
        bg: 'bg-amber-50', 
        dot: 'bg-amber-500',
        border: 'border-amber-200/60',
        sortOrder: 9 
    },
};

export function getStatusConfig(status: string) {
    return STATUS_CONFIG[status] || { 
        label: status, 
        color: 'text-stone-500', 
        bg: 'bg-stone-50', 
        dot: 'bg-stone-300',
        border: 'border-stone-200/60',
        sortOrder: 99 
    };
}

interface AppointmentRowProps {
    appointment: AppointmentResponseDto;
    onCheckIn: (id: number) => void;
    onStartConsultation: (apt: AppointmentResponseDto) => void;
    onCompleteConsultation: (apt: AppointmentResponseDto) => void;
    showDate?: boolean;
}

export function AppointmentRow({
    appointment,
    onCheckIn,
    onStartConsultation,
    onCompleteConsultation,
    showDate = false,
}: AppointmentRowProps) {
    const router = useRouter();
    const statusCfg = getStatusConfig(appointment.status);

    const patientName = appointment.patient
        ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
        : 'Patient';
    const patientInitials = appointment.patient
        ? `${appointment.patient.firstName?.[0] || ''}${appointment.patient.lastName?.[0] || ''}`.toUpperCase()
        : 'P';

    const canStart =
        appointment.status === AppointmentStatus.CHECKED_IN ||
        appointment.status === AppointmentStatus.READY_FOR_CONSULTATION;
    const isInConsult = appointment.status === AppointmentStatus.IN_CONSULTATION;
    const isCompleted = appointment.status === AppointmentStatus.COMPLETED;
    const needsConfirm = appointment.status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION;

    const isOverdue = useMemo(() => {
        if (!isInConsult) return false;
        const now = new Date();
        const aptDate = new Date(appointment.appointmentDate);
        if (!isToday(aptDate) || !appointment.time) return false;
        const [h, m] = appointment.time.split(':').map(Number);
        const end = new Date(aptDate);
        end.setHours(h, m + 30, 0, 0);
        return now > end;
    }, [appointment, isInConsult]);

    const leftBorderColor = isInConsult
        ? (isOverdue ? 'border-l-amber-400' : 'border-l-violet-400')
        : canStart
            ? 'border-l-emerald-400'
            : needsConfirm
                ? 'border-l-amber-400'
                : 'border-l-stone-200';

    return (
        <div
            className={cn(
                "group flex items-center gap-3 px-3 py-2.5 bg-white transition-all cursor-pointer border-l-[3px]",
                leftBorderColor
            )}
            onClick={() => router.push(`/doctor/appointments/${appointment.id}`)}
        >
            {/* Time Block */}
            <div className="flex-shrink-0 text-center w-12">
                <p className="text-sm font-medium text-stone-900 leading-none">
                    {appointment.time || '--:--'}
                </p>
                {showDate && (
                    <p className="text-[10px] text-stone-400 mt-0.5">
                        {format(new Date(appointment.appointmentDate), 'MMM d')}
                    </p>
                )}
            </div>

            {/* Status Dot */}
            <div className={cn("w-1 h-6 rounded-full flex-shrink-0", statusCfg.dot)} />

            {/* Patient Avatar */}
            <Avatar className="h-8 w-8 rounded-md flex-shrink-0">
                <AvatarImage src={appointment.patient?.img ?? undefined} alt={patientName} />
                <AvatarFallback className="rounded-md bg-stone-100 text-stone-500 text-[10px] font-semibold">
                    {patientInitials}
                </AvatarFallback>
            </Avatar>

            {/* Patient Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800 truncate leading-tight">
                    {patientName}
                </p>
                <p className="text-[11px] text-stone-500 truncate">
                    {appointment.type || 'Consultation'}
                </p>
            </div>

            {/* Status Badge */}
            <Badge
                variant="outline"
                className={cn(
                    "text-[10px] font-medium flex-shrink-0 px-2 py-0.5 border rounded-md",
                    statusCfg.bg,
                    statusCfg.color,
                    statusCfg.border
                )}
            >
                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-60" />
                {statusCfg.label}
            </Badge>

            {/* Overdue indicator */}
            {isOverdue && (
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            )}

            {/* Quick Action */}
            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {isInConsult && (
                    <Button
                        size="sm"
                        className={cn(
                            "h-7 px-2.5 text-[11px] font-medium rounded-md gap-1",
                            isOverdue
                                ? "bg-amber-600 hover:bg-amber-700 text-white"
                                : "bg-violet-600 hover:bg-violet-700 text-white"
                        )}
                        onClick={() => router.push(`/doctor/consultations/session/${appointment.id}`)}
                    >
                        <Play className="h-3 w-3" />
                        Continue
                    </Button>
                )}
                {canStart && (
                    <Button
                        size="sm"
                        className="h-7 px-2.5 text-[11px] font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        onClick={() => onStartConsultation(appointment)}
                    >
                        <Stethoscope className="h-3 w-3" />
                        Start
                    </Button>
                )}
                {needsConfirm && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[11px] font-medium rounded-md border-stone-300 text-stone-700 hover:bg-stone-50 gap-1"
                        onClick={() => router.push(`/doctor/appointments/${appointment.id}`)}
                    >
                        Review
                    </Button>
                )}
                {isCompleted && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-stone-400 hover:text-stone-600"
                        onClick={() => router.push(`/doctor/consultations/session/${appointment.id}`)}
                    >
                        <FileText className="h-3 w-3" />
                    </Button>
                )}
                {!isInConsult && !canStart && !needsConfirm && !isCompleted && (
                    <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-stone-500 transition-colors" />
                )}
            </div>
        </div>
    );
}
