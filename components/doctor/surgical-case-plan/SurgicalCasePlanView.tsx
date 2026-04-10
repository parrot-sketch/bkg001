'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Calendar, 
  User, 
  Activity,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Building,
  Scissors
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface Procedure {
  id: string;
  name: string;
  category: string;
}

interface Surgeon {
  id: string;
  name: string;
  specialization: string;
}

interface CaseData {
  procedureDate: string | null;
  patientFileNumber: string;
  patientName: string;
  surgeon: Surgeon | null;
  diagnosis: string;
  procedureCategory: string;
  primaryOrRevision: string;
  procedures: Procedure[];
  // Page 2
  anaesthesiaType: string;
  skinToSkinMinutes: number | null;
  totalTheatreMinutes: number | null;
  admissionType: string;
  deviceUsed: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  FACE: 'Face',
  BREAST: 'Breast',
  BODY: 'Body',
  RECONSTRUCTIVE: 'Reconstructive',
};

const ADMISSION_LABELS: Record<string, string> = {
  DAYCASE: 'Day Case',
  OVERNIGHT: 'Overnight',
};

const ANAESTHESIA_LABELS: Record<string, string> = {
  GENERAL: 'General',
  LOCAL: 'Local',
  REGIONAL: 'Regional',
  SEDATION: 'Sedation',
  TIVA: 'TIVA',
  MAC: 'MAC',
};

const DEVICE_LABELS: Record<string, string> = {
  POWER_ASSISTED: 'Power Assisted',
  LASER_ASSISTED: 'Laser Assisted',
  SUCTION_ASSISTED: 'Suction Assisted',
};

