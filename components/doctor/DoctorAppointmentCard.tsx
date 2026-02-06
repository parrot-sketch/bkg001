'use client';

/**
 * Doctor Appointment Card
 * 
 * Compact clinical card for dashboard views.
 * Shows appointment with time-aware status and quick actions.
 */

import { useMemo } from 'react';
import {
    CheckCircle,
    Clock,
    User,
    Play,
    Stethoscope,
    AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { cn } from '@/lib/utils';
import { isToday, isPast, format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DoctorAppointmentCardProps {
    appointment: any;
    onStartConsultation?: (appointment: any) => void;
    onEndConsultation?: (appointment: any) => void;
}

export function DoctorAppointmentCard({ appointment, onStartConsultation }: DoctorAppointmentCardProps) {
    const router = useRouter();

    // Time-aware status calculation
    const timeStatus = useMemo(() => {
        const now = new Date();
        const appointmentDate = new Date(appointment.appointmentDate);
        const isAppointmentToday = isToday(appointmentDate);
        
        let slotEndTime: Date | null = null;
        if (appointment.time && isAppointmentToday) {
            const [hours, minutes] = appointment.time.split(':').map(Number);
            slotEndTime = new Date(appointmentDate);
            slotEndTime.setHours(hours, minutes + 30, 0, 0);
        }
        
        const isOverdue = slotEndTime ? now > slotEndTime : false;
        return { isAppointmentToday, isOverdue };
    }, [appointment.appointmentDate, appointment.time]);

    // Patient is checked in when status is CHECKED_IN or READY_FOR_CONSULTATION
    const isCheckedIn = appointment.status === AppointmentStatus.CHECKED_IN ||
        appointment.status === AppointmentStatus.READY_FOR_CONSULTATION;
    
    const isInProgress = appointment.status === AppointmentStatus.IN_CONSULTATION;
    const isCompleted = appointment.status === AppointmentStatus.COMPLETED;

    const patientName = appointment.patient
        ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
        : appointment.patientId || 'Patient';

    // Navigate directly to consultation workspace
    const handleGoToConsultation = () => {
        router.push(`/doctor/consultations/${appointment.id}/session`);
    };

    // Determine stripe and badge colors
    const stripeColor = isInProgress 
        ? (timeStatus.isOverdue ? 'bg-amber-500' : 'bg-violet-500')
        : isCheckedIn 
            ? 'bg-emerald-500' 
            : isCompleted
                ? 'bg-blue-500'
                : 'bg-slate-300';

    const getStatusBadge = () => {
        if (isInProgress) {
            if (timeStatus.isOverdue) {
                return (
                    <Badge className="bg-amber-100/80 text-amber-700 border-amber-200/60 text-[10px] font-medium px-1.5 py-0">
                        <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                        Overdue
                    </Badge>
                );
            }
            return (
                <Badge className="bg-violet-100/80 text-violet-700 border-violet-200/60 text-[10px] font-medium px-1.5 py-0">
                    <Stethoscope className="h-2.5 w-2.5 mr-1" />
                    In Progress
                </Badge>
            );
        }
        if (isCheckedIn) {
            return (
                <Badge className="bg-emerald-100/80 text-emerald-700 border-emerald-200/60 text-[10px] font-medium px-1.5 py-0">
                    <CheckCircle className="h-2.5 w-2.5 mr-1" />
                    Ready
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-slate-400 text-[10px] font-medium px-1.5 py-0">
                <Clock className="h-2.5 w-2.5 mr-1" />
                Waiting
            </Badge>
        );
    };

    return (
        <div className={cn(
            "group relative flex items-stretch bg-white border border-slate-200/80 rounded-lg overflow-hidden hover:shadow transition-all duration-200",
            isCheckedIn && "border-emerald-200/80",
            isInProgress && (timeStatus.isOverdue ? "border-amber-200/80" : "border-violet-200/80")
        )}>
            {/* Visual Status Strip */}
            <div className={cn("w-1 transition-colors", stripeColor)} />

            <div className="flex flex-1 flex-col sm:flex-row sm:items-center p-3 gap-3 sm:gap-4">
                {/* Date, Time & Type Block */}
                <div className="flex flex-row sm:flex-col items-center sm:items-start gap-2 sm:gap-0.5 sm:min-w-[80px]">
                    {/* Show date for future appointments (not today) */}
                    {!timeStatus.isAppointmentToday && (
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                            {format(new Date(appointment.appointmentDate), 'EEE, MMM d')}
                        </span>
                    )}
                    <span className="text-lg font-bold text-slate-900 leading-tight">
                        {appointment.time}
                    </span>
                    <Badge variant="secondary" className="text-[9px] font-semibold uppercase tracking-wider bg-slate-100/80 text-slate-500 border-0 px-1.5 py-0">
                        {appointment.type?.split(' ')[0]}
                    </Badge>
                </div>

                {/* Patient Profile */}
                <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200/80 flex-shrink-0">
                        {appointment.patient?.img ? (
                            <img
                                src={appointment.patient.img}
                                alt={patientName}
                                className="h-full w-full rounded-lg object-cover"
                            />
                        ) : (
                            <User className="h-4 w-4 text-slate-400" />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h4 className="font-semibold text-slate-900 text-sm truncate flex items-center gap-1.5">
                            {patientName}
                            {(isCheckedIn || isInProgress) && timeStatus.isAppointmentToday && (
                                <span className={cn(
                                    "flex h-2 w-2 rounded-full animate-pulse",
                                    isInProgress ? (timeStatus.isOverdue ? "bg-amber-500" : "bg-violet-500") : "bg-emerald-500"
                                )} />
                            )}
                        </h4>
                        <span className="text-xs text-slate-500">{appointment.type}</span>
                    </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3">
                    {/* Status Badge */}
                    <div className="flex flex-col items-end gap-0.5">
                        {getStatusBadge()}
                        {isInProgress && timeStatus.isOverdue && (
                            <span className="text-[9px] text-amber-600 font-medium">
                                Slot time passed
                            </span>
                        )}
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center gap-2">
                        {isInProgress ? (
                            <Button
                                onClick={handleGoToConsultation}
                                size="sm"
                                className={cn(
                                    "h-7 px-3 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5",
                                    timeStatus.isOverdue 
                                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                                        : "bg-violet-600 hover:bg-violet-700 text-white"
                                )}
                            >
                                <Play className="h-3 w-3" />
                                Continue
                            </Button>
                        ) : isCheckedIn ? (
                            <Button
                                onClick={() => onStartConsultation?.(appointment)}
                                size="sm"
                                className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                            >
                                <Stethoscope className="h-3 w-3" />
                                Start
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-3 rounded-lg text-xs font-medium text-slate-600"
                                asChild
                            >
                                <Link href={`/doctor/patients/${appointment.patientId}`}>
                                    Records
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
