'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  User,
  Activity,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChargeSheetStep } from '@/components/theater-tech/ChargeSheetStep';

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

interface StepProps {
  caseId: string;
  onComplete: () => void;
  onError: (error: string) => void;
}

interface Surgeon {
  id: string;
  name: string;
  specialization: string;
}

interface Procedure {
  id: string;
  name: string;
  category: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step indicator (3 steps)
// ─────────────────────────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: 'Case ID', icon: User },
    { num: 2, label: 'Operative', icon: Activity },
    { num: 3, label: 'Charges', icon: Receipt },
  ];

  return (
    <div className="flex items-center justify-center gap-1 md:gap-2 mb-6 md:mb-8">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isActive = currentStep === step.num;
        const isCompleted = currentStep > step.num;

        return (
          <div key={step.num} className="flex items-center">
            {idx > 0 && (
              <div
                className={cn(
                  'w-8 md:w-12 h-0.5 mx-1 md:mx-2',
                  isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                )}
              />
            )}
            <div
              className={cn(
                'flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-full transition-colors',
                isActive && 'bg-slate-800 text-white',
                isCompleted && 'bg-emerald-100 text-emerald-700',
                !isActive && !isCompleted && 'bg-slate-100 text-slate-500'
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className="text-xs md:text-sm font-medium">{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Case Identification
// ─────────────────────────────────────────────────────────────────────────────

interface CaseIdentificationFormProps extends StepProps {
  initialData?: {
    procedureDate: Date | null;
    surgeonId: string;
    surgeonIds?: string[];
    diagnosis: string;
    procedureCategory: string;
    primaryOrRevision: string;
    procedureIds: string[];
  };
  /** Called with the resolved procedure objects after a successful save */
  onProceduresResolved: (procedures: Procedure[]) => void;
}

function CaseIdentificationForm({
  caseId,
  onComplete,
  onError,
  initialData,
  onProceduresResolved,
}: CaseIdentificationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [surgeons, setSurgeons] = useState<Surgeon[]>([]);
  const [isLoadingSurgeons, setIsLoadingSurgeons] = useState(true);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(false);

  const [formData, setFormData] = useState({
    procedureDate:
      initialData?.procedureDate?.toISOString().split('T')[0] ?? '',
    surgeonIds: initialData?.surgeonIds ?? ([] as string[]),
    surgeonId: initialData?.surgeonId ?? '',
    diagnosis: initialData?.diagnosis ?? '',
    procedureCategory: initialData?.procedureCategory ?? '',
    primaryOrRevision: initialData?.primaryOrRevision ?? '',
    procedureIds: initialData?.procedureIds ?? ([] as string[]),
  });

  // Fetch surgeons once
  useEffect(() => {
    fetch('/api/doctor/surgical-cases/surgeons')
      .then((r) => r.json())
      .then((d) => setSurgeons(d.surgeons ?? []))
      .catch((err) => console.error('Error fetching surgeons:', err))
      .finally(() => setIsLoadingSurgeons(false));
  }, []);

  // Fetch procedures when category is available on mount or changes
  const fetchProcedures = useCallback(
    async (category: string) => {
      if (!category) return;
      setIsLoadingProcedures(true);
      try {
        const res = await fetch(
          `/api/doctor/surgical-cases/${caseId}/procedures?category=${category}`
        );
        const data = await res.json();
        setProcedures(data.procedures ?? []);
      } catch (err) {
        console.error('Error fetching procedures:', err);
      } finally {
        setIsLoadingProcedures(false);
      }
    },
    [caseId]
  );

  useEffect(() => {
    if (formData.procedureCategory) {
      fetchProcedures(formData.procedureCategory);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      procedureCategory: value,
      procedureIds: [],
    }));
    fetchProcedures(value);
  };

  const toggleProcedure = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      procedureIds: prev.procedureIds.includes(id)
        ? prev.procedureIds.filter((pid) => pid !== id)
        : [...prev.procedureIds, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/doctor/surgical-cases/${caseId}/plan/page1`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            procedureDate: formData.procedureDate,
            surgeonId: formData.surgeonIds[0] ?? formData.surgeonId,
            surgeonIds: formData.surgeonIds,
            diagnosis: formData.diagnosis,
            procedureCategory: formData.procedureCategory,
            primaryOrRevision: formData.primaryOrRevision,
            procedureIds: formData.procedureIds,
          }),
        }
      );

      const data = await res.json();
      if (!data.success) {
        onError(data.error ?? 'Failed to save');
        return;
      }

      // Pass resolved procedure objects up so Step 2 gets the lipo flag right
      const resolved = procedures.filter((p) =>
        formData.procedureIds.includes(p.id)
      );
      onProceduresResolved(resolved);
      onComplete();
    } catch (err: any) {
      onError(err.message ?? 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    { value: 'FACE', label: 'Face' },
    { value: 'BREAST', label: 'Breast' },
    { value: 'BODY', label: 'Body' },
    { value: 'RECONSTRUCTIVE', label: 'Reconstructive' },
  ];

  const primaryOrRevisionOptions = [
    { value: 'PRIMARY', label: 'Primary' },
    { value: 'REVISION', label: 'Revision' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Procedure Date */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Procedure Date <span className="text-rose-500">*</span>
        </label>
        <input
          type="date"
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-transparent"
          value={formData.procedureDate}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, procedureDate: e.target.value }))
          }
        />
      </div>

      {/* Surgeons */}
      <div>
        <p className="block text-sm font-medium text-slate-700 mb-2">
          Select Surgeons <span className="text-rose-500">*</span>
        </p>
        {isLoadingSurgeons ? (
          <div className="flex items-center gap-2 py-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading surgeons…</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 md:max-h-64 overflow-y-auto border rounded-lg p-2">
            {surgeons.map((surgeon) => (
              <label
                key={surgeon.id}
                className="flex items-start gap-2 p-2.5 md:p-2 rounded hover:bg-slate-50 cursor-pointer touch-manipulation"
              >
                <input
                  type="checkbox"
                  checked={formData.surgeonIds.includes(surgeon.id)}
                  onChange={() =>
                    setFormData((prev) => {
                      const ids = prev.surgeonIds.includes(surgeon.id)
                        ? prev.surgeonIds.filter((id) => id !== surgeon.id)
                        : [...prev.surgeonIds, surgeon.id];
                      return { ...prev, surgeonIds: ids };
                    })
                  }
                  className="h-5 w-5 md:h-4 md:w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-800 mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">{surgeon.name}</p>
                  <p className="text-xs text-slate-500">{surgeon.specialization}</p>
                </div>
              </label>
            ))}
          </div>
        )}
        {formData.surgeonIds.length === 0 && (
          <p className="text-xs text-rose-500 mt-1">Select at least one surgeon</p>
        )}
      </div>

      {/* Diagnosis */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Diagnosis <span className="text-rose-500">*</span>
        </label>
        <textarea
          required
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-transparent"
          placeholder="Enter diagnosis…"
          value={formData.diagnosis}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, diagnosis: e.target.value }))
          }
        />
      </div>

      {/* Procedure Category */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Procedure Category <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              className={cn(
                'px-2 md:px-3 py-2.5 md:py-2 border rounded-lg text-sm font-medium transition-colors touch-manipulation',
                formData.procedureCategory === cat.value
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 hover:border-slate-400'
              )}
              onClick={() => handleCategoryChange(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary or Revision */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Primary or Revision <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {primaryOrRevisionOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                'px-3 py-2.5 md:py-2 border rounded-lg text-sm font-medium transition-colors touch-manipulation',
                formData.primaryOrRevision === opt.value
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 hover:border-slate-400'
              )}
              onClick={() =>
                setFormData((prev) => ({ ...prev, primaryOrRevision: opt.value }))
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Specific Procedures */}
      {formData.procedureCategory && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Specific Procedures <span className="text-rose-500">*</span>
            <span className="text-slate-400 font-normal ml-2 text-xs">
              (select at least one)
            </span>
          </label>
          {isLoadingProcedures ? (
            <div className="flex items-center gap-2 py-4 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading procedures…</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 md:max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-2">
              {procedures.map((proc) => (
                <label
                  key={proc.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 md:py-2 rounded-lg cursor-pointer transition-colors touch-manipulation',
                    formData.procedureIds.includes(proc.id)
                      ? 'bg-slate-100'
                      : 'hover:bg-slate-50'
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-5 w-5 md:h-4 md:w-4 rounded border-slate-300"
                    checked={formData.procedureIds.includes(proc.id)}
                    onChange={() => toggleProcedure(proc.id)}
                  />
                  <span className="text-sm">{proc.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={
            isLoading ||
            formData.procedureIds.length === 0 ||
            formData.surgeonIds.length === 0
          }
        >
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save &amp; Continue
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Operative Details
// ─────────────────────────────────────────────────────────────────────────────

interface OperativeDetailsFormProps extends StepProps {
  initialData?: {
    anaesthesiaType: string;
    skinToSkinMinutes: number | null;
    totalTheatreMinutes: number | null;
    admissionType: string;
    deviceUsed: string;
  };
  selectedProcedures: Procedure[];
  onBack: () => void;
}

function OperativeDetailsForm({
  caseId,
  onComplete,
  onError,
  initialData,
  selectedProcedures,
  onBack,
}: OperativeDetailsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    anaesthesiaType: initialData?.anaesthesiaType ?? '',
    skinToSkinMinutes: initialData?.skinToSkinMinutes?.toString() ?? '',
    totalTheatreMinutes: initialData?.totalTheatreMinutes?.toString() ?? '',
    admissionType: initialData?.admissionType ?? '',
    deviceUsed: initialData?.deviceUsed ?? '',
  });

  const hasLipoProcedure = selectedProcedures.some((p) => {
    const n = p.name.toLowerCase();
    return (
      n.includes('liposuction') ||
      n.includes('bbl') ||
      n.includes('180') ||
      n.includes('360')
    );
  });

  const anaesthesias = [
    { value: 'GENERAL', label: 'General' },
    { value: 'LOCAL', label: 'Local' },
    { value: 'REGIONAL', label: 'Regional' },
  ];

  const admissionTypes = [
    { value: 'DAYCASE', label: 'Daycase' },
    { value: 'OVERNIGHT', label: 'Overnight' },
  ];

  const lipoDevices = [
    { value: 'POWER_ASSISTED', label: 'Power Assisted' },
    { value: 'LASER_ASSISTED', label: 'Laser Assisted' },
    { value: 'SUCTION_ASSISTED', label: 'Suction Assisted' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/doctor/surgical-cases/${caseId}/plan/page2`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            anaesthesiaType: formData.anaesthesiaType || undefined,
            skinToSkinMinutes: formData.skinToSkinMinutes
              ? parseInt(formData.skinToSkinMinutes)
              : undefined,
            totalTheatreMinutes: formData.totalTheatreMinutes
              ? parseInt(formData.totalTheatreMinutes)
              : undefined,
            admissionType: formData.admissionType || undefined,
            deviceUsed: formData.deviceUsed || undefined,
          }),
        }
      );

      const data = await res.json();
      if (!data.success) {
        onError(data.error ?? 'Failed to save');
        return;
      }
      onComplete();
    } catch (err: any) {
      onError(err.message ?? 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Anaesthesia Type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Anaesthesia Type <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {anaesthesias.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                'px-2 md:px-3 py-2.5 md:py-2 border rounded-lg text-sm font-medium transition-colors touch-manipulation',
                formData.anaesthesiaType === opt.value
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 hover:border-slate-400'
              )}
              onClick={() =>
                setFormData((prev) => ({ ...prev, anaesthesiaType: opt.value }))
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Theatre Times */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Skin-to-Skin Time (minutes)
          </label>
          <input
            type="number"
            min="0"
            className="w-full px-3 py-2.5 md:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-transparent text-base md:text-sm"
            placeholder="e.g. 120"
            value={formData.skinToSkinMinutes}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                skinToSkinMinutes: e.target.value,
              }))
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Total Theatre Time (minutes)
          </label>
          <input
            type="number"
            min="0"
            className="w-full px-3 py-2.5 md:py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-transparent text-base md:text-sm"
            placeholder="e.g. 180"
            value={formData.totalTheatreMinutes}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                totalTheatreMinutes: e.target.value,
              }))
            }
          />
        </div>
      </div>

      {/* Admission Type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Admission Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {admissionTypes.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                'px-3 py-2.5 md:py-2 border rounded-lg text-sm font-medium transition-colors touch-manipulation',
                formData.admissionType === opt.value
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 hover:border-slate-400'
              )}
              onClick={() =>
                setFormData((prev) => ({ ...prev, admissionType: opt.value }))
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Device Used (lipo procedures only) */}
      {hasLipoProcedure && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Device Used
            <span className="text-slate-400 font-normal ml-2 text-xs">
              (shown because a lipo procedure is selected)
            </span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {lipoDevices.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={cn(
                  'px-3 py-2.5 md:py-2 border rounded-lg text-sm font-medium transition-colors touch-manipulation',
                  formData.deviceUsed === opt.value
                    ? 'border-slate-800 bg-slate-800 text-white'
                    : 'border-slate-200 hover:border-slate-400'
                )}
                onClick={() =>
                  setFormData((prev) => ({ ...prev, deviceUsed: opt.value }))
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !formData.anaesthesiaType}
        >
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save &amp; Continue
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Charge Sheet wrapper
// ─────────────────────────────────────────────────────────────────────────────

interface ChargeSheetStepWrapperProps {
  caseId: string;
  onBack: () => void;
  onFinalize: () => void;
}

function ChargeSheetStepWrapper({
  caseId,
  onBack,
  onFinalize,
}: ChargeSheetStepWrapperProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-500">
          Add services and inventory items to the charge sheet. You can also
          skip this and add charges later from the case plan.
        </p>
      </div>

      <ChargeSheetStep caseId={caseId} />

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onFinalize}>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Finish &amp; View Case
        </Button>
      </div>
    </div>
  );
}

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
    deviceUsed?: string;
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
  /** Procedures resolved from Step 1, passed into Step 2 for lipo detection */
  const [resolvedProcedures, setResolvedProcedures] = useState<Procedure[]>([]);

  const handleError = (msg: string) => setError(msg);
  const clearError = () => setError(null);

  const goToStep = (n: number) => {
    clearError();
    setCurrentStep(n);
  };

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
              onProceduresResolved={(procs) => setResolvedProcedures(procs)}
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
              selectedProcedures={resolvedProcedures}
              initialData={
                initialData
                  ? {
                      anaesthesiaType: initialData.anaesthesiaType ?? '',
                      skinToSkinMinutes: initialData.skinToSkinMinutes ?? null,
                      totalTheatreMinutes:
                        initialData.totalTheatreMinutes ?? null,
                      admissionType: initialData.admissionType ?? '',
                      deviceUsed: initialData.deviceUsed ?? '',
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
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
