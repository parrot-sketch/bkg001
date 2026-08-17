'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { StepProps, Surgeon, Procedure, SearchableOption } from './types';
import { SearchableSelect } from './SearchableSelect';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import { StaffCombobox } from './StaffCombobox';

export interface CaseSetupFormProps extends StepProps {
  currentStep: number;
  isTheaterTech?: boolean;
  initialData?: {
    procedureDate: Date | null;
    surgeonId: string;
    surgeonIds?: string[];
    assistantSurgeonIds?: string[];
    anesthesiologistUserId?: string;
    scrubNurseUserId?: string;
    circulatingNurseUserId?: string;
    diagnosis: string;
    procedureCategory: string;
    primaryOrRevision: string;
    procedureIds: string[];
  };
  onProceduresConfirmed?: (procedures: Procedure[]) => void;
}

export function CaseSetupForm({
  caseId,
  onComplete,
  onError,
  currentStep,
  isTheaterTech,
  initialData,
  onProceduresConfirmed,
}: CaseSetupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [surgeons, setSurgeons] = useState<Surgeon[]>([]);
  const [isLoadingSurgeons, setIsLoadingSurgeons] = useState(true);
  const [staffDoctors, setStaffDoctors] = useState<Array<{ id: string; fullName: string; email: string; role: string }>>([]);
  const [staffNurses, setStaffNurses] = useState<Array<{ id: string; fullName: string; email: string; role: string }>>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(false);

  const initialPrimary = initialData?.surgeonId || initialData?.surgeonIds?.[0] || '';
  const initialAssistants =
    initialData?.assistantSurgeonIds && initialData.assistantSurgeonIds.length > 0
      ? initialData.assistantSurgeonIds
      : (initialData?.surgeonIds ?? []).filter((id) => id !== initialPrimary);

  const [formData, setFormData] = useState({
    procedureDate: initialData?.procedureDate?.toISOString().split('T')[0] ?? '',
    primarySurgeonId: initialPrimary,
    assistantSurgeonIds: initialAssistants ?? ([] as string[]),
    anesthesiologistUserId: initialData?.anesthesiologistUserId ?? '',
    scrubNurseUserId: initialData?.scrubNurseUserId ?? '',
    circulatingNurseUserId: initialData?.circulatingNurseUserId ?? '',
    diagnosis: initialData?.diagnosis ?? '',
    procedureCategory: initialData?.procedureCategory ?? '',
    primaryOrRevision: initialData?.primaryOrRevision ?? '',
    procedureIds: initialData?.procedureIds ?? ([] as string[]),
  });

  const [customProcedureCategory, setCustomProcedureCategory] = useState('');

  useEffect(() => {
    fetch('/api/doctor/surgical-cases/surgeons')
      .then((r) => r.json())
      .then((d) => setSurgeons(d.surgeons ?? []))
      .catch((err) => console.error('Error fetching surgeons:', err))
      .finally(() => setIsLoadingSurgeons(false));
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoadingStaff(true);
      try {
        const [doctorsRes, nursesRes] = await Promise.all([
          fetch('/api/theater-tech/staff?role=DOCTOR'),
          fetch('/api/theater-tech/staff?role=NURSE'),
        ]);
        const doctorsJson = await doctorsRes.json();
        const nursesJson = await nursesRes.json();
        setStaffDoctors(doctorsJson?.data ?? []);
        setStaffNurses(nursesJson?.data ?? []);
      } catch (err) {
        console.error('Error fetching staff:', err);
      } finally {
        setIsLoadingStaff(false);
      }
    };
    load();
  }, []);

  const fetchProcedures = useCallback(
    async (category: string) => {
      if (!category) return;
      setIsLoadingProcedures(true);
      try {
        const res = await fetch(`/api/doctor/surgical-cases/${caseId}/procedures?category=${category}`);
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
  }, [formData.procedureCategory, fetchProcedures]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const customAnesthesiologist = formData.anesthesiologistUserId.startsWith('__custom__:')
        ? formData.anesthesiologistUserId.replace('__custom__:', '')
        : null;
      const customScrubNurse = formData.scrubNurseUserId.startsWith('__custom__:')
        ? formData.scrubNurseUserId.replace('__custom__:', '')
        : null;
      const customCirculatingNurse = formData.circulatingNurseUserId.startsWith('__custom__:')
        ? formData.circulatingNurseUserId.replace('__custom__:', '')
        : null;

      const customPrimarySurgeonName = formData.primarySurgeonId.startsWith('__custom__:')
        ? formData.primarySurgeonId.replace('__custom__:', '')
        : null;
      const customAssistantSurgeonNames = formData.assistantSurgeonIds
        .filter((id) => id.startsWith('__custom__:'))
        .map((id) => id.replace('__custom__:', ''));
      const customProcedureNames = formData.procedureIds
        .filter((id) => id.startsWith('__custom__:'))
        .map((id) => id.replace('__custom__:', ''));

      const res = await fetch(`/api/doctor/surgical-cases/${caseId}/plan/page1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedureDate: formData.procedureDate,
          primarySurgeonId: customPrimarySurgeonName ? null : (formData.primarySurgeonId || null),
          assistantSurgeonIds: formData.assistantSurgeonIds.filter((id) => !id.startsWith('__custom__:')),
          anesthesiologistUserId: customAnesthesiologist ? null : (formData.anesthesiologistUserId || null),
          scrubNurseUserId: customScrubNurse ? null : (formData.scrubNurseUserId || null),
          circulatingNurseUserId: customCirculatingNurse ? null : (formData.circulatingNurseUserId || null),
          customPrimarySurgeonName: customPrimarySurgeonName || null,
          customAssistantSurgeonNames: customAssistantSurgeonNames.length > 0 ? customAssistantSurgeonNames : null,
          customAnesthesiologistName: customAnesthesiologist,
          customScrubNurseName: customScrubNurse,
          customCirculatingNurseName: customCirculatingNurse,
          customProcedureCategory: customProcedureCategory || null,
          customProcedureNames: customProcedureNames.length > 0 ? customProcedureNames : null,
          diagnosis: formData.diagnosis,
          procedureCategory: formData.procedureCategory === 'OTHER' && customProcedureCategory ? 'OTHER' : formData.procedureCategory,
          primaryOrRevision: formData.primaryOrRevision,
          procedureIds: formData.procedureIds.filter((id) => !id.startsWith('__custom__:')),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        onError(data.error ?? 'Failed to save');
        return;
      }

      const selected = procedures.filter((p) => formData.procedureIds.includes(p.id));
      const customProcedures = customProcedureNames.map((name) => ({
        id: `__custom__:${name}`,
        name,
        category: formData.procedureCategory,
        description: null,
        estimated_duration_minutes: null,
        default_price: null,
        min_price: null,
        max_price: null,
        procedure_service_links: [],
      }));
      if (onProceduresConfirmed) onProceduresConfirmed([...selected, ...customProcedures]);
      onComplete();
    } catch (err: any) {
      onError(err.message ?? 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    { value: 'FACIAL', label: 'Facial Procedures' },
    { value: 'BODY', label: 'Body Procedures' },
    { value: 'BREAST', label: 'Breast Procedures' },
    { value: 'SKIN_AND_SCAR', label: 'Skin and Scar Treatments' },
    { value: 'NON_SURGICAL', label: 'Non-Surgical Treatments' },
    { value: 'OTHER', label: 'Other' },
  ];

  const primaryOrRevisionOptions = [
    { value: 'PRIMARY', label: 'Primary' },
    { value: 'REVISION', label: 'Revision' },
  ];

  const surgeonOptions: SearchableOption[] = surgeons.map((s) => ({
    id: s.id,
    label: s.name,
  }));

  const procedureOptions: SearchableOption[] = procedures.map((p) => ({
    id: p.id,
    label: p.name,
    description: p.description ?? undefined,
  }));

  return (
    <form onSubmit={handleSubmit} className="divide-y divide-slate-100">
      {/* Case Setup */}
      <div className="p-6 md:p-8 space-y-6">
        <SectionHeader title="Case Setup" description="Procedure date, surgeon and team" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Procedure Date" required>
            <Input
              type="date"
              required
              className="h-9"
              value={formData.procedureDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, procedureDate: e.target.value }))}
            />
          </Field>

          <Field label="Primary Surgeon" required>
            <SearchableSelect
              options={surgeonOptions}
              value={formData.primarySurgeonId}
              onChange={(id) =>
                setFormData((prev) => ({
                  ...prev,
                  primarySurgeonId: id,
                  assistantSurgeonIds: prev.assistantSurgeonIds.filter((aid) => aid !== id),
                }))
              }
              placeholder="Search surgeon..."
              searchPlaceholder="Type to search surgeons..."
              emptyText="No surgeons found."
              loading={isLoadingSurgeons}
              allowCustom
              customPlaceholder="Enter surgeon name (e.g. external consultant)..."
              onCustomCreate={(name) => {
                const customId = `__custom__:${name}`;
                setFormData((prev) => ({ ...prev, primarySurgeonId: customId }));
              }}
            />
          </Field>

          <Field label="Assistant Surgeons" description="Optional">
            <SearchableMultiSelect
              options={surgeonOptions.filter((s) => s.id !== formData.primarySurgeonId)}
              value={formData.assistantSurgeonIds}
              onChange={(ids) => setFormData((prev) => ({ ...prev, assistantSurgeonIds: ids }))}
              placeholder="Add assistant surgeons..."
              searchPlaceholder="Search assistants..."
              emptyText="No surgeons found."
              loading={isLoadingSurgeons}
              allowCustom
              customPlaceholder="Enter assistant surgeon name..."
              onCustomCreate={(name) => {
                const customId = `__custom__:${name}`;
                setFormData((prev) => ({ ...prev, assistantSurgeonIds: [...prev.assistantSurgeonIds, customId] }));
              }}
            />
          </Field>

          <Field label="Diagnosis" required>
            <textarea
              required
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-transparent text-sm resize-none"
              placeholder="Enter pre-operative diagnosis..."
              value={formData.diagnosis}
              onChange={(e) => setFormData((prev) => ({ ...prev, diagnosis: e.target.value }))}
            />
          </Field>
        </div>
      </div>

      {/* Procedure */}
      <div className="p-6 md:p-8 space-y-6">
        <SectionHeader title="Procedure" description="Procedure type and category" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Procedure Category" required className="md:col-span-2">
            <Select
              value={formData.procedureCategory}
              onValueChange={(value) => {
                setFormData((prev) => ({ ...prev, procedureCategory: value, procedureIds: [] }));
                setCustomProcedureCategory('');
                if (value !== 'OTHER') fetchProcedures(value);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.procedureCategory === 'OTHER' && (
              <div className="mt-2">
                <Input
                  value={customProcedureCategory}
                  onChange={(e) => setCustomProcedureCategory(e.target.value)}
                  placeholder="Enter custom category name..."
                  className="h-9"
                />
              </div>
            )}
          </Field>

          <Field label="Case Type" required className="md:col-span-2">
            <div className="flex gap-2">
              {primaryOrRevisionOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                    formData.primaryOrRevision === opt.value
                      ? 'border-slate-800 bg-slate-800 text-white shadow-sm'
                      : 'border-slate-200 hover:border-slate-400 text-slate-600'
                  )}
                  onClick={() => setFormData((prev) => ({ ...prev, primaryOrRevision: opt.value }))}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          {formData.procedureCategory && (
            <Field label="Specific Procedures" required className="md:col-span-2">
              {isLoadingProcedures ? (
                <div className="flex items-center gap-2 py-4 text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading procedures...</span>
                </div>
              ) : (
                <SearchableMultiSelect
                  options={procedureOptions}
                  value={formData.procedureIds}
                  onChange={(ids) => setFormData((prev) => ({ ...prev, procedureIds: ids }))}
                  placeholder="Select procedures..."
                  searchPlaceholder="Search procedures..."
                  emptyText="No procedures found for this category."
                  allowCustom
                  customPlaceholder="Enter custom procedure name..."
                  onCustomCreate={(name) => {
                    const customId = `__custom__:${name}`;
                    setFormData((prev) => ({ ...prev, procedureIds: [...prev.procedureIds, customId] }));
                  }}
                />
              )}
            </Field>
          )}
        </div>
      </div>

      {/* Surgical Team */}
      <div className="p-6 md:p-8 space-y-6">
        <SectionHeader title="Surgical Team" description="Anesthesia and nursing staff" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Anaesthesiologist">
            <StaffCombobox
              options={staffDoctors}
              isLoading={isLoadingStaff}
              value={formData.anesthesiologistUserId}
              onChange={(id) => setFormData((prev) => ({ ...prev, anesthesiologistUserId: id }))}
              placeholder="Select anaesthesiologist..."
              emptyText="No doctors found."
              customPlaceholder="Enter anaesthesiologist name..."
              roleHint="Uses user accounts (Role: DOCTOR)."
            />
          </Field>

          <Field label="Scrub Nurse">
            <StaffCombobox
              options={staffNurses}
              isLoading={isLoadingStaff}
              value={formData.scrubNurseUserId}
              onChange={(id) => setFormData((prev) => ({ ...prev, scrubNurseUserId: id }))}
              placeholder="Select scrub nurse..."
              emptyText="No nurses found."
              customPlaceholder="Enter scrub nurse name..."
            />
          </Field>

          <Field label="Circulating Nurse">
            <StaffCombobox
              options={staffNurses}
              isLoading={isLoadingStaff}
              value={formData.circulatingNurseUserId}
              onChange={(id) => setFormData((prev) => ({ ...prev, circulatingNurseUserId: id }))}
              placeholder="Select circulating nurse..."
              emptyText="No nurses found."
              customPlaceholder="Enter circulating nurse name..."
            />
          </Field>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200 px-6 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Step {currentStep} of 3
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => window.history.back()}
              className="text-slate-500 hover:text-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                formData.procedureIds.length === 0 ||
                !formData.primarySurgeonId ||
                !formData.procedureCategory ||
                !formData.primaryOrRevision ||
                !formData.diagnosis
              }
              className="bg-slate-800 hover:bg-slate-900 text-white"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save & Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
        {title}
      </h3>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </div>
  );
}

function Field({
  label,
  required,
  description,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </Label>
      {description && (
        <p className="text-[11px] text-slate-400">{description}</p>
      )}
      {children}
    </div>
  );
}
