'use client';

/**
 * Patient Info Sidebar
 * 
 * Persistent patient context panel - always visible during consultation.
 * Designed for surgeon efficiency: critical patient information at a glance.
 * 
 * Clinical workstation design: minimal, information-dense, no clutter.
 */

import { AlertTriangle, FileText, Calendar, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { PatientConsultationHistoryItemDto } from '@/application/dtos/PatientConsultationHistoryDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { ConsultationReadinessIndicator, computeReadiness } from './ConsultationReadinessIndicator';
import { ClinicalSummary } from './ClinicalSummary';

interface PatientInfoSidebarProps {
  patient: PatientResponseDto;
  appointment?: AppointmentResponseDto | null;
  consultationHistory?: PatientConsultationHistoryItemDto[];
  photoCount?: number;
  onViewFullProfile: () => void;
  onViewCasePlans: () => void;
  onViewPhotos: () => void;
}

export function PatientInfoSidebar({
  patient,
  appointment,
  consultationHistory = [],
  photoCount = 0,
  onViewFullProfile,
  onViewCasePlans,
  onViewPhotos,
}: PatientInfoSidebarProps) {
  // Calculate age
  const age = patient.dateOfBirth
    ? Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  // Compute readiness if appointment provided
  const readiness = appointment
    ? computeReadiness(patient, appointment, photoCount)
    : null;

  return (
    <div className="w-64 space-y-4 overflow-y-auto">
      {/* Clinical Summary - Always at top for surgeon context */}
      {appointment && (
        <ClinicalSummary
          patient={patient}
          appointment={appointment}
          photoCount={photoCount}
          compact={true}
        />
      )}

      {/* Patient Profile Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <span className="text-lg font-medium text-muted-foreground">
                {patient.firstName?.[0]}{patient.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold truncate">
                {patient.firstName} {patient.lastName}
              </CardTitle>
              <div className="text-xs text-muted-foreground mt-0.5">
                {age !== null && `${age} years`} {patient.gender && `• ${patient.gender}`}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {patient.fileNumber && (
            <div className="text-xs text-muted-foreground">
              File: <span className="font-mono">{patient.fileNumber}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medical Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Medical Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Allergies - Prominent if exists */}
          {patient.allergies ? (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-medium text-foreground">Allergies</span>
              </div>
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                {patient.allergies}
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No known allergies</div>
          )}

          {/* Medical Conditions */}
          {patient.medicalConditions && (
            <div>
              <div className="text-xs font-medium text-foreground mb-1">Conditions</div>
              <div className="text-xs text-muted-foreground">{patient.medicalConditions}</div>
            </div>
          )}

          {/* Medical History */}
          {patient.medicalHistory && (
            <div>
              <div className="text-xs font-medium text-foreground mb-1">History</div>
              <div className="text-xs text-muted-foreground line-clamp-3">
                {patient.medicalHistory}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Previous Consultations Card */}
      {consultationHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Previous Consultations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {consultationHistory.slice(0, 3).map((consultation) => (
                <ConsultationHistoryItem
                  key={consultation.id}
                  consultation={consultation}
                />
              ))}
              {consultationHistory.length > 3 && (
                <div className="text-xs text-muted-foreground pt-1">
                  +{consultationHistory.length - 3} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Readiness Indicator - Prominent if not ready */}
      {readiness && !readiness.intakeComplete && !readiness.photosUploaded && !readiness.medicalHistoryComplete && !readiness.consentAcknowledged && (
        <ConsultationReadinessIndicator readiness={readiness} />
      )}

      {/* Quick Links Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-8"
            onClick={onViewFullProfile}
          >
            <FileText className="h-3.5 w-3.5 mr-2" />
            Full Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-8"
            onClick={onViewCasePlans}
          >
            <Calendar className="h-3.5 w-3.5 mr-2" />
            Case Plans
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs h-8"
            onClick={onViewPhotos}
          >
            <LinkIcon className="h-3.5 w-3.5 mr-2" />
            Before/After Photos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Consultation History Item
 * Compact display for previous consultations
 */
function ConsultationHistoryItem({
  consultation,
}: {
  consultation: PatientConsultationHistoryItemDto;
}) {
  return (
    <div className="border rounded p-2 text-xs">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-foreground">
          {format(new Date(consultation.appointmentDate), 'MMM d, yyyy')}
        </span>
        {consultation.outcomeType && (
          <Badge variant="outline" className="text-xs h-4 px-1.5">
            {consultation.outcomeType === 'PROCEDURE_RECOMMENDED' ? 'Procedure' : 'Consultation'}
          </Badge>
        )}
      </div>
      {consultation.notesSummary && (
        <div className="text-muted-foreground line-clamp-2 mt-1">
          {consultation.notesSummary}
        </div>
      )}
      {consultation.photoCount > 0 && (
        <div className="text-muted-foreground mt-1">
          {consultation.photoCount} photo{consultation.photoCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
