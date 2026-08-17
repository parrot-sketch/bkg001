'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, FileText, Activity, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Procedure, LinkedService } from './steps/types';
import { CaseSetupForm } from './steps/CaseSetupForm';
import { OperativeDetailsForm } from './steps/OperativeDetailsForm';
import { ChargeSheetStepWrapper } from './steps/ChargeSheetStepWrapper';
import { CaseSummary } from './steps/CaseSummary';

export interface SurgicalCasePlanFormProps {
  caseId: string;
  initialData?: {
    surgeonId?: string;
    surgeonIds?: string[];
    assistantSurgeonIds?: string[];
    anesthesiologistUserId?: string;
    scrubNurseUserId?: string;
    circulatingNurseUserId?: string;
    procedureDate?: Date | string | null;
    diagnosis?: string;
    procedureCategory?: string;
    primaryOrRevision?: string;
    procedureIds?: string[];
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
  const [confirmedProcedures, setConfirmedProcedures] = useState<Procedure[]>([]);

  const handleError = (msg: string) => setError(msg);
  const clearError = () => setError(null);

  const goToStep = (n: number) => {
    clearError();
    setCurrentStep(n);
  };

  const suggestedServices = confirmedProcedures
    .flatMap((p) => p.procedure_service_links)
    .filter((l) => l.is_active)
    .reduce<LinkedService[]>((acc, link) => {
      if (!acc.some((s) => s.id === link.id)) acc.push(link);
      return acc;
    }, []);

  const handleFinalize = () => {
    if (isTheaterTech) {
      router.push('/theater-tech/surgical-cases');
    } else {
      router.push(`/doctor/surgical-cases/${caseId}/surgical-notes`);
    }
  };

  const stepConfig = [
    { num: 1, label: 'Case Setup', icon: FileText, description: 'Procedure, team and diagnosis' },
    { num: 2, label: 'Operative Details', icon: Activity, description: 'Anaesthesia and timing' },
    { num: 3, label: 'Charges', icon: Receipt, description: 'Theatre and procedure charges' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
          <div className="px-4 md:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight">
                  Surgical Case Plan
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  {stepConfig[currentStep - 1]?.description}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400">
                  #{caseId.slice(0, 8).toUpperCase()}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  Draft
                </span>
              </div>
            </div>

            {/* Step tabs */}
            <div className="flex items-center gap-1 mt-4">
              {stepConfig.map((step, idx) => {
                const Icon = step.icon;
                const isActive = currentStep === step.num;
                const isCompleted = currentStep > step.num;

                return (
                  <button
                    key={step.num}
                    type="button"
                    onClick={() => goToStep(step.num)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-slate-800 text-white shadow-sm'
                        : isCompleted
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 md:mx-8 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Main content */}
        <div className="p-4 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form column */}
            <div className="lg:col-span-2">
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-0">
              {currentStep === 1 && (
                <CaseSetupForm
                  caseId={caseId}
                  currentStep={currentStep}
                  onComplete={() => goToStep(2)}
                  onError={handleError}
                  onProceduresConfirmed={setConfirmedProcedures}
                  isTheaterTech={isTheaterTech}
                  initialData={
                    initialData
                      ? {
                          surgeonId: initialData.surgeonId ?? '',
                          surgeonIds: initialData.surgeonIds ?? [],
                          assistantSurgeonIds: initialData.assistantSurgeonIds ?? [],
                          anesthesiologistUserId: initialData.anesthesiologistUserId ?? '',
                          scrubNurseUserId: initialData.scrubNurseUserId ?? '',
                          circulatingNurseUserId: initialData.circulatingNurseUserId ?? '',
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
                              totalTheatreMinutes: initialData.totalTheatreMinutes ?? null,
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
                      suggestedServices={suggestedServices.map((s) => ({
                        id: s.id,
                        service_name: s.service_name,
                        price: s.price,
                        category: s.category,
                      }))}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary sidebar */}
            <div className="lg:col-span-1">
              <CaseSummary
                caseId={caseId}
                currentStep={currentStep}
                confirmedProcedures={confirmedProcedures}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
