'use client';

/**
 * Consultation Readiness Indicator
 * 
 * Shows whether a patient consultation is ready to proceed.
 * Displays key readiness factors: intake, photos, medical history, consent.
 * 
 * Clinical workstation design: clear, actionable, no ambiguity.
 */

import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface ConsultationReadiness {
  intakeComplete: boolean;
  photosUploaded: boolean;
  medicalHistoryComplete: boolean;
  consentAcknowledged: boolean;
  assistantBriefPrepared?: boolean;
}

interface ConsultationReadinessIndicatorProps {
  readiness: ConsultationReadiness;
  compact?: boolean;
}

export function ConsultationReadinessIndicator({
  readiness,
  compact = false,
}: ConsultationReadinessIndicatorProps) {
  const allReady =
    readiness.intakeComplete &&
    readiness.photosUploaded &&
    readiness.medicalHistoryComplete &&
    readiness.consentAcknowledged;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {allReady ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Not Ready
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {allReady ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Consultation Ready</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span>Consultation Preparation</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ReadinessItem
          label="Intake Form"
          ready={readiness.intakeComplete}
          required
        />
        <ReadinessItem
          label="Before Photos"
          ready={readiness.photosUploaded}
          required
        />
        <ReadinessItem
          label="Medical History"
          ready={readiness.medicalHistoryComplete}
          required
        />
        <ReadinessItem
          label="Consent Acknowledged"
          ready={readiness.consentAcknowledged}
          required
        />
        {readiness.assistantBriefPrepared !== undefined && (
          <ReadinessItem
            label="Assistant Brief"
            ready={readiness.assistantBriefPrepared}
            required={false}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ReadinessItem({
  label,
  ready,
  required,
}: {
  label: string;
  ready: boolean;
  required: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      {ready ? (
        <div className="flex items-center gap-1 text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Complete</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-amber-700">
          {required ? (
            <>
              <XCircle className="h-3.5 w-3.5" />
              <span>Required</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Pending</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to compute readiness from patient and appointment data
 */
export function computeReadiness(
  patient: {
    medicalHistory?: string | null;
    allergies?: string | null;
    medicalConditions?: string | null;
    privacyConsent?: boolean;
    serviceConsent?: boolean;
    medicalConsent?: boolean;
  },
  appointment: {
    reviewNotes?: string | null;
  },
  photoCount: number = 0,
): ConsultationReadiness {
  // Intake is complete if patient has basic medical info
  const intakeComplete = !!(
    patient.medicalHistory ||
    (patient.allergies !== null && patient.allergies !== undefined) ||
    (patient.medicalConditions !== null && patient.medicalConditions !== undefined)
  );

  // Photos uploaded if count > 0
  const photosUploaded = photoCount > 0;

  // Medical history complete if provided
  const medicalHistoryComplete = !!patient.medicalHistory;

  // Consent acknowledged if all consents are true
  const consentAcknowledged =
    patient.privacyConsent === true &&
    patient.serviceConsent === true &&
    patient.medicalConsent === true;

  // Assistant brief prepared if review notes exist
  const assistantBriefPrepared = !!appointment.reviewNotes;

  return {
    intakeComplete,
    photosUploaded,
    medicalHistoryComplete,
    consentAcknowledged,
    assistantBriefPrepared,
  };
}
