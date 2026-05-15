'use client';

import { useMemo } from 'react';
import { CheckCircle, Clock, Play, Stethoscope, AlertTriangle } from 'lucide-react';
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
}

export function DoctorAppointmentCard({ appointment, onStartConsultation }: DoctorAppointmentCardProps) {
  const router = useRouter();

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

  const isCheckedIn = appointment.status === AppointmentStatus.CHECKED_IN;
  const isReadyForConsultation = appointment.status === AppointmentStatus.READY_FOR_CONSULTATION;
  const isInProgress = appointment.status === AppointmentStatus.IN_CONSULTATION;
  const isCompleted = appointment.status === AppointmentStatus.COMPLETED;

  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : appointment.patientId || 'Patient';

  const getStatusBadge = () => {
    if (isInProgress) {
      return timeStatus.isOverdue ? (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200">
          <AlertTriangle className="h-2.5 w-2.5 mr-1" />
          Overdue
        </Badge>
      ) : (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 border-violet-200">
          In Session
        </Badge>
      );
    }
    if (isReadyForConsultation) {
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200">
          Ready
        </Badge>
      );
    }
    if (isCheckedIn) {
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200">
          Waiting
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600 border-slate-200">
        Scheduled
      </Badge>
    );
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all">
      {/* Left: Date & Patient */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="text-center min-w-[60px]">
          {!timeStatus.isAppointmentToday && (
            <p className="text-[10px] font-semibold text-slate-500 uppercase">
              {format(new Date(appointment.appointmentDate), 'EEE, MMM d')}
            </p>
          )}
          <p className="text-lg font-bold text-slate-900 leading-tight">
            {appointment.time}
          </p>
          <Badge variant="secondary" className="text-[9px] font-semibold uppercase tracking-wider mt-1 bg-slate-100 text-slate-500 border-0 px-1.5 py-0">
            {appointment.type?.split(' ')[0]}
          </Badge>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
            {appointment.patient?.img ? (
              <img
                src={appointment.patient.img}
                alt={patientName}
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-slate-500">
                {patientName.split(' ').map(n => n[0]).join('')}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-slate-900 text-sm truncate">
              {patientName}
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 truncate">{appointment.type}</span>
              {(isCheckedIn || isInProgress) && timeStatus.isAppointmentToday && (
                <span className={cn(
                  "flex h-2 w-2 rounded-full shrink-0",
                  isInProgress ? (timeStatus.isOverdue ? "bg-amber-500" : "bg-violet-500") : "bg-amber-400"
                )} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Status & Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {getStatusBadge()}
        <div className="flex items-center gap-2">
          {isInProgress ? (
            <Button
              onClick={() => router.push(`/doctor/consultations/session/${appointment.id}`)}
              size="sm"
              className="h-8 px-3 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold"
            >
              <Play className="h-3 w-3 mr-1" />
              Continue
            </Button>
          ) : isReadyForConsultation ? (
            <Button
              onClick={() => onStartConsultation?.(appointment)}
              size="sm"
              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              <Stethoscope className="h-3 w-3 mr-1" />
              Start
            </Button>
          ) : isCheckedIn ? (
            <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-100">
              Awaiting
            </Badge>
          ) : (
            <Link href={`/doctor/patients/${appointment.patientId}`}>
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                Records
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
