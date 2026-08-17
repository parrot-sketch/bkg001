'use client';

import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PatientIntakeFormSchema } from '@/lib/schema';
import { isMinor } from '@/lib/utils/age';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

export type PatientRegistrationFormData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  whatsappPhone?: string;
  address?: string;
  maritalStatus?: string;
  occupation?: string;
  referralSource?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  emergencyContactRelation?: string;
  bloodGroup?: string;
  allergies?: string;
  medicalConditions?: string;
  privacyConsent: boolean;
  serviceConsent: boolean;
  medicalConsent: boolean;
};

const STEPS = [
  { id: 1, title: 'Personal Info', description: 'Tell us about the patient' },
  { id: 2, title: 'Contact', description: 'How can we reach them?' },
  { id: 3, title: 'Emergency', description: 'Emergency contact details' },
  { id: 4, title: 'Medical', description: 'Medical overview' },
] as const;

function sanitizeFormValues(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, value === '' ? undefined : value])
      .filter(([, value]) => value !== undefined),
  );
}

export function usePatientRegistrationDialog(params: {
  open: boolean;
  onClose: () => void;
  onSuccess: (patient: PatientResponseDto) => void;
}) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<PatientRegistrationFormData>({
    resolver: zodResolver(PatientIntakeFormSchema) as any,
    mode: 'onBlur',
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'FEMALE',
      email: '',
      phone: '',
      whatsappPhone: '',
      address: '',
      maritalStatus: '',
      occupation: '',
      referralSource: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
      emergencyContactRelation: '',
      bloodGroup: '',
      allergies: '',
      medicalConditions: '',
      privacyConsent: true,
      serviceConsent: true,
      medicalConsent: true,
    },
  });

  const currentStep = useMemo(() => STEPS[Math.max(0, Math.min(step - 1, STEPS.length - 1))], [step]);
  const stepProgress = useMemo(() => (step / STEPS.length) * 100, [step]);

  const validateForStep = useCallback(async () => {
    let fields: (keyof PatientRegistrationFormData)[] = [];
    if (step === 1) fields = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'referralSource'];
    else if (step === 2) {
      const dob = form.getValues('dateOfBirth');
      if (dob && !isMinor(dob)) {
        fields = ['phone', 'email'];
      } else {
        fields = ['phone'];
      }
    }
    const valid = fields.length === 0 || (await form.trigger(fields));
    return valid;
  }, [form, step]);

  const goNext = useCallback(async () => {
    const valid = await validateForStep();
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length));
  }, [validateForStep]);

  const goPrev = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const raw = form.getValues() as unknown as Record<string, unknown>;
      const clean = sanitizeFormValues(raw);

      const result = await apiClient.post<PatientResponseDto>('/patients', clean);
      if (!result.success) throw new Error(result.error);

      toast.success('Patient registered successfully');
      params.onSuccess(result.data);

      form.reset();
      setStep(1);
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }, [form, params]);

  const close = useCallback(() => {
    if (submitting) return;
    params.onClose();
    setStep(1);
    setSubmitted(false);
    setSubmitError(null);
  }, [params, submitting]);

  return {
    STEPS,
    step,
    currentStep,
    stepProgress,
    submitting,
    submitted,
    submitError,
    form,
    goNext,
    goPrev,
    submit,
    close,
  };
}

