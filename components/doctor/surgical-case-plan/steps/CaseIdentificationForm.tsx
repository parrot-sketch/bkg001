'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StepProps, Surgeon, Procedure } from './types';
import { TeamSelectionPanel } from './TeamSelectionPanel';

export interface CaseIdentificationFormProps extends StepProps {
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

export function CaseIdentificationForm({
  caseId,
  onComplete,
  onError,
  initialData,
  onProceduresConfirmed,
  isTheaterTech = false,
}: CaseIdentificationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [surgeons, setSurgeons] = useState<Surgeon[]>([]);
  const [isLoadingSurgeons, setIsLoadingSurgeons] = useState(true);
  const [staffDoctors, setStaffDoctors] = useState<Array<{ id: string; fullName: string; email: string; role: string }>>([]);
  const [staffNurses, setStaffNurses] = useState<Array<{ id: string; fullName: string; email: string; role: string }>>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(false);

  const initialPrimary =
    initialData?.surgeonId ||
    initialData?.surgeonIds?.[0] ||
    '';
  const initialAssistants =
    initialData?.assistantSurgeonIds && initialData.assistantSurgeonIds.length > 0
      ? initialData.assistantSurgeonIds
      : (initialData?.surgeonIds ?? []).filter((id) => id !== initialPrimary);

  const [formData, setFormData] = useState({
    procedureDate:
      initialData?.procedureDate?.toISOString().split('T')[0] ?? '',
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

  const isTeamLocked = !isTheaterTech && !!initialPrimary;

  // Fetch surgeons once
  useEffect(() => {
    fetch('/api/doctor/surgical-cases/surgeons')
      .then((r) => r.json())
      .then((d) => setSurgeons(d.surgeons ?? []))
      .catch((err) => console.error('Error fetching surgeons:', err))
      .finally(() => setIsLoadingSurgeons(false));
  }, []);

  // Fetch staff lists for theater-tech team selection
  useEffect(() => {
    if (!isTheaterTech) return;

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
  }, [isTheaterTech]);

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

  const toggleProcedure = (proc: Procedure) => {
    setFormData((prev) => {
      const isSelected = prev.procedureIds.includes(proc.id);
      return {
        ...prev,
        procedureIds: isSelected
          ? prev.procedureIds.filter((pid) => pid !== proc.id)
          : [...prev.procedureIds, proc.id],
      };
    });
  };

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

      const res = await fetch(
        `/api/doctor/surgical-cases/${caseId}/plan/page1`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            procedureDate: formData.procedureDate,
            primarySurgeonId: formData.primarySurgeonId,
            assistantSurgeonIds: formData.assistantSurgeonIds,
            anesthesiologistUserId: customAnesthesiologist ? null : (formData.anesthesiologistUserId || null),
            scrubNurseUserId: customScrubNurse ? null : (formData.scrubNurseUserId || null),
            circulatingNurseUserId: customCirculatingNurse ? null : (formData.circulatingNurseUserId || null),
            customAnesthesiologistName: customAnesthesiologist,
            customScrubNurseName: customScrubNurse,
            customCirculatingNurseName: customCirculatingNurse,
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

      // Pass the selected procedure objects up so Step 3 can derive suggested services
      const selected = procedures.filter((p) =>
        formData.procedureIds.includes(p.id)
      );
      if (onProceduresConfirmed) onProceduresConfirmed(selected);
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
    { value: 'FACE_AND_NECK', label: 'Face & Neck' },
    { value: 'BODY_CONTOURING', label: 'Body Contouring' },
    { value: 'INTIMATE_AESTHETIC', label: 'Intimate Aesthetic' },
    { value: 'HAIR_RESTORATION', label: 'Hair Restoration' },
    { value: 'NON_SURGICAL', label: 'Non Surgical' },
    { value: 'POST_WEIGHT_LOSS', label: 'Post Weight Loss' },
    { value: 'OTHER', label: 'Other' },
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
          Primary Surgeon <span className="text-rose-500">*</span>
        </p>
        {isTeamLocked && (
          <p className="text-xs text-slate-500 mb-2">
            Assigned during case planning (theater tech). Editing is locked.
          </p>
        )}
        {isLoadingSurgeons ? (
          <div className="flex items-center gap-2 py-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading surgeons…</span>
          </div>
        ) : (
          <div className="border rounded-lg p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 md:max-h-64 overflow-y-auto">
              {surgeons.map((surgeon) => (
                <label
                  key={surgeon.id}
                  className="flex items-start gap-2 p-2.5 md:p-2 rounded hover:bg-slate-50 cursor-pointer touch-manipulation"
                >
                  <input
                    type="radio"
                    name="primarySurgeon"
                    checked={formData.primarySurgeonId === surgeon.id}
                    disabled={isTeamLocked}
                    onChange={() =>
                      setFormData((prev) => ({
                        ...prev,
                        primarySurgeonId: surgeon.id,
                        assistantSurgeonIds: prev.assistantSurgeonIds.filter((id) => id !== surgeon.id),
                      }))
                    }
                    className="h-5 w-5 md:h-4 md:w-4 rounded-full border-slate-300 text-slate-800 focus:ring-slate-800 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">{surgeon.name}</p>
                    <p className="text-xs text-slate-500">Primary surgeon</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
        {!formData.primarySurgeonId && (
          <p className="text-xs text-rose-500 mt-1">Select a primary surgeon</p>
        )}
      </div>

      {/* Assistant Surgeons */}
      <div>
        <p className="block text-sm font-medium text-slate-700 mb-2">
          Assistant Surgeons <span className="text-slate-400 font-normal text-xs">(optional)</span>
        </p>
        {isLoadingSurgeons ? (
          <div className="flex items-center gap-2 py-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading surgeons…</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 md:max-h-64 overflow-y-auto border rounded-lg p-2">
            {surgeons
              .filter((s) => s.id !== formData.primarySurgeonId)
              .map((surgeon) => (
                <label
                  key={surgeon.id}
                  className="flex items-start gap-2 p-2.5 md:p-2 rounded hover:bg-slate-50 cursor-pointer touch-manipulation"
                >
                  <input
                    type="checkbox"
                    checked={formData.assistantSurgeonIds.includes(surgeon.id)}
                    disabled={isTeamLocked}
                    onChange={() =>
                      setFormData((prev) => {
                        const ids = prev.assistantSurgeonIds.includes(surgeon.id)
                          ? prev.assistantSurgeonIds.filter((id) => id !== surgeon.id)
                          : [...prev.assistantSurgeonIds, surgeon.id];
                        return { ...prev, assistantSurgeonIds: ids };
                      })
                    }
                    className="h-5 w-5 md:h-4 md:w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-800 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">{surgeon.name}</p>
                  </div>
                </label>
              ))}
          </div>
        )}
      </div>

      {/* Team Selection (Theater Tech) */}
      {isTheaterTech && (
        <TeamSelectionPanel
          staffDoctors={staffDoctors}
          staffNurses={staffNurses}
          isLoading={isLoadingStaff}
          value={{
            anesthesiologistUserId: formData.anesthesiologistUserId,
            scrubNurseUserId: formData.scrubNurseUserId,
            circulatingNurseUserId: formData.circulatingNurseUserId,
          }}
          onChange={(next) =>
            setFormData((p) => ({
              ...p,
              anesthesiologistUserId: next.anesthesiologistUserId,
              scrubNurseUserId: next.scrubNurseUserId,
              circulatingNurseUserId: next.circulatingNurseUserId,
            }))
          }
        />
      )}

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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
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
              ({formData.procedureIds.length > 0
                ? `${formData.procedureIds.length} selected`
                : 'select at least one'})
            </span>
          </label>
          {isLoadingProcedures ? (
            <div className="flex items-center gap-2 py-4 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading procedures…</span>
            </div>
          ) : procedures.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 border border-dashed border-slate-200 rounded-lg text-center">
              No procedures found for this category.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto pr-1">
              {procedures.map((proc) => {
                const isSelected = formData.procedureIds.includes(proc.id);
                const activeLinks = proc.procedure_service_links?.filter(
                  (l) => l.is_active
                ) ?? [];
                const priceText =
                  proc.min_price && proc.max_price
                    ? `KES ${proc.min_price.toLocaleString()} – ${proc.max_price.toLocaleString()}`
                    : proc.default_price
                    ? `KES ${proc.default_price.toLocaleString()}`
                    : null;

                return (
                  <button
                    key={proc.id}
                    type="button"
                    onClick={() => toggleProcedure(proc)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-all touch-manipulation',
                      isSelected
                        ? 'border-slate-800 bg-slate-800 text-white shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox indicator */}
                      <div
                        className={cn(
                          'mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center',
                          isSelected
                            ? 'border-white bg-white'
                            : 'border-slate-300'
                        )}
                      >
                        {isSelected && (
                          <CheckCircle2 className="h-3 w-3 text-slate-800" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Name + category */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium leading-tight">
                            {proc.name}
                          </span>
                          {proc.description && (
                            <span
                              className={cn(
                                'text-xs truncate max-w-xs',
                                isSelected ? 'text-slate-300' : 'text-slate-400'
                              )}
                            >
                              {proc.description}
                            </span>
                          )}
                        </div>

                        {/* Meta row: duration + price */}
                        {(proc.estimated_duration_minutes || priceText) && (
                          <div
                            className={cn(
                              'flex items-center gap-3 mt-1 text-xs',
                              isSelected ? 'text-slate-300' : 'text-slate-500'
                            )}
                          >
                            {proc.estimated_duration_minutes && (
                              <span className="flex items-center gap-1">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round"/></svg>
                                {proc.estimated_duration_minutes} min
                              </span>
                            )}
                            {priceText && (
                              <span className="font-mono">{priceText}</span>
                            )}
                          </div>
                        )}

                        {/* Linked service pills */}
                        {activeLinks.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {activeLinks.slice(0, 4).map((link) => (
                              <span
                                key={link.id}
                                className={cn(
                                  'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
                                  link.is_primary
                                    ? isSelected
                                      ? 'bg-white/20 border-white/30 text-white'
                                      : 'bg-slate-100 border-slate-300 text-slate-700'
                                    : isSelected
                                    ? 'bg-white/10 border-white/20 text-slate-200'
                                    : 'bg-slate-50 border-slate-200 text-slate-500'
                                )}
                              >
                                {link.service_name}
                              </span>
                            ))}
                            {activeLinks.length > 4 && (
                              <span
                                className={cn(
                                  'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border',
                                  isSelected
                                    ? 'border-white/20 text-slate-300'
                                    : 'border-slate-200 text-slate-400'
                                )}
                              >
                                +{activeLinks.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
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
            !formData.primarySurgeonId
          }
        >
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save & Continue
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </form>
  );
}
