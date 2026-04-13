'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ClipboardList, 
  Calendar, 
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  User,
  Stethoscope,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
}

interface OperativeDetailsFormProps extends StepProps {
  initialData?: {
    anaesthesiaType: string;
    skinToSkinMinutes: number | null;
    totalTheatreMinutes: number | null;
    admissionType: string;
    deviceUsed: string;
  };
  selectedProcedures: Array<{ name: string }>;
}

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const steps = [
    { num: 1, label: 'Case ID', icon: User },
    { num: 2, label: 'Operative', icon: Activity },
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
              <div className={cn(
                "w-8 md:w-12 h-0.5 mx-1 md:mx-2",
                isCompleted ? "bg-emerald-500" : "bg-slate-200"
              )} />
            )}
            <div className={cn(
              "flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-full transition-colors",
              isActive && "bg-slate-800 text-white",
              isCompleted && "bg-emerald-100 text-emerald-700",
              !isActive && !isCompleted && "bg-slate-100 text-slate-500"
            )}>
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

function CaseIdentificationForm({ 
  caseId, 
  onComplete, 
  onError,
  initialData 
}: CaseIdentificationFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [surgeons, setSurgeons] = useState<Surgeon[]>([]);
  const [isLoadingSurgeons, setIsLoadingSurgeons] = useState(true);
  const [formData, setFormData] = useState({
    procedureDate: initialData?.procedureDate?.toISOString().split('T')[0] || '',
    surgeonIds: initialData?.surgeonIds || [] as string[],
    surgeonId: initialData?.surgeonId || '', // Keep for backward compatibility
    diagnosis: initialData?.diagnosis || '',
    procedureCategory: initialData?.procedureCategory || '',
    primaryOrRevision: initialData?.primaryOrRevision || '',
    procedureIds: initialData?.procedureIds || [] as string[],
  });

  const [procedures, setProcedures] = useState<Array<{ id: string; name: string; category: string }>>([]);
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(false);

  // Fetch surgeons on mount
  useEffect(() => {
    async function fetchSurgeons() {
      try {
        const res = await fetch('/api/doctor/surgical-cases/surgeons');
        const data = await res.json();
        setSurgeons(data.surgeons || []);
      } catch (err) {
        console.error('Error fetching surgeons:', err);
      } finally {
        setIsLoadingSurgeons(false);
      }
    }
    fetchSurgeons();
  }, []);

  // Fetch procedures when category changes
  useEffect(() => {
    if (formData.procedureCategory) {
      fetchProcedures(formData.procedureCategory);
    }
  }, [formData.procedureCategory]);

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

  const fetchProcedures = async (category: string) => {
    if (!category) return;
    setIsLoadingProcedures(true);
    try {
      const res = await fetch(`/api/doctor/surgical-cases/${caseId}/procedures?category=${category}`);
      const data = await res.json();
      setProcedures(data.procedures || []);
    } catch (err) {
      console.error('Error fetching procedures:', err);
    } finally {
      setIsLoadingProcedures(false);
    }
  };

  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      procedureCategory: value,
      procedureIds: [] // Clear selected procedures when category changes
    }));
    fetchProcedures(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`/api/doctor/surgical-cases/${caseId}/plan/page1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedureDate: formData.procedureDate,
          surgeonId: formData.surgeonIds[0] || formData.surgeonId, // Primary surgeon
          surgeonIds: formData.surgeonIds, // All selected surgeons
          diagnosis: formData.diagnosis,
          procedureCategory: formData.procedureCategory,
          primaryOrRevision: formData.primaryOrRevision,
          procedureIds: formData.procedureIds,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        onError(data.error || 'Failed to save');
        return;
      }

      onComplete();
    } catch (err: any) {
      onError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProcedure = (id: string) => {
    setFormData(prev => ({
      ...prev,
      procedureIds: prev.procedureIds.includes(id)
        ? prev.procedureIds.filter(pid => pid !== id)
        : [...prev.procedureIds, id]
    }));
  };

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
          onChange={e => setFormData(prev => ({ ...prev, procedureDate: e.target.value }))}
        />
      </div>

      {/* Surgeon */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Surgeon <span className="text-rose-500">*</span>
        </label>
        {isLoadingSurgeons ? (
          <div className="flex items-center gap-2 py-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading surgeons...</span>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 mb-2">
              Select Surgeons <span className="text-rose-500">*</span>
            </p>
            {isLoadingSurgeons ? (
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading surgeons...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 md:max-h-64 overflow-y-auto border rounded-lg p-2">
                {surgeons.map(surgeon => (
                  <label
                    key={surgeon.id}
                    className="flex items-start gap-2 p-2.5 md:p-2 rounded hover:bg-slate-50 cursor-pointer touch-manipulation"
                  >
                    <input
                      type="checkbox"
                      checked={formData.surgeonIds.includes(surgeon.id)}
                      onChange={() => {
                        setFormData(prev => {
                          const current = prev.surgeonIds || [];
                          const newIds = current.includes(surgeon.id)
                            ? current.filter(id => id !== surgeon.id)
                            : [...current, surgeon.id];
                          return { ...prev, surgeonIds: newIds };
                        });
                      }}
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
              <p className="text-xs text-rose-500">Select at least one surgeon</p>
            )}
          </div>
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
          placeholder="Enter diagnosis..."
          value={formData.diagnosis}
          onChange={e => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
        />
      </div>

      {/* Procedure Category - Mobile responsive */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Procedure Category <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {categories.map(cat => (
            <button
              key={cat.value}
              type="button"
              className={cn(
                "px-2 md:px-3 py-2.5 md:py-2 border rounded-lg text-sm font-medium transition-colors touch-manipulation",
                formData.procedureCategory === cat.value
                  ? "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-200 hover:border-slate-400"
              )}
              onClick={() => handleCategoryChange(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary or Revision - Mobile responsive */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Primary or Revision <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {primaryOrRevisionOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                "px-3 py-2.5 md:py-2 border rounded-lg text-sm font-medium transition-colors touch-manipulation",
                formData.primaryOrRevision === opt.value
                  ? "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-200 hover:border-slate-400"
              )}
              onClick={() => setFormData(prev => ({ ...prev, primaryOrRevision: opt.value }))}
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
            <span className="text-slate-400 font-normal ml-2">(select at least one)</span>
          </label>
          
          {isLoadingProcedures ? (
            <div className="flex items-center gap-2 py-4 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading procedures...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 md:max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-2">
              {procedures.map(proc => (
                <label
                  key={proc.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 md:py-2 rounded-lg cursor-pointer transition-colors touch-manipulation",
                    formData.procedureIds.includes(proc.id)
                      ? "bg-slate-100 border-slate-400"
                      : "hover:bg-slate-50"
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
        <Button type="submit" disabled={isLoading || formData.procedureIds.length === 0}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save & Continue
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </form>
  );
}

function OperativeDetailsForm({
  caseId,
  onComplete,
  onError,
  initialData,
  selectedProcedures
}: OperativeDetailsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    anaesthesiaType: initialData?.anaesthesiaType || '',
    skinToSkinMinutes: initialData?.skinToSkinMinutes?.toString() || '',
    totalTheatreMinutes: initialData?.totalTheatreMinutes?.toString() || '',
    admissionType: initialData?.admissionType || '',
    deviceUsed: initialData?.deviceUsed || '',
  });

  const hasLipoProcedure = selectedProcedures.some(p =>
    p.name.toLowerCase().includes('liposuction') ||
    p.name.toLowerCase().includes('bbl') ||
    p.name.toLowerCase().includes('180') ||
    p.name.toLowerCase().includes('360')
  );

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
      const res = await fetch(`/api/doctor/surgical-cases/${caseId}/plan/page2`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anaesthesiaType: formData.anaesthesiaType || undefined,
          skinToSkinMinutes: formData.skinToSkinMinutes ? parseInt(formData.skinToSkinMinutes) : undefined,
          totalTheatreMinutes: formData.totalTheatreMinutes ? parseInt(formData.totalTheatreMinutes) : undefined,
          admissionType: formData.admissionType || undefined,
          deviceUsed: formData.deviceUsed || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        onError(data.error || 'Failed to save');
        return;
      }

      onComplete();
    } catch (err: any) {
      onError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Anaesthesia Type - Mobile responsive */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Anaesthesia Type <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {anaesthesias.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                "px-2 md:px-3 py-2.5 md:py-2 border rounded-lg text-sm font-medium transition-colors touch-manipulation",
                formData.anaesthesiaType === opt.value
                  ? "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-200 hover:border-slate-400"
              )}
              onClick={() => setFormData(prev => ({ ...prev, anaesthesiaType: opt.value }))}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Theatre Times - Mobile responsive */}
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
            onChange={e => setFormData(prev => ({ ...prev, skinToSkinMinutes: e.target.value }))}
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
            onChange={e => setFormData(prev => ({ ...prev, totalTheatreMinutes: e.target.value }))}
          />
        </div>
      </div>

      {/* Admission Type - Mobile responsive */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Admission Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {admissionTypes.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                "px-3 py-2.5 md:py-2 border rounded-lg text-sm font-medium transition-colors touch-manipulation",
                formData.admissionType === opt.value
                  ? "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-200 hover:border-slate-400"
              )}
              onClick={() => setFormData(prev => ({ ...prev, admissionType: opt.value }))}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Device Used (conditional) - Mobile responsive */}
      {hasLipoProcedure && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Device Used
            <span className="text-slate-400 font-normal ml-1 md:ml-2 text-xs md:text-sm">(shown because lipo procedure selected)</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {lipoDevices.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={cn(
                  "px-3 py-2.5 md:py-2 border rounded-lg text-sm font-medium transition-colors touch-manipulation",
                  formData.deviceUsed === opt.value
                    ? "border-slate-800 bg-slate-800 text-white"
                    : "border-slate-200 hover:border-slate-400"
                )}
                onClick={() => setFormData(prev => ({ ...prev, deviceUsed: opt.value }))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button type="submit" disabled={isLoading || !formData.anaesthesiaType}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Complete Plan
          <CheckCircle2 className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </form>
  );
}

interface SurgicalCasePlanFormProps {
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

export function SurgicalCasePlanForm({ caseId, initialData, isTheaterTech = false }: SurgicalCasePlanFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (success) {
      if (isTheaterTech) {
        router.push(`/theater-tech/surgical-cases/${caseId}`);
      } else {
        router.push(`/doctor/surgical-cases/${caseId}`);
      }
    }
  }, [success, isTheaterTech, caseId, router]);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-0">
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="text-center mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-slate-900">
              Surgical Case Plan
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Complete the case identification and operative details
            </p>
          </div>

          <StepIndicator currentStep={currentStep} totalSteps={2} />

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">Plan Completed!</h3>
              <p className="text-sm text-slate-500 mt-2">
                The surgical case plan has been saved successfully. Redirecting to case details...
              </p>
            </div>
          ) : currentStep === 1 ? (
            <CaseIdentificationForm
              caseId={caseId}
              onComplete={() => setCurrentStep(2)}
              onError={setError}
              initialData={initialData ? {
                surgeonId: initialData.surgeonId || '',
                surgeonIds: initialData.surgeonIds || [],
                procedureDate: (initialData.procedureDate ? new Date(initialData.procedureDate) : null),
                diagnosis: initialData.diagnosis || '',
                procedureCategory: initialData.procedureCategory || '',
                primaryOrRevision: initialData.primaryOrRevision || '',
                procedureIds: initialData.procedureIds || []
              } : undefined}
            />
          ) : (
            <OperativeDetailsForm
              caseId={caseId}
              onComplete={() => setSuccess(true)}
              onError={setError}
              selectedProcedures={[]}
              initialData={initialData ? {
                anaesthesiaType: initialData.anaesthesiaType || '',
                skinToSkinMinutes: initialData.skinToSkinMinutes ?? null,
                totalTheatreMinutes: initialData.totalTheatreMinutes ?? null,
                admissionType: initialData.admissionType || '',
                deviceUsed: initialData.deviceUsed || '',
              } : undefined}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
