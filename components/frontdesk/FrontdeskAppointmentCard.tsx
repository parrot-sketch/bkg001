'use client';

/**
 * Frontdesk Appointment Card
 * 
 * High-density row-based layout for frontdesk sessions management.
 * Optimized for professional clinical environments with clear status indicators.
 */

import { CheckCircle, Clock, MoreVertical, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { cn } from '@/lib/utils';

interface FrontdeskAppointmentCardProps {
    appointment: AppointmentResponseDto;
    onCheckIn: (appointment: AppointmentResponseDto) => void;
}

export function FrontdeskAppointmentCard({ appointment, onCheckIn }: FrontdeskAppointmentCardProps) {
    interface StatusConfig {
        bar: string;
        text: string;
        bg: string;
        label: string;
    }

    // Color mapping based on clinical status - mapped to clinical logic
    const statusConfig: Record<AppointmentStatus, StatusConfig> = {
        [AppointmentStatus.PENDING]: {
            bar: 'bg-amber-400',
            text: 'text-amber-700',
            bg: 'bg-amber-50',
            label: 'Inquiry'
        },
        [AppointmentStatus.PENDING_DOCTOR_CONFIRMATION]: {
            bar: 'bg-indigo-400',
            text: 'text-indigo-700',
            bg: 'bg-indigo-50',
            label: 'Awaiting MD'
        },
        [AppointmentStatus.SCHEDULED]: {
            bar: 'bg-emerald-500',
            text: 'text-emerald-700',
            bg: 'bg-emerald-50',
            label: 'Scheduled'
        },
        [AppointmentStatus.CONFIRMED]: {
            bar: 'bg-emerald-600',
            text: 'text-emerald-800',
            bg: 'bg-emerald-100',
            label: 'Confirmed'
        },
        [AppointmentStatus.COMPLETED]: {
            bar: 'bg-blue-500',
            text: 'text-blue-700',
            bg: 'bg-blue-50',
            label: 'Completed'
        },
        [AppointmentStatus.CANCELLED]: {
            bar: 'bg-slate-300',
            text: 'text-slate-600',
            bg: 'bg-slate-50',
            label: 'Cancelled'
        },
        [AppointmentStatus.NO_SHOW]: {
            bar: 'bg-rose-500',
            text: 'text-rose-700',
            bg: 'bg-rose-50',
            label: 'No Show'
        }
    };

    const config = statusConfig[appointment.status as AppointmentStatus] || statusConfig[AppointmentStatus.PENDING];
    const patientName = appointment.patient
        ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
        : appointment.patientId || 'Unknown Patient';

    return (
        <div className="group relative flex items-stretch bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 min-h-[80px]">
            {/* Visual Status Bar */}
            <div className={cn("w-1.5", config.bar)} />

            <div className="flex flex-1 flex-col sm:flex-row sm:items-center p-3 gap-3 sm:gap-6">
                {/* Time Slot Block */}
                <div className="flex flex-row sm:flex-col items-center sm:items-start gap-2 sm:gap-0 sm:min-w-[80px]">
                    <span className="text-lg font-bold text-slate-900 leading-tight">
                        {appointment.time}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 sm:mt-0.5">
                        Check-in Time
                    </span>
                </div>

                {/* Patient & Doctor Info */}
                <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 flex-shrink-0">
                        {appointment.patient?.img ? (
                            <img
                                src={appointment.patient.img}
                                alt={patientName}
                                className="h-full w-full rounded-full object-cover"
                            />
                        ) : (
                            <User className="h-5 w-5 text-slate-400" />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">
                            {patientName}
                        </h4>
                        <div className="flex items-center text-xs text-slate-500 gap-1.5 mt-0.5">
                            <span className="truncate">{appointment.doctor?.name || 'Unassigned Doctor'}</span>
                            <span className="text-slate-300">•</span>
                            <span className="truncate">{appointment.type}</span>
                        </div>
                    </div>
                </div>

                {/* Status Badge & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                    {/* Mobile Label */}
                    <div className="sm:hidden">
                        <Badge variant="outline" className={cn("text-[10px] font-semibold py-0", config.text, config.bg, "border-0")}>
                            {config.label}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                        {appointment.status === AppointmentStatus.PENDING ? (
                            <Button
                                onClick={() => onCheckIn(appointment)}
                                size="sm"
                                className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm transition-all"
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Check In
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 hidden sm:flex">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-xs font-semibold whitespace-nowrap">Checked In</span>
                            </div>
                        )}

                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
