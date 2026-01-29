'use client';

/**
 * Enhanced Doctor Appointment Card
 * 
 * Shows scheduled consultations with:
 * - Patient information (name, not just ID)
 * - Consultation readiness indicators
 * - Clinical summary (primary concern, assistant brief)
 * - Quick actions to start consultation
 * 
 * Designed for surgeon efficiency: see everything needed before consultation.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  User,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { doctorApi } from '@/lib/api/doctor';
import { ConsultationReadinessIndicator, computeReadiness, type ConsultationReadiness } from '@/components/consultation/ConsultationReadinessIndicator';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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
  const [photoCount, setPhotoCount] = useState(0);

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

  const canCheckIn =
    appointment.status === AppointmentStatus.PENDING ||
    appointment.status === AppointmentStatus.SCHEDULED;
  const canStartConsultation = appointment.status === AppointmentStatus.SCHEDULED;
  const canCompleteConsultation =
    appointment.status === AppointmentStatus.SCHEDULED && appointment.note;

  // Compute readiness if patient loaded
  const readiness: ConsultationReadiness | null = patient
    ? computeReadiness(patient, appointment, photoCount)
    : null;

  const isReady = readiness
    ? readiness.intakeComplete &&
    readiness.photosUploaded &&
    readiness.medicalHistoryComplete &&
    readiness.consentAcknowledged
    : false;

  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : appointment.patientId || 'Patient';

  return (
    <div className="group relative border border-slate-200 rounded-2xl bg-white overflow-hidden transition-all duration-300 hover:border-slate-400 hover:shadow-xl hover:shadow-slate-100">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col xl:flex-row gap-6">

          {/* 1. Primary Patient Info Block */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200 flex-shrink-0 transition-transform group-hover:scale-105 duration-300 overflow-hidden">
                {patient?.profileImage ? (
                  <img src={patient.profileImage} alt={patientName} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-7 w-7 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight truncate leading-none mb-1.5 pt-1">
                  {patientName}
                </h3>
                <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    <span className="text-slate-900">{appointment.time}</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1.5 uppercase tracking-widest text-[10px] text-slate-400 font-black">
                    {appointment.type}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Unified Clinical Briefing */}
            <div className="space-y-4 pt-1">
              {appointment.note && (
                <div className="relative pl-5 py-0.5">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/20 rounded-full" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 block mb-0.5 text-opacity-70">Case History</span>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {appointment.note}
                  </p>
                </div>
              )}

              {appointment.reviewNotes && (
                <div className="relative pl-5 py-0.5">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500/20 rounded-full" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 block mb-0.5 text-opacity-70">Clinical Brief</span>
                  <p className="text-sm text-slate-600 italic leading-relaxed">
                    {appointment.reviewNotes}
                  </p>
                </div>
              )}

              {/* Readiness Row */}
              {readiness && (
                <div className="pt-2 flex items-center gap-4 border-t border-slate-100 mt-4">
                  <ConsultationReadinessIndicator readiness={readiness} compact />
                </div>
              )}
            </div>
          </div>

          {/* 3. Action Sidebar Block - Simplified */}
          <div className="xl:w-56 flex flex-row xl:flex-col justify-between xl:justify-center gap-4 pt-4 xl:pt-1 xl:pl-6 xl:border-l border-slate-100 mt-4 xl:mt-0">
            <div className="space-y-4 w-full">
              <div className="flex flex-col items-start xl:items-center">
                <Badge
                  variant="outline"
                  className={cn(
                    "h-6 px-3 font-bold text-[10px] uppercase tracking-widest rounded-full border-slate-200 text-slate-400",
                    appointment.status === AppointmentStatus.SCHEDULED && "border-emerald-200 text-emerald-600 bg-emerald-50/30"
                  )}
                >
                  {appointment.status}
                </Badge>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {canStartConsultation && (
                  <Button
                    size="lg"
                    className="h-12 w-full rounded-xl font-black uppercase tracking-wider text-sm bg-slate-900 hover:bg-slate-800 text-white shadow-lg transition-all active:scale-[0.98]"
                    onClick={() => onStartConsultation(appointment)}
                  >
                    CONSULT
                  </Button>
                )}

                {canCompleteConsultation && onCompleteConsultation && (
                  <Button
                    size="lg"
                    className="h-12 w-full rounded-xl font-black uppercase tracking-wider text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                    onClick={() => onCompleteConsultation(appointment)}
                  >
                    COMPLETE
                  </Button>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-9 flex-1 border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-slate-50"
                    asChild
                  >
                    <Link href={`/doctor/patients/${appointment.patientId}`}>
                      Records
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
