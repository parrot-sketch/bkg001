'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { doctorApi } from '@/lib/api/doctor';
import { frontdeskApi, type SurgicalTeamMemberInput } from '@/lib/api/frontdesk';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

export interface CaseTeamMember {
  name: string;
  doctorId?: string;
  /** Directory user id, used to relink an assistant who was already saved on the case. */
  userId?: string;
}

export interface SurgicalCaseSetupInitial {
  diagnosis?: string | null;
  primaryOrRevision?: string | null;
  admissionType?: string | null;
  primary?: CaseTeamMember | null;
  assistants?: CaseTeamMember[];
}

interface SurgicalCaseSetupFormProps {
  caseId: string;
  initial?: SurgicalCaseSetupInitial;
  onSaved?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  /** Team update only edits the roster. Diagnosis and admission stay on the case record. */
  fields?: 'team' | 'full';
}

interface TeamPick {
  key: string;
  name: string;
  doctorId?: string;
  userId?: string;
}

function toPick(member: CaseTeamMember, index: number): TeamPick {
  return {
    key: member.doctorId || member.userId || `external:${index}:${member.name.toLowerCase()}`,
    name: member.name,
    doctorId: member.doctorId,
    userId: member.userId,
  };
}

export function SurgicalCaseSetupForm({
  caseId,
  initial,
  onSaved,
  onCancel,
  cancelLabel = 'Cancel',
  submitLabel,
  fields = 'full',
}: SurgicalCaseSetupFormProps) {
  const saveLabel = submitLabel ?? (fields === 'team' ? 'Save team' : 'Save details');
  const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [primarySurgeon, setPrimarySurgeon] = useState<TeamPick | null>(initial?.primary ? toPick(initial.primary, 0) : null);
  const [assistants, setAssistants] = useState<TeamPick[]>((initial?.assistants ?? []).map(toPick));
  const [diagnosis, setDiagnosis] = useState(initial?.diagnosis ?? '');
  const [primaryOrRevision, setPrimaryOrRevision] = useState(initial?.primaryOrRevision ?? '');
  const [admissionType, setAdmissionType] = useState(initial?.admissionType ?? '');

  useEffect(() => {
    let cancelled = false;
    doctorApi.getAllDoctors().then((response) => {
      if (cancelled || !response.success || !response.data) return;
      const directory = response.data;
      setDoctors(directory);
      setAssistants((current) => current.map((pick) => {
        if (pick.doctorId || !pick.userId) return pick;
        const match = directory.find((doctor) => doctor.userId === pick.userId);
        return match ? { ...pick, key: match.id, doctorId: match.id } : pick;
      }));
      setPrimarySurgeon((current) => {
        if (!current || current.doctorId || !current.userId) return current;
        const match = directory.find((doctor) => doctor.userId === current.userId);
        return match ? { ...current, key: match.id, doctorId: match.id } : current;
      });
    }).catch((error) => console.error('Failed to load doctors:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const hasTeam = Boolean(primarySurgeon) || assistants.length > 0;
    const hasClinical = fields === 'full' && Boolean(diagnosis.trim() || primaryOrRevision || admissionType);
    if (!hasTeam && !hasClinical) {
      onSaved?.();
      return;
    }

    const primary: SurgicalTeamMemberInput | null = primarySurgeon
      ? { name: primarySurgeon.name, doctorId: primarySurgeon.doctorId }
      : null;

    setIsSubmitting(true);
    try {
      const response = await frontdeskApi.updateSurgicalCase(caseId, {
        ...(fields === 'full' && diagnosis.trim() ? { diagnosis: diagnosis.trim() } : {}),
        ...(fields === 'full' && primaryOrRevision ? { primaryOrRevision } : {}),
        ...(fields === 'full' && admissionType ? { admissionType } : {}),
        ...(hasTeam
          ? {
              team: {
                primary,
                assistants: assistants.map((member) => ({ name: member.name, doctorId: member.doctorId })),
              },
            }
          : {}),
      });
      if (!response.success) {
        toast.error(response.error || 'Failed to save case details');
        return;
      }
      toast.success(fields === 'team' ? 'Surgical team saved' : 'Surgical team and details saved');
      onSaved?.();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save case details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <TeamField
        label="Primary surgeon"
        placeholder="Type a surgeon name"
        doctors={doctors}
        selected={primarySurgeon ? [primarySurgeon] : []}
        single
        onAdd={setPrimarySurgeon}
        onRemove={() => setPrimarySurgeon(null)}
      />
      <TeamField
        label="Assistants"
        placeholder="Type an assistant name"
        doctors={doctors}
        selected={assistants}
        excludeIds={new Set([primarySurgeon?.doctorId].filter((id): id is string => Boolean(id)))}
        onAdd={(pick) => setAssistants((prev) => (prev.some((item) => item.key === pick.key) ? prev : [...prev, pick]))}
        onRemove={(key) => setAssistants((prev) => prev.filter((item) => item.key !== key))}
      />
      <p className="text-[11px] text-muted-foreground">
        Directory names stay linked to that doctor. Any other name is recorded on this case only.
      </p>
      {fields === 'full' && (
      <>
      <div className="space-y-2">
        <Label htmlFor={`${caseId}-diagnosis`}>Diagnosis</Label>
        <Input id={`${caseId}-diagnosis`} value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} placeholder="Enter diagnosis" className="h-11" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Primary / revision</Label>
          <Select value={primaryOrRevision} onValueChange={setPrimaryOrRevision}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PRIMARY">Primary</SelectItem>
              <SelectItem value="REVISION">Revision</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Admission</Label>
          <Select value={admissionType} onValueChange={setAdmissionType}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DAYCASE">Daycase</SelectItem>
              <SelectItem value="OVERNIGHT">Overnight</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      </>
      )}
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>{cancelLabel}</Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : saveLabel}
        </Button>
      </div>
    </form>
  );
}

function TeamField({
  label,
  placeholder,
  doctors,
  selected,
  single,
  excludeIds,
  onAdd,
  onRemove,
}: {
  label: string;
  placeholder: string;
  doctors: DoctorResponseDto[];
  selected: TeamPick[];
  single?: boolean;
  excludeIds?: Set<string>;
  onAdd: (pick: TeamPick) => void;
  onRemove: (key: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const normalized = query.trim().toLowerCase();
  const matches = doctors
    .filter((doctor) => {
      if (excludeIds?.has(doctor.id) || selected.some((item) => item.doctorId === doctor.id)) return false;
      if (!normalized) return false;
      return doctor.name.toLowerCase().includes(normalized);
    })
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(normalized) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(normalized) ? 0 : 1;
      return aStarts - bStarts || a.name.localeCompare(b.name);
    })
    .slice(0, 6);
  const exactDoctor = doctors.some((doctor) => doctor.name.toLowerCase() === normalized);
  const showCreate = normalized.length >= 2 && !exactDoctor && !selected.some((item) => item.name.toLowerCase() === normalized);

  const addDoctor = (doctor: DoctorResponseDto) => {
    onAdd({ key: doctor.id, name: doctor.name, doctorId: doctor.id });
    setQuery('');
    setOpen(false);
  };

  const addExternal = () => {
    const name = query.trim();
    if (name.length < 2) return;
    onAdd({ key: `external:${name.toLowerCase()}`, name });
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((member) => (
            <span key={member.key} className="inline-flex items-center gap-1 border border-border bg-secondary/10 px-2 py-1 text-xs font-medium text-foreground">
              {member.name}
              {!member.doctorId && !member.userId && <span className="text-muted-foreground">external</span>}
              <button type="button" onClick={() => onRemove(member.key)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {!(single && selected.length > 0) && (
        <div className="relative">
          <Input
            value={query}
            placeholder={placeholder}
            autoComplete="off"
            className="h-11"
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              if (matches[0] && matches[0].name.toLowerCase().startsWith(normalized)) addDoctor(matches[0]);
              else if (showCreate) addExternal();
            }}
          />
          {open && normalized.length >= 2 && (matches.length > 0 || showCreate) && (
            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto border border-border bg-popover shadow-lg">
              {matches.map((doctor) => (
                <button
                  key={doctor.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => addDoctor(doctor)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-foreground hover:bg-[#e7d6bf]/30"
                >
                  <span>{doctor.name}</span>
                  <span className="text-xs text-muted-foreground">{doctor.specialization}</span>
                </button>
              ))}
              {showCreate && (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={addExternal}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-[#e7d6bf]/30"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add “{query.trim()}” to the team
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
