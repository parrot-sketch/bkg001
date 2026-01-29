import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PatientIntakeFormSchema } from '@/lib/schema';

const STORAGE_KEY = 'patient_intake_draft';

const STEPS = [
  { id: 1, name: 'Personal Info', fields: ['firstName', 'lastName', 'dateOfBirth', 'gender'] },
  { id: 2, name: 'Contact', fields: ['email', 'phone', 'whatsappPhone', 'address', 'maritalStatus', 'occupation'] },
  { id: 3, name: 'Emergency', fields: ['emergencyContactName', 'emergencyContactNumber', 'emergencyContactRelation'] },
  { id: 4, name: 'Medical', fields: ['bloodGroup', 'allergies', 'medicalConditions', 'medicalHistory'] },
  { id: 5, name: 'Insurance', fields: ['insuranceProvider', 'insuranceNumber'] },
  { id: 6, name: 'Consent', fields: ['privacyConsent', 'serviceConsent', 'medicalConsent'] },
  { id: 7, name: 'Review', fields: [] },
];

export function useIntakeForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const form = useForm({
    resolver: zodResolver(PatientIntakeFormSchema),
    mode: 'onBlur',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      maritalStatus: 'SINGLE',
      gender: 'MALE',
      emergencyContactName: '',
      emergencyContactNumber: '',
      emergencyContactRelation: 'PARENT',
      privacyConsent: false,
      serviceConsent: false,
      medicalConsent: false,
      dateOfBirth: '',
      whatsappPhone: '',
      occupation: '',
      bloodGroup: '',
      allergies: '',
      medicalConditions: '',
      medicalHistory: '',
      insuranceProvider: '',
      insuranceNumber: '',
    },
  } as any);

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        form.reset(draft);
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, []);

  // Auto-save to localStorage on value changes
  useEffect(() => {
    const subscription = form.watch((data) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setDraftSaved(true);
      const timer = setTimeout(() => setDraftSaved(false), 2000);
      return () => clearTimeout(timer);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const validateCurrentStep = async () => {
    const currentStepFields = STEPS[currentStep - 1].fields;
    if (currentStep === 7) return true; // Skip validation for review step
    return await form.trigger(currentStepFields as any);
  };

  const handleNext = async () => {
    if (currentStep < STEPS.length) {
      const isValid = await validateCurrentStep();
      if (isValid) {
        setCurrentStep(currentStep + 1);
        window.scrollTo(0, 0);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    form.reset();
    setCurrentStep(1);
  };

  const onSubmit = async (data: any, sessionId: string, onSuccess: () => void) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Clean up empty optional fields before sending
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          value === '' ? null : value,
        ]).filter(([, value]) => value !== null)
      );

      const response = await fetch('/api/patient/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          ...cleanData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const details = errorData.details?.fieldErrors;
        const fieldErrors = details 
          ? Object.entries(details).map(([field, errors]: [string, any]) => 
              `${field}: ${errors.join(', ')}`
            ).join('\n')
          : errorData.error || 'Failed to submit intake form';
        throw new Error(fieldErrors);
      }

      // Clear draft on successful submission
      localStorage.removeItem(STORAGE_KEY);
      setSubmitted(true);
      onSuccess();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    currentStep,
    setCurrentStep,
    isSubmitting,
    setIsSubmitting,
    submitError,
    setSubmitError,
    submitted,
    draftSaved,
    STEPS,
    STORAGE_KEY,
    validateCurrentStep,
    handleNext,
    handlePrev,
    handleClearDraft,
    onSubmit,
  };
}
