'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PatientIntakeFormSchema } from '@/lib/schema';
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
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  emergencyContactRelation?: string;
  bloodGroup?: string;
  allergies?: string;
  medicalConditions?: string;
};

const STEPS = [
  { id: 1, name: 'About You', fields: ['firstName', 'lastName', 'dateOfBirth', 'gender'] },
  { id: 2, name: 'Contact', fields: ['email', 'phone', 'whatsappPhone', 'address', 'maritalStatus', 'occupation'] },
  { id: 3, name: 'Emergency', fields: ['emergencyContactName', 'emergencyContactNumber', 'emergencyContactRelation'] },
  { id: 4, name: 'Medical', fields: ['bloodGroup', 'allergies', 'medicalConditions'] },
  { id: 5, name: 'Review', fields: [] },
];

function sanitizeFormValues(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, value === '' ? undefined : value])
      .filter(([, value]) => value !== undefined),
  );
}

function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
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
  const [isMinor, setIsMinor] = useState(false);

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
      emergencyContactName: '',
      emergencyContactNumber: '',
      emergencyContactRelation: '',
      bloodGroup: '',
      allergies: '',
      medicalConditions: '',
    },
  });

  const watchedDob = form.watch('dateOfBirth');
  useEffect(() => {
    if (watchedDob) {
      setIsMinor(calculateAge(watchedDob) < 18);
    } else {
      setIsMinor(false);
    }
  }, [watchedDob]);

  const currentStep = useMemo(() => STEPS[Math.max(0, Math.min(step - 1, STEPS.length - 1))], [step]);
  const stepProgress = useMemo(() => (step / STEPS.length) * 100, [step]);

  const validateForStep = useCallback(async () => {
    let fields: (keyof PatientRegistrationFormData)[] = [];
    if (step === 1) fields = ['firstName', 'lastName', 'dateOfBirth', 'gender'];
    else if (step === 2 && !isMinor) fields = ['phone', 'email', 'address'];
    else if (step === 3) fields = [];
    else if (step === 4) fields = [];
    const valid = fields.length === 0 || (await form.trigger(fields as any));
    return valid;
  }, [form, step, isMinor]);

  const goNext = useCallback(async () => {
    const valid = await validateForStep();
    if (valid) {
      if (isMinor && step === 1) {
        setStep(3);
      } else {
        setStep((s) => Math.min(s + 1, STEPS.length));
      }
    }
  }, [validateForStep, isMinor, step]);

  const goPrev = useCallback(() => {
    setStep((s) => {
      const next = Math.max(s - 1, 1);
      if (isMinor && next === 2) return 1;
      return next;
    });
  }, [isMinor]);

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
    isMinor,
    form,
    goNext,
    goPrev,
    submit,
    close,
  };
}
