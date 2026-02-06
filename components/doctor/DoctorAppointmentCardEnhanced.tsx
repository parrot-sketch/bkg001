'use client';

/**
 * Enhanced Doctor Appointment Card
 * 
 * Shows scheduled consultations with:
 * - Patient information
 * - Time-aware status (detects overdue appointments)
 * - Clear action buttons based on workflow state
 * 
 * Simplified workflow actions:
 * - SCHEDULED: "Patient hasn't arrived" (no action)
 * - CHECKED_IN: "Start Consultation" → goes to consultation workspace
 * - IN_CONSULTATION: "Continue" → goes to consultation workspace
 * - Overdue IN_CONSULTATION: Warning + "Continue" to complete
 */

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  User,
  Calendar,
  ChevronRight,
  FileText,
  Stethoscope,
  AlertTriangle,
  Play,
  CheckCircle,
} from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { doctorApi } from '@/lib/api/doctor';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DoctorAppointmentCardEnhancedProps {
  appointment: AppointmentResponseDto;
  onCheckIn?: (appointmentId: number) => void;
  onStartConsultation: (appointment: AppointmentResponseDto) => void;
  onCompleteConsultation?: (appointment: AppointmentResponseDto) => void;
  doctorId: string;
}

export function DoctorAppointmentCardEnhanced({
  appointment,
  onCheckIn,
  onStartConsultation,
  onCompleteConsultation,
  doctorId,
}: DoctorAppointmentCardEnhancedProps) {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientResponseDto | null>(appointment.patient as any || null);
  const [loadingPatient, setLoadingPatient] = useState(!appointment.patient);

  // Load patient information only if not provided in the DTO
  useEffect(() => {
    if (!appointment.patient && appointment.patientId) {
      loadPatientInfo();
    }
  }, [appointment.patientId, appointment.patient]);

  const loadPatientInfo = async () => {
    try {
      setLoadingPatient(true);
      const patientResponse = await doctorApi.getPatient(appointment.patientId);
      if (patientResponse.success && patientResponse.data) {
        setPatient(patientResponse.data);
      }
    } catch (error) {
      console.error('Error loading patient info:', error);
    } finally {
      setLoadingPatient(false);
    }
  };

  // Time-aware status calculation
  const timeStatus = useMemo(() => {
    const now = new Date();
    const appointmentDate = new Date(appointment.appointmentDate);
    const isAppointmentToday = isToday(appointmentDate);
    
    // Parse appointment time (e.g., "09:30")
    let slotEndTime: Date | null = null;
    if (appointment.time && isAppointmentToday) {
      const [hours, minutes] = appointment.time.split(':').map(Number);
      slotEndTime = new Date(appointmentDate);
      slotEndTime.setHours(hours, minutes + 30, 0, 0); // Assume 30-min slot
    }
    
    const isOverdue = slotEndTime ? now > slotEndTime : false;
    const isPastDate = !isAppointmentToday && isPast(appointmentDate);
    
    return { isAppointmentToday, isOverdue, isPastDate, slotEndTime };
  }, [appointment.appointmentDate, appointment.time]);

  // Status-based permissions
  const canCheckIn =
    appointment.status === AppointmentStatus.PENDING ||
    appointment.status === AppointmentStatus.SCHEDULED ||
    appointment.status === AppointmentStatus.CONFIRMED;
  
  const canStartConsultation = 
    appointment.status === AppointmentStatus.CHECKED_IN ||
    appointment.status === AppointmentStatus.READY_FOR_CONSULTATION;
  
  const isInConsultation = appointment.status === AppointmentStatus.IN_CONSULTATION;
  const isCompleted = appointment.status === AppointmentStatus.COMPLETED;

  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : appointment.patientId || 'Patient';

  // Navigate directly to consultation workspace
  const handleGoToConsultation = () => {
    router.push(`/doctor/consultations/${appointment.id}/session`);
  };

  // Status display configuration
  const getStatusDisplay = () => {
    if (isCompleted) {
      return { label: 'Completed', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle };
    }
    if (isInConsultation) {
      if (timeStatus.isOverdue) {
        return { label: 'Overdue', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle };
      }
      return { label: 'In Progress', color: 'bg-violet-100 text-violet-700 border-violet-200', icon: Stethoscope };
    }
    if (canStartConsultation) {
      return { label: 'Ready', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle };
    }
    if (canCheckIn) {
      return { label: 'Waiting', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock };
    }
    return { label: appointment.status, color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock };
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  // Stripe color
  const stripeColor = isInConsultation 
    ? (timeStatus.isOverdue ? 'bg-amber-500' : 'bg-violet-500')
    : canStartConsultation 
      ? 'bg-emerald-500' 
      : isCompleted 
        ? 'bg-blue-500'
        : 'bg-slate-300';

  if (loadingPatient) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex gap-4">
          <Skeleton className="h-14 w-14 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 overflow-hidden">
      {/* Status Stripe */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", stripeColor)} />

      <div className="flex flex-col lg:flex-row">
        {/* Main Content */}
        <div className="flex-1 p-6 pl-8">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 rounded-xl border-2 border-white shadow-md">
                <AvatarImage src={patient?.profileImage} alt={patientName} />
                <AvatarFallback className="rounded-xl bg-slate-100 text-slate-500 font-bold text-lg">
                  {patientName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{patientName}</h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-4 w-4" />
                    {appointment.time}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>{appointment.type}</span>
                </div>
              </div>
            </div>
            
            <Badge className={cn("px-3 py-1.5 font-semibold text-xs border", statusDisplay.color)}>
              <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
              {statusDisplay.label}
            </Badge>
          </div>

          {/* Overdue Warning */}
          {isInConsultation && timeStatus.isOverdue && (
            <div className="flex items-center gap-3 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Consultation running overtime</p>
                <p className="text-xs text-amber-600">Scheduled slot has ended. Complete or continue as needed.</p>
              </div>
            </div>
          )}

          {/* Clinical Notes */}
          {(appointment.note || appointment.reviewNotes) && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              {appointment.note && (
                <div className="mb-3 last:mb-0">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <FileText className="h-3 w-3 inline mr-1" />
                    Notes
                  </p>
                  <p className="text-sm text-slate-700">{appointment.note}</p>
                </div>
              )}
              {appointment.reviewNotes && (
                <div className={appointment.note ? "pt-3 border-t border-slate-200" : ""}>
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
                    <Stethoscope className="h-3 w-3 inline mr-1" />
                    Brief
                  </p>
                  <p className="text-sm text-slate-600 italic">{appointment.reviewNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions Panel */}
        <div className="lg:w-56 p-6 bg-slate-50/50 border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col justify-center gap-3">
          {/* Primary Action */}
          {isInConsultation && (
            <Button
              size="lg"
              onClick={handleGoToConsultation}
              className={cn(
                "w-full h-12 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2",
                timeStatus.isOverdue 
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200"
                  : "bg-violet-600 hover:bg-violet-700 text-white shadow-violet-200"
              )}
            >
              <Play className="h-4 w-4" />
              Continue
            </Button>
          )}

          {canStartConsultation && (
            <Button
              size="lg"
              onClick={() => onStartConsultation(appointment)}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
            >
              <Stethoscope className="h-4 w-4" />
              Start Consultation
            </Button>
          )}

          {canCheckIn && !timeStatus.isPastDate && (
            <div className="text-center py-2">
              <p className="text-xs text-slate-400 font-medium">Patient hasn't arrived</p>
              {onCheckIn && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full h-9 rounded-lg text-xs font-semibold"
                  onClick={() => onCheckIn(appointment.id)}
                >
                  Check In
                </Button>
              )}
            </div>
          )}

          {isCompleted && (
            <div className="text-center py-2">
              <p className="text-xs text-slate-400 font-medium">Consultation completed</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full h-9 rounded-lg text-xs font-semibold"
                onClick={handleGoToConsultation}
              >
                View Session
              </Button>
            </div>
          )}

          {/* Secondary Actions */}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full h-9 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900"
            asChild
          >
            <Link href={`/doctor/patients/${appointment.patientId}`}>
              View Patient Records
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
