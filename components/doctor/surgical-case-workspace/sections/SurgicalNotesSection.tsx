'use client';

/**
 * Doctor Surgical Notes — type-first narrative + clinical planning text.
 * Stores only on CasePlan. Never touches nurse NOR / recovery / ward forms.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useDoctorSurgicalCaseWorkspace } from '@/components/doctor/surgical-case-workspace/DoctorSurgicalCaseContext';
import { apiClient } from '@/lib/api/client';

type NotesPayload = {
  surgeon_narrative?: string | null;
  procedure_plan?: string | null;
  risk_factors?: string | null;
  planned_anesthesia?: string | null;
  pre_op_notes?: string | null;
  post_op_instructions?: string | null;
  special_instructions?: string | null;
};

function TypeArea({
  label,
  hint,
  value,
  onChange,
  rows = 4,
  placeholder,
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-600">{label}</Label>
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
      <textarea
        rows={rows}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900',
          'placeholder:text-slate-400 focus:border-[#caa26a] focus:outline-none focus:ring-2 focus:ring-[#caa26a]/25',
          disabled && 'opacity-60',
        )}
      />
    </div>
  );
}

export function SurgicalNotesSection() {
  const router = useRouter();
  const { caseId } = useDoctorSurgicalCaseWorkspace();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const [narrative, setNarrative] = useState('');
  const [procedurePlan, setProcedurePlan] = useState('');
  const [riskFactors, setRiskFactors] = useState('');
  const [plannedAnesthesia, setPlannedAnesthesia] = useState('');
  const [preOpNotes, setPreOpNotes] = useState('');
  const [postOp, setPostOp] = useState('');
  const [special, setSpecial] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiClient.get<NotesPayload>(
        `/doctor/surgical-cases/${caseId}/notes`,
      );
      if (!json.success) throw new Error(json.error || 'Failed to load notes');

      const d = (json.data || {}) as NotesPayload;
      setCanEdit((json.meta as { canEdit?: boolean } | undefined)?.canEdit ?? true);
      setNarrative(d.surgeon_narrative || '');
      setProcedurePlan(d.procedure_plan || '');
      setRiskFactors(d.risk_factors || '');
      setPlannedAnesthesia(d.planned_anesthesia || '');
      setPreOpNotes(d.pre_op_notes || '');
      setPostOp(d.post_op_instructions || '');
      setSpecial(d.special_instructions || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (andContinue = false) => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    setSavedFlash(false);
    try {
      const json = await apiClient.put(`/doctor/surgical-cases/${caseId}/notes`, {
        content: narrative,
        procedure_plan: procedurePlan,
        risk_factors: riskFactors,
        planned_anesthesia: plannedAnesthesia,
        pre_op_notes: preOpNotes,
        post_op_instructions: postOp,
        special_instructions: special,
      });
      if (!json.success) throw new Error(json.error || 'Failed to save');
      setSavedFlash(true);
      toast.success('Surgical notes saved');
      if (andContinue) {
        router.push(`/doctor/surgical-cases/${caseId}/operative-record`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        <p className="mt-3 text-sm">Loading surgical notes…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#caa26a]">
          Doctor document
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#2c2e4b]">Surgical Notes</h1>
        <p className="max-w-2xl text-sm text-slate-500">
          Your clinical narrative and planning text for this case. This is not the nurse operation
          record — type freely; nothing here requires a catalog pick.
        </p>
      </header>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {!canEdit ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          View only — you are not the primary or invited surgeon on this case.
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6">
        <TypeArea
          label="Surgeon narrative"
          hint="Main free-text note for this case"
          value={narrative}
          onChange={setNarrative}
          rows={10}
          placeholder="Type findings, plan, and narrative…"
          disabled={!canEdit}
        />
      </section>

      <section className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6">
        <div>
          <h2 className="text-base font-semibold text-[#2c2e4b]">Clinical planning</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Optional structured fields used for readiness — still type-first.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TypeArea
            label="Procedure plan"
            value={procedurePlan}
            onChange={setProcedurePlan}
            placeholder="Type the planned procedure approach…"
            disabled={!canEdit}
          />
          <TypeArea
            label="Risk factors"
            value={riskFactors}
            onChange={setRiskFactors}
            placeholder="Type assessed risks…"
            disabled={!canEdit}
          />
          <TypeArea
            label="Planned anaesthesia"
            value={plannedAnesthesia}
            onChange={setPlannedAnesthesia}
            placeholder="Type anaesthesia plan…"
            disabled={!canEdit}
          />
          <TypeArea
            label="Pre-op notes"
            value={preOpNotes}
            onChange={setPreOpNotes}
            placeholder="Type pre-operative notes…"
            disabled={!canEdit}
          />
          <TypeArea
            label="Post-op instructions"
            value={postOp}
            onChange={setPostOp}
            placeholder="Type post-operative instructions…"
            disabled={!canEdit}
          />
          <TypeArea
            label="Special instructions"
            value={special}
            onChange={setSpecial}
            placeholder="Type any special instructions…"
            disabled={!canEdit}
          />
        </div>
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-[#f7f4ef]/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {savedFlash ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5" />
                Saved
              </span>
            ) : (
              'Doctor CasePlan document only'
            )}
          </p>
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving || !canEdit}
              onClick={() => void save(false)}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
            <Button
              type="button"
              disabled={saving || !canEdit}
              onClick={() => void save(true)}
              className="bg-[#2c2e4b] text-white hover:bg-[#3a3d63]"
            >
              Save &amp; continue to Operative Note
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