function StepIndicator({ currentStep, totalSteps, onStepClick }: { 
  currentStep: number; 
  totalSteps: number;
  onStepClick: (step: number) => void;
}) {
  const steps = [
    { num: 1, label: 'Case ID', icon: FileText },
    { num: 2, label: 'Operative', icon: Activity },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isActive = currentStep === step.num;
        const isCompleted = currentStep > step.num;
        
        return (
          <div key={step.num} className="flex items-center">
            {idx > 0 && (
              <div className={cn(
                "w-12 h-0.5 mx-2",
                isCompleted ? "bg-emerald-500" : "bg-slate-200"
              )} />
            )}
            <button
              type="button"
              onClick={() => onStepClick(step.num)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors",
                isActive && "bg-slate-800 text-white",
                isCompleted && "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
                !isActive && !isCompleted && "bg-slate-100 text-slate-500"
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{step.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '—';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

function CaseIdentificationView({ data }: { data: CaseData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Procedure Date */}
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Procedure Date
          </label>
          <div className="mt-1 flex items-center gap-2 text-slate-900">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="font-medium">
              {data.procedureDate ? format(new Date(data.procedureDate), 'MMMM d, yyyy') : '—'}
            </span>
          </div>
        </div>

        {/* Patient File Number */}
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Patient File #
          </label>
          <div className="mt-1 flex items-center gap-2 text-slate-900">
            <User className="h-4 w-4 text-slate-400" />
            <span className="font-medium font-mono">{data.patientFileNumber || '—'}</span>
          </div>
        </div>

        {/* Surgeon */}
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Surgeon
          </label>
          <div className="mt-1 flex items-center gap-2 text-slate-900">
            <Scissors className="h-4 w-4 text-slate-400" />
            <span className="font-medium">{data.surgeon?.name || '—'}</span>
          </div>
          {data.surgeon?.specialization && (
            <p className="text-sm text-slate-500 mt-0.5">{data.surgeon.specialization}</p>
          )}
        </div>

        {/* Primary/Revision */}
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Case Type
          </label>
          <div className="mt-1">
            <span className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium",
              data.primaryOrRevision === 'PRIMARY' 
                ? "bg-blue-50 text-blue-700" 
                : "bg-amber-50 text-amber-700"
            )}>
              {data.primaryOrRevision || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Diagnosis */}
      <div>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Diagnosis
        </label>
        <div className="mt-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-slate-900">{data.diagnosis || '—'}</p>
        </div>
      </div>

      {/* Procedure Category */}
      <div>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Procedure Category
        </label>
        <div className="mt-2">
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
            {CATEGORY_LABELS[data.procedureCategory] || data.procedureCategory || '—'}
          </span>
        </div>
      </div>

      {/* Procedures */}
      <div>
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Procedures ({data.procedures.length})
        </label>
        <div className="mt-2 space-y-2">
          {data.procedures.length > 0 ? (
            data.procedures.map((proc) => (
              <div 
                key={proc.id} 
                className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="font-medium text-slate-900">{proc.name}</span>
              </div>
            ))
          ) : (
            <p className="text-slate-500">No procedures selected</p>
          )}
        </div>
      </div>
    </div>
  );
}

function OperativeDetailsView({ data }: { data: CaseData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Anaesthesia Type */}
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Anaesthesia Type
          </label>
          <div className="mt-1">
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 font-medium">
              {ANAESTHESIA_LABELS[data.anaesthesiaType] || data.anaesthesiaType || '—'}
            </span>
          </div>
        </div>

        {/* Admission Type */}
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Admission
          </label>
          <div className="mt-1">
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
              {ADMISSION_LABELS[data.admissionType] || data.admissionType || '—'}
            </span>
          </div>
        </div>

        {/* Skin-to-Skin */}
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Skin-to-Skin Time
          </label>
          <div className="mt-1 flex items-center gap-2 text-slate-900">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="font-medium">{formatMinutes(data.skinToSkinMinutes)}</span>
          </div>
        </div>

        {/* Total Theatre Time */}
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Total Theatre Time
          </label>
          <div className="mt-1 flex items-center gap-2 text-slate-900">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="font-medium">{formatMinutes(data.totalTheatreMinutes)}</span>
          </div>
        </div>
      </div>

      {/* Device Used (conditional) */}
      {data.deviceUsed && (
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Device Used
          </label>
          <div className="mt-1">
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 font-medium">
              {DEVICE_LABELS[data.deviceUsed] || data.deviceUsed}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function SurgicalCasePlanView({ 
  caseId, 
  initialData 
}: { 
  caseId: string; 
  initialData?: CaseData | null;
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [caseData, setCaseData] = useState<CaseData | null>(initialData || null);

  useEffect(() => {
    if (initialData) {
      setCaseData(initialData);
      setIsLoading(false);
      return;
    }

    async function fetchCaseData() {
      try {
        const res = await fetch(`/api/doctor/surgical-cases/${caseId}`);
        const data = await res.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch case');
        }

        setCaseData(data.case);
      } catch (err: any) {
        setError(err.message || 'Failed to load case data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchCaseData();
  }, [caseId, initialData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center gap-2 text-slate-500">
                <div className="h-5 w-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                <span>Loading case data...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-3 text-center">
                <AlertCircle className="h-8 w-8 text-rose-500" />
                <p className="text-rose-700 font-medium">{error || 'Case not found'}</p>
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-6">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Surgical Case Plan
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    View case identification and operative details
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Patient</p>
                  <p className="font-medium text-slate-900">{caseData.patientName}</p>
                  <p className="text-xs text-slate-400 font-mono">{caseData.patientFileNumber}</p>
                </div>
              </div>
            </div>

            <StepIndicator 
              currentStep={currentStep} 
              totalSteps={2}
              onStepClick={setCurrentStep}
            />

            {/* Content */}
            {currentStep === 1 ? (
              <CaseIdentificationView data={caseData} />
            ) : (
              <OperativeDetailsView data={caseData} />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              {currentStep === 1 ? (
                <Button onClick={() => setCurrentStep(2)}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button variant="outline" onClick={() => router.back()}>
                  Back to Case
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}