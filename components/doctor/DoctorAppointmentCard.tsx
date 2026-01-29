'use client';

/**
 * Doctor Appointment Card
 * 
 * Specialized clinical view for surgeons.
 * Optimized for high-density information including check-in status,
 * patient details, and quick clinical actions.
 */

import { useState } from 'react';
import {
    CheckCircle,
    Clock,
    MoreVertical,
    User,
    ExternalLink,
    FileText,
    Activity,
    ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { cn } from '@/lib/utils';
import { format, isToday } from 'date-fns';
import Link from 'next/link';

interface DoctorAppointmentCardProps {
    appointment: AppointmentResponseDto;
    onStartConsultation?: (appointment: AppointmentResponseDto) => void;
}

export function DoctorAppointmentCard({ appointment, onStartConsultation }: DoctorAppointmentCardProps) {
    const isCheckedIn = appointment.status === AppointmentStatus.SCHEDULED ||
        appointment.status === AppointmentStatus.CONFIRMED;

    // Check if it's a today's appointment for the pulsing indicator
    const isForToday = isToday(new Date(appointment.appointmentDate));

    const patientName = appointment.patient
        ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
        : appointment.patientId || 'Patient';

    return (
        <div className={cn(
            "group relative flex items-stretch bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 min-h-[90px]",
            isCheckedIn && "border-emerald-200 bg-emerald-50/10"
        )}>
            {/* Visual Status Strip */}
            <div className={cn(
                "w-1.5 transition-colors",
                isCheckedIn ? "bg-emerald-500" : "bg-slate-300"
            )} />

            <div className="flex flex-1 flex-col xl:flex-row xl:items-center p-6 gap-6 xl:gap-8">
                {/* Time & Type Block */}
                <div className="flex flex-row xl:flex-col items-center xl:items-start gap-4 xl:gap-0 xl:min-w-[110px]">
                    <span className="text-2xl font-black text-slate-900 leading-tight">
                        {appointment.time}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest xl:mt-1.5 bg-slate-100 text-slate-500 border-0">
                        {appointment.type.split(' ')[0]}
                    </Badge>
                </div>

                {/* Patient Profile */}
                <div className="flex-1 flex items-center gap-5 min-w-0">
                    <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200 flex-shrink-0 transition-transform group-hover:scale-105 duration-300">
                        {appointment.patient?.img ? (
                            <img
                                src={appointment.patient.img}
                                alt={patientName}
                                className="h-full w-full rounded-full object-cover"
                            />
                        ) : (
                            <User className="h-6 w-6 text-slate-400" />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h4 className="font-extrabold text-slate-900 text-xl tracking-tight truncate flex items-center gap-3">
                            {patientName}
                            {isCheckedIn && isForToday && (
                                <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" title="Arrived" />
                            )}
                        </h4>
                        <div className="flex items-center text-sm text-slate-500 gap-4 mt-1.5 font-medium">
                            <span className="flex items-center gap-1.5">
                                <Activity className="h-4 w-4 text-slate-400" />
                                {appointment.type}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="flex items-center gap-1.5 text-slate-600">
                                <FileText className="h-4 w-4 text-slate-400" />
                                No Vitals Registered
                            </span>
                        </div>
                    </div>
                </div>

                {/* Status Indicator & Action */}
                <div className="flex items-center justify-between xl:justify-end gap-8 mt-4 xl:mt-0 pt-5 xl:pt-0 border-t xl:border-0 border-slate-100">
                    {/* Status Label */}
                    <div className="flex flex-col items-end">
                        {isCheckedIn ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-4 py-1.5 font-black text-[11px] uppercase tracking-widest flex items-center gap-2 rounded-lg">
                                <CheckCircle className="h-4 w-4" />
                                ARRIVED
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 px-4 py-1.5 font-black text-[11px] uppercase tracking-widest flex items-center gap-2 bg-transparent rounded-lg">
                                <Clock className="h-4 w-4" />
                                WAITING
                            </Badge>
                        )}
                        <span className="text-[10px] text-slate-400 mt-1.5 uppercase font-black tracking-tighter">Workflow Status</span>
                    </div>

                    <div className="flex items-center gap-3">
                        {isCheckedIn ? (
                            <Button
                                onClick={() => onStartConsultation?.(appointment)}
                                size="sm"
                                className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-200/50 font-black uppercase tracking-wider text-xs flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95"
                            >
                                Start Session
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-12 px-6 text-slate-700 border-slate-200 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
                                asChild
                            >
                                <Link href={`/doctor/patients/${appointment.patientId}`}>
                                    View Records
                                </Link>
                            </Button>
                        )}

                        <Button variant="ghost" size="icon" className="h-12 w-12 text-slate-300 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                            <MoreVertical className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
