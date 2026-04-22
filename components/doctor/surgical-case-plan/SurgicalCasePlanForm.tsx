'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Procedure, LinkedService } from './steps/types';
import { StepIndicator } from './steps/StepIndicator';
import { CaseIdentificationForm } from './steps/CaseIdentificationForm';
import { OperativeDetailsForm } from './steps/OperativeDetailsForm';
import { ChargeSheetStepWrapper } from './steps/ChargeSheetStepWrapper';

// ─────────────────────────────────────────────────────────────────────────────
// Root export
// ─────────────────────────────────────────────────────────────────────────────

export interface SurgicalCasePlanFormProps {
  caseId: string;
  initialData?: {
    surgeonId?: string;
    surgeonIds?: string[];
    procedureDate?: Date | string | null;
    diagnosis?: string;
    procedureCategory?: string;
    primaryOrRevision?: string;
    procedureIds?: string[];
    // Step 2 fields
    anaesthesiaType?: string;
    skinToSkinMinutes?: number | null;
    totalTheatreMinutes?: number | null;
    admissionType?: string;
  };
  isTheaterTech?: boolean;
}

export function SurgicalCasePlanForm({
  caseId,
  initialData,
  isTheaterTech = false,
}: SurgicalCasePlanFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  // Collect selected procedure objects after Step 1 saves, so Step 3 can
  // derive which services to pre-populate on the charge sheet.
  const [confirmedProcedures, setConfirmedProcedures] = useState<Procedure[]>([]);

  const handleError = (msg: string) => setError(msg);
  const clearError = () => setError(null);

  const goToStep = (n: number) => {
    clearError();
    setCurrentStep(n);
  };

  // Flatten linked services from confirmed procedures for the charge sheet
  const suggestedServices = confirmedProcedures
    .flatMap((p) => p.procedure_service_links)
    .filter((l) => l.is_active)
    // Deduplicate by service id
    .reduce<LinkedService[]>((acc, link) => {
      if (!acc.some((s) => s.id === link.id)) acc.push(link);
      return acc;
    }, []);

  const handleFinalize = () => {
    if (isTheaterTech) {
      router.push('/theater-tech/surgical-cases');
    } else {
      // Direct navigation to the next logical clinical step
      router.push(`/doctor/surgical-cases/${caseId}?tab=surgical-notes`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-0">
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="text-center mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-slate-900">
              Surgical Case Plan
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              {currentStep === 1 && 'Case identification and procedures'}
              {currentStep === 2 && 'Operative and anaesthesia details'}
              {currentStep === 3 && 'Add charges to the case'}
            </p>
          </div>

          <StepIndicator currentStep={currentStep} />

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {currentStep === 1 && (
            <CaseIdentificationForm
              caseId={caseId}
              onComplete={() => goToStep(2)}
              onError={handleError}
              onProceduresConfirmed={setConfirmedProcedures}
              initialData={
                initialData
                  ? {
                      surgeonId: initialData.surgeonId ?? '',
                      surgeonIds: initialData.surgeonIds ?? [],
                      procedureDate: initialData.procedureDate
                        ? new Date(initialData.procedureDate)
                        : null,
                      diagnosis: initialData.diagnosis ?? '',
                      procedureCategory: initialData.procedureCategory ?? '',
                      primaryOrRevision: initialData.primaryOrRevision ?? '',
                      procedureIds: initialData.procedureIds ?? [],
                    }
                  : undefined
              }
            />
          )}

          {currentStep === 2 && (
            <OperativeDetailsForm
              caseId={caseId}
              onComplete={() => goToStep(3)}
              onError={handleError}
              onBack={() => goToStep(1)}
              initialData={
                initialData
                  ? {
                      anaesthesiaType: initialData.anaesthesiaType ?? '',
                      skinToSkinMinutes: initialData.skinToSkinMinutes ?? null,
                      totalTheatreMinutes:
                        initialData.totalTheatreMinutes ?? null,
                      admissionType: initialData.admissionType ?? '',
                    }
                  : undefined
              }
            />
          )}

          {currentStep === 3 && (
            <ChargeSheetStepWrapper
              caseId={caseId}
              onBack={() => goToStep(2)}
              onFinalize={handleFinalize}
              finishLabel={isTheaterTech ? 'Finish Planning' : 'Finish'}
              suggestedServices={
                suggestedServices.map((s) => ({
                  id: s.id,
                  service_name: s.service_name,
                  price: s.price,
                }))
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
