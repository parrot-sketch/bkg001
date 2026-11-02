'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import PhoneInput from 'react-phone-number-input';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/constants/queryKeys';
import { PatientCombobox } from '@/components/frontdesk/PatientCombobox';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { ProcedureOption, ScheduleProcedureResponse } from '@/lib/api/frontdesk';
import { SurgicalCaseSetupForm } from '@/components/frontdesk/SurgicalCaseSetupForm';
import {
  categoryLabel,
  pickSuggestionOnEnter,
  PROCEDURE_CATEGORY_LABELS,
  rankProcedures,
  rankTextSuggestions,
  resolveCatalogCategory,
} from '@/lib/clinical/procedureSuggestions';

interface ScheduleProcedureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (data: ScheduleProcedureResponse) => void;
  initialPatient?: PatientResponseDto | null;
}

type DialogStep = 'schedule' | 'register' | 'details';

interface SelectedProcedure {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
}

type ScheduledCase = ScheduleProcedureResponse;

const inputClass = 'h-11';

export function ScheduleProcedureDialog({ open, onOpenChange, onSuccess, initialPatient }: ScheduleProcedureDialogProps) {
  const queryClient = useQueryClient();
  const wasOpen = useRef(false);
  const reportedSuccess = useRef(false);

  const [step, setStep] = useState<DialogStep>('schedule');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [catalog, setCatalog] = useState<ProcedureOption[]>([]);

  const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(null);
  const [procedureDate, setProcedureDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedProcedures, setSelectedProcedures] = useState<SelectedProcedure[]>([]);
  const [procedureQuery, setProcedureQuery] = useState('');
  const [procedureOpen, setProcedureOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [creatingProcedure, setCreatingProcedure] = useState(false);

  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'FEMALE',
    phone: '',
  });
  const [registerError, setRegisterError] = useState<string | null>(null);

  const [scheduledCase, setScheduledCase] = useState<ScheduledCase | null>(null);

  useEffect(() => {
    if (open && !wasOpen.current) {
      reset(initialPatient ?? null);
      void loadReferenceData();
    }
    wasOpen.current = open;
  }, [open, initialPatient]);

  const procedureSuggestions = useMemo(
    () => rankProcedures(procedureQuery, catalog).filter((item) => !selectedProcedures.some((selected) => selected.id === item.id)),
    [procedureQuery, catalog, selectedProcedures],
  );
  const trimmedProcedure = procedureQuery.trim();
  const addingNewProcedure = trimmedProcedure.length >= 2
    && !catalog.some((item) => item.name.toLowerCase() === trimmedProcedure.toLowerCase());

  const categorySuggestions = useMemo(() => {
    const labels = [
      ...Object.values(PROCEDURE_CATEGORY_LABELS),
      ...catalog.map((item) => item.subcategory).filter((value): value is string => Boolean(value)),
    ];
    return rankTextSuggestions(categoryQuery, labels, 6);
  }, [categoryQuery, catalog]);

  const loadReferenceData = async () => {
    try {
      const procedures = await frontdeskApi.getProcedureOptions();
      if (procedures.success && procedures.data) setCatalog(procedures.data);
    } catch (error) {
      console.error('Failed to load scheduling reference data:', error);
    }
  };

  const reset = (patient: PatientResponseDto | null) => {
    setStep('schedule');
    setIsSubmitting(false);
    setSelectedPatient(patient);
    setProcedureDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedProcedures([]);
    setProcedureQuery('');
    setProcedureOpen(false);
    setCategoryQuery('');
    setCategoryOpen(false);
    setCreatingProcedure(false);
    setRegisterError(null);
    setScheduledCase(null);
    reportedSuccess.current = false;
  };

  const invalidateCases = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaterQueue() });
    queryClient.invalidateQueries({ queryKey: queryKeys.shared.surgicalCases() });
  };

  const addProcedure = (procedure: SelectedProcedure) => {
    setSelectedProcedures((prev) => (prev.some((item) => item.id === procedure.id) ? prev : [...prev, procedure]));
    setProcedureQuery('');
    setProcedureOpen(false);
    setCategoryQuery('');
    setCategoryOpen(false);
  };

  const createProcedure = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const existing = catalog.find((item) => item.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      addProcedure(existing);
      toast.message(`Using “${existing.name}” from the catalog`);
      return;
    }

    if (!categoryQuery.trim()) {
      setCategoryOpen(true);
      toast.error('Choose a category for this new procedure');
      return;
    }

    const resolved = resolveCatalogCategory(categoryQuery);
    setCreatingProcedure(true);
    try {
      const response = await frontdeskApi.createProcedureOption({
        name: trimmed,
        category: resolved.category,
        subcategory: resolved.subcategory ?? undefined,
      });
      if (!response.success) {
        toast.error(response.error || 'Failed to add procedure');
        return;
      }
      if (!response.data) {
        toast.error('Failed to add procedure');
        return;
      }
      const created = response.data;
      setCatalog((prev) => [...prev, created]);
      addProcedure(created);
      toast.success(`Added “${created.name}”`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to add procedure');
    } finally {
      setCreatingProcedure(false);
    }
  };

  const handleProcedureKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setProcedureOpen(false);
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const match = pickSuggestionOnEnter(procedureQuery, procedureSuggestions);
    if (match) {
      addProcedure(match);
      if (match.closeMatch) toast.message(`Matched “${match.name}”`);
      return;
    }
    void createProcedure(procedureQuery);
  };

  const openRegistration = (query: string) => {
    const parts = query.trim().split(/\s+/).filter(Boolean);
    setRegisterForm({
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' '),
      dateOfBirth: '',
      gender: 'FEMALE',
      phone: '',
    });
    setRegisterError(null);
    setStep('register');
  };

  const submitRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!registerForm.phone.trim()) {
      setRegisterError('Phone number is required');
      return;
    }
    setRegisterError(null);
    setIsSubmitting(true);
    try {
      const result = await apiClient.post<PatientResponseDto>('/patients', {
        firstName: registerForm.firstName.trim(),
        lastName: registerForm.lastName.trim(),
        dateOfBirth: registerForm.dateOfBirth,
        gender: registerForm.gender,
        phone: registerForm.phone,
        privacyConsent: true,
        serviceConsent: true,
        medicalConsent: true,
      });
      if (!result.success) {
        setRegisterError(result.error || 'Could not register the patient');
        return;
      }
      setSelectedPatient(result.data);
      setStep('schedule');
      toast.success(`${result.data.firstName} ${result.data.lastName} is registered`);
    } catch (error) {
      setRegisterError(error instanceof Error ? error.message : 'Could not register the patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPatient || selectedProcedures.length === 0 || !procedureDate) {
      toast.error('Choose a patient, at least one procedure, and a date');
      return;
    }

    const procedureCategory = [...new Set(
      selectedProcedures.map((procedure) => categoryLabel(procedure.category, procedure.subcategory)),
    )].join(', ');

    setIsSubmitting(true);
    try {
      const response = await frontdeskApi.scheduleSurgicalCase({
        patientId: selectedPatient.id,
        procedureIds: selectedProcedures.map((procedure) => procedure.id),
        procedureDate,
        procedureCategory,
      });

      if (!response.success || !response.data) {
        toast.error(response.error || 'Failed to schedule procedure');
        return;
      }

      toast.success(`Scheduled for ${response.data.patientName}`);
      setScheduledCase(response.data);
      setStep('details');
      invalidateCases();
    } catch (error) {
      console.error(error);
      toast.error('Failed to schedule procedure');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeAfterSchedule = () => {
    if (scheduledCase && !reportedSuccess.current) {
      reportedSuccess.current = true;
      onSuccess?.(scheduledCase);
    }
    onOpenChange(false);
  };

  const requestClose = (nextOpen: boolean) => {
    if (!nextOpen && step === 'details') {
      closeAfterSchedule();
      return;
    }
    onOpenChange(nextOpen);
  };

  const title = step === 'register'
    ? 'Register patient'
    : step === 'details'
      ? 'Surgical team and details'
      : 'Schedule procedure';

  const description = step === 'register'
    ? 'A few details are enough to put this patient on the schedule. The rest of the chart can be completed later.'
    : step === 'details'
      ? `${scheduledCase?.patientName ?? 'This case'} is on the schedule. Add the team, diagnosis, and procedure details when you have them.`
      : 'Choose the patient, the procedure, and the date. Team and clinical details come next.';

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {step !== 'register' && (
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
            <span className={step === 'schedule' ? 'text-primary' : 'text-muted-foreground'}>1 · Schedule</span>
            <span className="text-border">/</span>
            <span className={step === 'details' ? 'text-primary' : 'text-muted-foreground'}>2 · Team and details</span>
          </div>
        )}

        {step === 'register' && (
          <form onSubmit={submitRegistration} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="reg-first">First name *</Label>
                <Input id="reg-first" value={registerForm.firstName} onChange={(event) => setRegisterForm((prev) => ({ ...prev, firstName: event.target.value }))} required className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-last">Last name *</Label>
                <Input id="reg-last" value={registerForm.lastName} onChange={(event) => setRegisterForm((prev) => ({ ...prev, lastName: event.target.value }))} required className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="reg-dob">Date of birth *</Label>
                <Input id="reg-dob" type="date" value={registerForm.dateOfBirth} onChange={(event) => setRegisterForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))} required className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-gender">Gender *</Label>
                <Select value={registerForm.gender} onValueChange={(gender) => setRegisterForm((prev) => ({ ...prev, gender }))}>
                  <SelectTrigger id="reg-gender" className={inputClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <PhoneInput
                international
                defaultCountry="KE"
                value={registerForm.phone}
                onChange={(phone) => setRegisterForm((prev) => ({ ...prev, phone: phone ?? '' }))}
                className="phone-input-custom"
              />
            </div>
            {registerError && <p className="text-xs text-red-600">{registerError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep('schedule')}>Back</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Registering...' : 'Register and continue'}
              </Button>
            </div>
          </form>
        )}

        {step === 'schedule' && (
          <form onSubmit={submitSchedule} className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Patient *</Label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  onClick={() => openRegistration('')}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Register new patient
                </button>
              </div>
              <PatientCombobox
                value={selectedPatient?.id || ''}
                onSelect={(_patientId, patient) => setSelectedPatient(patient || null)}
                initialValue={selectedPatient ?? initialPatient}
                onRegisterNew={openRegistration}
              />
              {selectedPatient && (
                <p className="text-xs text-muted-foreground">
                  {selectedPatient.fileNumber ? `${selectedPatient.fileNumber} · ` : ''}
                  {selectedPatient.phone || selectedPatient.email || 'Registered just now'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="procedure-name">Procedure *</Label>
              {selectedProcedures.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedProcedures.map((procedure, index) => (
                    <span key={procedure.id} className="inline-flex items-center gap-1 rounded-lg border border-secondary/30 bg-secondary/10 px-2.5 py-1 text-xs font-medium text-foreground">
                      <span className="font-bold text-secondary">{index + 1}.</span>
                      {procedure.name}
                      <button type="button" onClick={() => setSelectedProcedures((prev) => prev.filter((item) => item.id !== procedure.id))} className="text-muted-foreground hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <SuggestField
                id="procedure-name"
                value={procedureQuery}
                open={procedureOpen}
                placeholder="Type the procedure name"
                onChange={(value) => {
                  setProcedureQuery(value);
                  setProcedureOpen(true);
                }}
                onFocus={() => setProcedureOpen(true)}
                onBlur={() => setTimeout(() => setProcedureOpen(false), 150)}
                onKeyDown={handleProcedureKeyDown}
              >
                {procedureOpen && procedureQuery.trim().length >= 2 && (
                  <SuggestionList>
                    {procedureSuggestions.map((procedure) => (
                      <SuggestionButton key={procedure.id} onClick={() => addProcedure(procedure)}>
                        <span>{procedure.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {procedure.closeMatch ? 'Close match · ' : ''}
                          {categoryLabel(procedure.category, procedure.subcategory)}
                        </span>
                      </SuggestionButton>
                    ))}
                    {addingNewProcedure && (
                      <SuggestionButton onClick={() => void createProcedure(procedureQuery)} disabled={creatingProcedure}>
                        <span className="inline-flex items-center gap-2 text-primary">
                          {creatingProcedure ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          Add “{procedureQuery.trim()}”
                        </span>
                      </SuggestionButton>
                    )}
                  </SuggestionList>
                )}
              </SuggestField>
              <p className="text-[11px] text-muted-foreground">
                Add more than one procedure. Each keeps the category already on its catalog record.
              </p>
            </div>

            {addingNewProcedure && (
              <div className="space-y-2">
                <Label htmlFor="procedure-category">Category for “{trimmedProcedure}” *</Label>
                <SuggestField
                  id="procedure-category"
                  value={categoryQuery}
                  open={categoryOpen}
                  placeholder="Type a category, or pick a suggestion"
                  onChange={(value) => {
                    setCategoryQuery(value);
                    setCategoryOpen(true);
                  }}
                  onFocus={() => setCategoryOpen(true)}
                  onBlur={() => setTimeout(() => setCategoryOpen(false), 150)}
                >
                  {categoryOpen && categorySuggestions.length > 0 && (
                    <SuggestionList>
                      {categorySuggestions.map((label) => (
                        <SuggestionButton
                          key={label}
                          onClick={() => {
                            setCategoryQuery(label);
                            setCategoryOpen(false);
                          }}
                        >
                          <span>{label}</span>
                        </SuggestionButton>
                      ))}
                    </SuggestionList>
                  )}
                </SuggestField>
                <p className="text-[11px] text-muted-foreground">
                  This name is not in the catalog yet. A category is only needed to add it.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="procedureDate">Procedure date *</Label>
              <Input id="procedureDate" type="date" value={procedureDate} onChange={(event) => setProcedureDate(event.target.value)} required className={inputClass} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => requestClose(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || selectedProcedures.length === 0}>
                {isSubmitting ? 'Scheduling...' : 'Schedule procedure'}
              </Button>
            </div>
          </form>
        )}

        {step === 'details' && scheduledCase && (
          <SurgicalCaseSetupForm
            caseId={scheduledCase.surgicalCaseId}
            cancelLabel="Do this later"
            onCancel={() => requestClose(false)}
            onSaved={() => {
              invalidateCases();
              closeAfterSchedule();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SuggestField({
  id,
  value,
  open,
  placeholder,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  children,
}: {
  id: string;
  value: string;
  open: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        autoComplete="off"
        aria-expanded={open}
        className={inputClass}
      />
      {children}
    </div>
  );
}

function SuggestionList({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
      {children}
    </div>
  );
}

function SuggestionButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-foreground hover:bg-[#e7d6bf]/30 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
