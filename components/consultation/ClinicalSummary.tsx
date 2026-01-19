'use client';

/**
 * Clinical Summary
 * 
 * One-glance consultation brief for surgeon.
 * Shows primary concern, patient context, assistant-prepared brief, and readiness.
 * 
 * Clinical workstation design: information-dense, zero cognitive overhead.
 */

import { FileText, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { ConsultationReadinessIndicator, computeReadiness } from './ConsultationReadinessIndicator';

interface ClinicalSummaryProps {
  patient: PatientResponseDto;
  appointment: AppointmentResponseDto;
  photoCount?: number;
  compact?: boolean;
}

export function ClinicalSummary({
  patient,
  appointment,
  photoCount = 0,
  compact = false,
}: ClinicalSummaryProps) {
  const readiness = computeReadiness(patient, appointment, photoCount);

  // Extract primary concern from appointment note or type
  const primaryConcern = appointment.note
    ? extractPrimaryConcern(appointment.note)
    : appointment.type || 'Consultation';

  // Determine if this is first-time patient
  const isFirstTime = !appointment.note && !patient.medicalHistory;

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Primary Concern</p>
            <p className="text-xs text-muted-foreground mt-0.5">{primaryConcern}</p>
          </div>
        </div>
        {appointment.reviewNotes && (
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Assistant Notes</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {appointment.reviewNotes}
              </p>
            </div>
          </div>
        )}
        <ConsultationReadinessIndicator readiness={readiness} compact />
      </div>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardContent className="pt-6 space-y-4">
        {/* Primary Concern */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-foreground">Primary Concern</span>
          </div>
          <p className="text-sm text-muted-foreground ml-6">{primaryConcern}</p>
        </div>

        {/* Patient Context */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <User className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-foreground">Patient Context</span>
          </div>
          <div className="ml-6 space-y-1">
            {isFirstTime && (
              <Badge variant="outline" className="text-xs">
                First-time patient
              </Badge>
            )}
            {photoCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {photoCount} photo{photoCount !== 1 ? 's' : ''} uploaded
              </Badge>
            )}
            {!isFirstTime && !photoCount && (
              <span className="text-xs text-muted-foreground">Returning patient</span>
            )}
          </div>
        </div>

        {/* Assistant-Prepared Brief */}
        {appointment.reviewNotes && (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-foreground">Assistant Brief</span>
            </div>
            <div className="ml-6 text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded px-3 py-2">
              {appointment.reviewNotes}
            </div>
          </div>
        )}

        {/* Readiness Status */}
        <div>
          <ConsultationReadinessIndicator readiness={readiness} />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Extract primary concern from appointment note
 * Simple heuristic: take first sentence or first 100 characters
 */
function extractPrimaryConcern(note: string): string {
  // Try to extract first sentence
  const firstSentence = note.split(/[.!?]/)[0].trim();
  if (firstSentence.length > 0 && firstSentence.length < 150) {
    return firstSentence;
  }

  // Otherwise take first 100 characters
  return note.length > 100 ? note.substring(0, 100) + '...' : note;
}
