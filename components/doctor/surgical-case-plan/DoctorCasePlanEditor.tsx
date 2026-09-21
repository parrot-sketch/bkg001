'use client';

/**
 * Single-page Case Plan editor for doctors.
 * Prefills from the scheduled surgical case; one Save writes page1 + page2.
 * No wizard steps, charge sheet, or notes handoff.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Procedure, SearchableOption, Surgeon } from './steps/types';
import { SearchableSelect } from './steps/SearchableSelect';
import { SearchableMultiSelect } from './steps/SearchableMultiSelect';
import { StaffCombobox } from './steps/StaffCombobox';

const CATEGORIES = [
  { value: 'FACIAL', label: 'Facial Procedures' },
  { value: 'BODY', label: 'Body Procedures' },
  { value: 'BREAST', label: 'Breast Procedures' },
  { value: 'SKIN_AND_SCAR', label: 'Skin and Scar Treatments' },
  { value: 'NON_SURGICAL', label: 'Non-Surgical Treatments' },
  { value: 'OTHER', label: 'Other' },
] as const;

const CASE_TYPES = [
  { value: 'PRIMARY', label: 'Primary' },
  { value: 'REVISION', label: 'Revision' },
] as const;

const ANAESTHESIAS = [
  { value: 'GENERAL', label: 'General' },
  { value: 'LOCAL', label: 'Local' },
  { value: 'REGIONAL', label: 'Regional' },
  { value: 'SEDATION', label: 'Sedation' },
] as const;

const ADMISSION_TYPES = [
  { value: 'DAYCASE', label: 'Daycase' },
  { value: 'OVERNIGHT', label: 'Overnight' },
] as const;

export type DoctorCasePlanInitialData = {
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

type StaffOption = { id: string; fullName: string; email: string; role: string };

function toDateInput(value?: Date | string | null): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0] ?? '';
}

function ChoicePill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors',
        selected
          ? 'border-[#2c2e4b] bg-[#2c2e4b] text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-[#caa26a]/60 hover:text-[#2c2e4b]',
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs font-medium text-slate-600">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </Label>
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
      {children}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 border-b border-slate-100 pb-4">
        <h2 className="text-base font-semibold tracking-tight text-[#2c2e4b]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function DoctorCasePlanEditor({
  caseId,
  initialData,
}: {
  caseId: string;
  initialData: DoctorCasePlanInitialData;
}) {
  const router = useRouter();

  const initialPrimary =
    initialData.surgeonId || initialData.surgeonIds?.[0] || '';
  const initialAssistants =
    initialData.assistantSurgeonIds && initialData.assistantSurgeonIds.length > 0
      ? initialData.assistantSurgeonIds
      : (initialData.surgeonIds ?? []).filter((id) => id !== initialPrimary);

  const knownCategory = CATEGORIES.some((c) => c.value === (initialData.procedureCategory ?? ''));
  const [form, setForm] = useState({
    procedureDate: toDateInput(initialData.procedureDate),
    primarySurgeonId: initialPrimary,
    assistantSurgeonIds: initialAssistants,
    anesthesiologistUserId: initialData.anesthesiologistUserId ?? '',
    scrubNurseUserId: initialData.scrubNurseUserId ?? '',
    circulatingNurseUserId: initialData.circulatingNurseUserId ?? '',
    diagnosis: initialData.diagnosis ?? '',
    procedureCategory: knownCategory
      ? (initialData.procedureCategory ?? '')
      : initialData.procedureCategory
        ? 'OTHER'
        : '',
    primaryOrRevision: initialData.primaryOrRevision ?? '',
    procedureIds: initialData.procedureIds ?? ([] as string[]),
    anaesthesiaType: initialData.anaesthesiaType ?? '',
    skinToSkinMinutes: initialData.skinToSkinMinutes?.toString() ?? '',
    totalTheatreMinutes: initialData.totalTheatreMinutes?.toString() ?? '',
    admissionType: initialData.admissionType ?? '',
  });
  const [customProcedureCategory, setCustomProcedureCategory] = useState(
    knownCategory ? '' : initialData.procedureCategory ?? '',
  );

  const [surgeons, setSurgeons] = useState<Surgeon[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [staffDoctors, setStaffDoctors] = useState<StaffOption[]>([]);
  const [staffNurses, setStaffNurses] = useState<StaffOption[]>([]);
  const [loadingSurgeons, setLoadingSurgeons] = useState(true);
  const [loadingProcedures, setLoadingProcedures] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    fetch('/api/doctor/surgical-cases/surgeons')
      .then((r) => r.json())
      .then((d) => setSurgeons(d.surgeons ?? []))
      .catch(() => setSurgeons([]))
      .finally(() => setLoadingSurgeons(false));
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoadingStaff(true);
      try {
        const [doctorsRes, nursesRes] = await Promise.all([
          fetch('/api/theater-tech/staff?role=DOCTOR'),
          fetch('/api/theater-tech/staff?role=NURSE'),
        ]);
        const doctorsJson = await doctorsRes.json();
        const nursesJson = await nursesRes.json();
        setStaffDoctors(doctorsJson?.data ?? []);
        setStaffNurses(nursesJson?.data ?? []);
      } catch {
        setStaffDoctors([]);
        setStaffNurses([]);
      } finally {
        setLoadingStaff(false);
      }
    };
    void load();
  }, []);

  const fetchProcedures = useCallback(
    async (category: string) => {
      if (!category || category === 'OTHER') {
        setProcedures([]);
        return;
      }
      setLoadingProcedures(true);
      try {
        const res = await fetch(
          `/api/doctor/surgical-cases/${caseId}/procedures?category=${encodeURIComponent(category)}`,
        );
        const data = await res.json();
        setProcedures(data.procedures ?? []);
      } catch {
        setProcedures([]);
      } finally {
        setLoadingProcedures(false);
      }
    },
    [caseId],
  );

  useEffect(() => {
    if (form.procedureCategory) void fetchProcedures(form.procedureCategory);
  }, [form.procedureCategory, fetchProcedures]);

  const surgeonOptions: SearchableOption[] = useMemo(
    () => surgeons.map((s) => ({ id: s.id, label: s.name })),
    [surgeons],
  );

  const procedureOptions: SearchableOption[] = useMemo(
    () =>
      procedures.map((p) => ({
        id: p.id,
        label: p.name,
        description: p.description ?? undefined,
      })),
    [procedures],
  );

  const canSave =
    Boolean(form.procedureDate) &&
    Boolean(form.primarySurgeonId) &&
    Boolean(form.diagnosis.trim()) &&
    Boolean(form.procedureCategory) &&
    (form.procedureCategory !== 'OTHER' || Boolean(customProcedureCategory.trim())) &&
    Boolean(form.primaryOrRevision) &&
    form.procedureIds.length > 0 &&
    Boolean(form.anaesthesiaType);

  const patch = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSavedFlash(false);
  };

  const handleSave = async () => {
    if (!canSave) {
      setError('Complete the required schedule fields before saving.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const customAnesthesiologist = form.anesthesiologistUserId.startsWith('__custom__:')
        ? form.anesthesiologistUserId.replace('__custom__:', '')
        : null;
      const customScrubNurse = form.scrubNurseUserId.startsWith('__custom__:')
        ? form.scrubNurseUserId.replace('__custom__:', '')
        : null;
      const customCirculatingNurse = form.circulatingNurseUserId.startsWith('__custom__:')
        ? form.circulatingNurseUserId.replace('__custom__:', '')
        : null;
      const customPrimarySurgeonName = form.primarySurgeonId.startsWith('__custom__:')
        ? form.primarySurgeonId.replace('__custom__:', '')
        : null;
      const customAssistantSurgeonNames = form.assistantSurgeonIds
        .filter((id) => id.startsWith('__custom__:'))
        .map((id) => id.replace('__custom__:', ''));
      const customProcedureNames = form.procedureIds
        .filter((id) => id.startsWith('__custom__:'))
        .map((id) => id.replace('__custom__:', ''));

      const page1Res = await fetch(`/api/doctor/surgical-cases/${caseId}/plan/page1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedureDate: form.procedureDate,
          primarySurgeonId: customPrimarySurgeonName ? null : form.primarySurgeonId || null,
          assistantSurgeonIds: form.assistantSurgeonIds.filter((id) => !id.startsWith('__custom__:')),
          anesthesiologistUserId: customAnesthesiologist ? null : form.anesthesiologistUserId || null,
          scrubNurseUserId: customScrubNurse ? null : form.scrubNurseUserId || null,
          circulatingNurseUserId: customCirculatingNurse ? null : form.circulatingNurseUserId || null,
          customPrimarySurgeonName: customPrimarySurgeonName || null,
          customAssistantSurgeonNames:
            customAssistantSurgeonNames.length > 0 ? customAssistantSurgeonNames : null,
          customAnesthesiologistName: customAnesthesiologist,
          customScrubNurseName: customScrubNurse,
          customCirculatingNurseName: customCirculatingNurse,
          customProcedureCategory: customProcedureCategory || null,
          customProcedureNames: customProcedureNames.length > 0 ? customProcedureNames : null,
          diagnosis: form.diagnosis,
          procedureCategory:
            form.procedureCategory === 'OTHER' && customProcedureCategory
              ? 'OTHER'
              : form.procedureCategory,
          primaryOrRevision: form.primaryOrRevision,
          procedureIds: form.procedureIds.filter((id) => !id.startsWith('__custom__:')),
        }),
      });
      const page1 = await page1Res.json();
      if (!page1.success) throw new Error(page1.error || 'Failed to save schedule');

      const page2Res = await fetch(`/api/doctor/surgical-cases/${caseId}/plan/page2`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anaesthesiaType: form.anaesthesiaType,
          skinToSkinMinutes: form.skinToSkinMinutes
            ? parseInt(form.skinToSkinMinutes, 10)
            : undefined,
          totalTheatreMinutes: form.totalTheatreMinutes
            ? parseInt(form.totalTheatreMinutes, 10)
            : undefined,
          admissionType: form.admissionType || undefined,
        }),
      });
      const page2 = await page2Res.json();
      if (!page2.success) throw new Error(page2.error || 'Failed to save logistics');

      setSavedFlash(true);
      toast.success('Case plan saved');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save case plan';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-6">
      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <Section title="Schedule">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Procedure date" required>
            <Input
              type="date"
              className="h-10"
              value={form.procedureDate}
              onChange={(e) => patch('procedureDate', e.target.value)}
            />
          </Field>

          <Field label="Case type" required>
            <div className="flex flex-wrap gap-2">
              {CASE_TYPES.map((opt) => (
                <ChoicePill
                  key={opt.value}
                  selected={form.primaryOrRevision === opt.value}
                  onClick={() => patch('primaryOrRevision', opt.value)}
                >
                  {opt.label}
                </ChoicePill>
              ))}
            </div>
          </Field>

          <Field label="Diagnosis" required className="md:col-span-2">
            <textarea
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-[#caa26a] focus:outline-none focus:ring-2 focus:ring-[#caa26a]/25"
              placeholder="Pre-operative diagnosis"
              value={form.diagnosis}
              onChange={(e) => patch('diagnosis', e.target.value)}
            />
          </Field>

          <Field
            label="Procedure category"
            required
            className="md:col-span-2"
          >
            <SearchableSelect
              options={CATEGORIES.map((c) => ({ id: c.value, label: c.label }))}
              value={
                form.procedureCategory === 'OTHER' && customProcedureCategory
                  ? `__custom__:${customProcedureCategory}`
                  : form.procedureCategory
              }
              onChange={(id) => {
                setError(null);
                setSavedFlash(false);
                if (!id) {
                  setForm((prev) => ({ ...prev, procedureCategory: '', procedureIds: prev.procedureIds }));
                  setCustomProcedureCategory('');
                  return;
                }
                if (id.startsWith('__custom__:')) {
                  const name = id.replace('__custom__:', '');
                  setCustomProcedureCategory(name);
                  setForm((prev) => ({ ...prev, procedureCategory: 'OTHER' }));
                  return;
                }
                setCustomProcedureCategory('');
                setForm((prev) => ({
                  ...prev,
                  procedureCategory: id,
                  // Keep typed procedures; only clear catalog IDs when switching known categories
                  procedureIds: prev.procedureIds.filter((pid) => pid.startsWith('__custom__:')),
                }));
              }}
              placeholder="Type category…"
              customPlaceholder="e.g. Facial, Body, or your own label…"
              emptyText="No matches"
              allowCustom
            />
          </Field>

          <Field
            label="Procedures"
            required
            className="md:col-span-2"
          >
            <SearchableMultiSelect
              options={procedureOptions}
              value={form.procedureIds}
              onChange={(ids) => patch('procedureIds', ids)}
              placeholder="Type a procedure name…"
              customPlaceholder="Procedure…"
              emptyText="No matches"
              loading={loadingProcedures}
              allowCustom
            />
          </Field>
        </div>
      </Section>

      <Section title="Team">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Primary surgeon" required>
            <SearchableSelect
              options={surgeonOptions}
              value={form.primarySurgeonId}
              onChange={(id) =>
                setForm((prev) => ({
                  ...prev,
                  primarySurgeonId: id,
                  assistantSurgeonIds: prev.assistantSurgeonIds.filter((aid) => aid !== id),
                }))
              }
              placeholder="Type surgeon name…"
              customPlaceholder="Type surgeon name…"
              emptyText="No matches"
              loading={loadingSurgeons}
              allowCustom
            />
          </Field>

          <Field label="Assistant surgeons">
            <SearchableMultiSelect
              options={surgeonOptions.filter((s) => s.id !== form.primarySurgeonId)}
              value={form.assistantSurgeonIds}
              onChange={(ids) => patch('assistantSurgeonIds', ids)}
              placeholder="Type assistant name…"
              customPlaceholder="Assistant…"
              emptyText="No matches"
              loading={loadingSurgeons}
              allowCustom
            />
          </Field>

          <Field label="Anaesthesiologist">
            <StaffCombobox
              options={staffDoctors}
              isLoading={loadingStaff}
              value={form.anesthesiologistUserId}
              onChange={(id) => patch('anesthesiologistUserId', id)}
              placeholder="Type name…"
              customPlaceholder="Type anaesthesiologist name…"
              emptyText="No matches"
            />
          </Field>

          <Field label="Scrub nurse">
            <StaffCombobox
              options={staffNurses}
              isLoading={loadingStaff}
              value={form.scrubNurseUserId}
              onChange={(id) => patch('scrubNurseUserId', id)}
              placeholder="Type name…"
              customPlaceholder="Type scrub nurse name…"
              emptyText="No matches"
            />
          </Field>

          <Field label="Circulating nurse">
            <StaffCombobox
              options={staffNurses}
              isLoading={loadingStaff}
              value={form.circulatingNurseUserId}
              onChange={(id) => patch('circulatingNurseUserId', id)}
              placeholder="Type name…"
              customPlaceholder="Type circulating nurse name…"
              emptyText="No matches"
            />
          </Field>
        </div>
      </Section>

      <Section title="Theatre logistics">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Anaesthesia" required className="md:col-span-2">
            <div className="flex flex-wrap gap-2">
              {ANAESTHESIAS.map((opt) => (
                <ChoicePill
                  key={opt.value}
                  selected={form.anaesthesiaType === opt.value}
                  onClick={() => patch('anaesthesiaType', opt.value)}
                >
                  {opt.label}
                </ChoicePill>
              ))}
            </div>
          </Field>

          <Field label="Admission">
            <div className="flex flex-wrap gap-2">
              {ADMISSION_TYPES.map((opt) => (
                <ChoicePill
                  key={opt.value}
                  selected={form.admissionType === opt.value}
                  onClick={() =>
                    patch(
                      'admissionType',
                      form.admissionType === opt.value ? '' : opt.value,
                    )
                  }
                >
                  {opt.label}
                </ChoicePill>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:col-span-2">
            <Field label="Skin-to-skin (minutes)">
              <Input
                type="number"
                min={0}
                className="h-10"
                placeholder="e.g. 120"
                value={form.skinToSkinMinutes}
                onChange={(e) => patch('skinToSkinMinutes', e.target.value)}
              />
            </Field>
            <Field label="Total theatre (minutes)">
              <Input
                type="number"
                min={0}
                className="h-10"
                placeholder="e.g. 180"
                value={form.totalTheatreMinutes}
                onChange={(e) => patch('totalTheatreMinutes', e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-[#f7f4ef]/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[#f7f4ef]/85 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-xs text-slate-500 sm:block">
            {savedFlash ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5" />
                Saved
              </span>
            ) : (
              'Changes apply to this surgical case only.'
            )}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="text-slate-600"
              onClick={() => router.push('/doctor/surgical-cases')}
            >
              Back to cases
            </Button>
            <Button
              type="button"
              disabled={saving || !canSave}
              onClick={() => void handleSave()}
              className="gap-2 bg-[#2c2e4b] text-white hover:bg-[#3a3d63]"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save plan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
