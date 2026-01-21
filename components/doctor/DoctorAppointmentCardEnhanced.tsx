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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CheckCircle, FileText, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { doctorApi } from '@/lib/api/doctor';
import { ConsultationReadinessIndicator, computeReadiness, type ConsultationReadiness } from '@/components/consultation/ConsultationReadinessIndicator';
import { ClinicalSummary } from '@/components/consultation/ClinicalSummary';

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
  const [patient, setPatient] = useState<PatientResponseDto | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [photoCount, setPhotoCount] = useState(0);

  // Load patient information
  useEffect(() => {
    if (appointment.patientId) {
      loadPatientInfo();
    }
  }, [appointment.patientId]);

  const loadPatientInfo = async () => {
    try {
      setLoadingPatient(true);
      const patientResponse = await doctorApi.getPatient(appointment.patientId);
      if (patientResponse.success && patientResponse.data) {
        setPatient(patientResponse.data);
        // TODO: Load photo count from API
        // For now, assume 0 if not available
        setPhotoCount(0);
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

  // Extract primary concern
  const primaryConcern = appointment.note
    ? appointment.note.length > 100
      ? appointment.note.substring(0, 100) + '...'
      : appointment.note
    : appointment.type || 'Consultation';

  return (
    <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header: Date, Time, Status */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg">
                  {format(new Date(appointment.appointmentDate), 'EEEE, MMMM d, yyyy')}
                </p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {appointment.time}
                  </span>
                  <span>•</span>
                  <span>{appointment.type}</span>
                </div>
              </div>
            </div>
            <Badge
              variant={appointment.status === AppointmentStatus.SCHEDULED ? 'default' : 'outline'}
              className={
                appointment.status === AppointmentStatus.SCHEDULED
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : ''
              }
            >
              {appointment.status}
            </Badge>
          </div>

          {/* Patient Information */}
          <div className="border-t pt-4">
            {loadingPatient ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                <span>Loading patient information...</span>
              </div>
            ) : patient ? (
              <div className="space-y-3">
                {/* Patient Name */}
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {patient.firstName} {patient.lastName}
                  </span>
                  {patient.fileNumber && (
                    <span className="text-xs text-muted-foreground">
                      (File: {patient.fileNumber})
                    </span>
                  )}
                </div>

                {/* Primary Concern / Clinical Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-foreground">Primary Concern</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">{primaryConcern}</p>
                </div>

                {/* Assistant Brief (if available) */}
                {appointment.reviewNotes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-semibold text-foreground">Assistant Brief</span>
                      </div>
                      {appointment.reviewedBy && (
                        <span className="text-xs text-muted-foreground">
                          Prepared by Assistant
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground ml-6 line-clamp-3">
                      {appointment.reviewNotes}
                    </p>
                    {appointment.reviewedAt && (
                      <p className="text-xs text-muted-foreground ml-6 mt-1">
                        {format(new Date(appointment.reviewedAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                )}

                {/* Readiness Indicator */}
                {readiness && (
                  <div>
                    <ConsultationReadinessIndicator readiness={readiness} compact />
                    {!isReady && (
                      <p className="text-xs text-amber-700 mt-2">
                        ⚠️ Patient file not fully prepared. Review missing items before consultation.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Patient ID: {appointment.patientId}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t">
            {canCheckIn && onCheckIn && (
              <Button variant="outline" size="sm" onClick={() => onCheckIn(appointment.id)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Check In
              </Button>
            )}
            {canStartConsultation && (
              <Button
                size="sm"
                onClick={() => onStartConsultation(appointment)}
                className={isReady ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}
                title={!isReady ? 'Patient file not fully prepared. Review readiness indicators above.' : ''}
              >
                <FileText className="mr-2 h-4 w-4" />
                {isReady ? 'Begin Consultation' : 'Begin Consultation (Review File First)'}
              </Button>
            )}
            {canCompleteConsultation && onCompleteConsultation && (
              <Button size="sm" onClick={() => onCompleteConsultation(appointment)}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete Consultation
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
