import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PatientIntakeFormSchema } from '@/lib/schema';

const STORAGE_KEY = 'patient_intake_draft';

const STEPS = [
  { id: 1, name: 'About You', fields: ['firstName', 'lastName', 'dateOfBirth', 'gender'] },
  { id: 2, name: 'Contact', fields: ['email', 'phone', 'whatsappPhone', 'address', 'maritalStatus', 'occupation'] },
  { id: 3, name: 'Emergency', fields: ['emergencyContactName', 'emergencyContactNumber', 'emergencyContactRelation'] },
  { id: 4, name: 'Medical', fields: ['bloodGroup', 'allergies', 'medicalConditions', 'medicalHistory'] },
  { id: 5, name: 'Insurance', fields: ['insuranceProvider', 'insuranceNumber'] },
  { id: 6, name: 'Review', fields: [] },
];

export function useIntakeForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isMinor, setIsMinor] = useState(false);

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
      emergencyContactRelation: '',
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

  // Detect minor from DOB
  const watchedDob = form.watch('dateOfBirth');
  useEffect(() => {
    if (watchedDob) {
      const birthDate = new Date(watchedDob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setIsMinor(age < 18);
    } else {
      setIsMinor(false);
    }
  }, [watchedDob]);

  const validateCurrentStep = async () => {
    const currentStepFields = STEPS[currentStep - 1].fields;
    if (currentStep === STEPS.length) return true; // Skip validation for review step
    if (isMinor && currentStep === 2) return true; // Skip contact step for minors
    return await form.trigger(currentStepFields as any);
  };

  const handleNext = async () => {
    if (currentStep < STEPS.length) {
      const isValid = await validateCurrentStep();
      if (isValid) {
        if (isMinor && currentStep === 1) {
          setCurrentStep(3); // Skip contact step for minors
        } else if (isMinor && currentStep === 2) {
          setCurrentStep(3); // Should not normally happen, but safety net
        } else {
          setCurrentStep(currentStep + 1);
        }
        window.scrollTo(0, 0);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      if (isMinor && currentStep === 3) {
        setCurrentStep(1); // Skip contact step going back for minors
      } else if (isMinor && currentStep === 2) {
        setCurrentStep(1); // Should not normally happen, but safety net
      } else {
        setCurrentStep(currentStep - 1);
      }
      window.scrollTo(0, 0);
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    form.reset();
    setCurrentStep(1);
  };

  const onSubmit = async (data: any, sessionId: string, onSuccess: (result: any) => void) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

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

      const result = await response.json();
      localStorage.removeItem(STORAGE_KEY);
      setSubmitted(true);
      onSuccess(result);
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
    isMinor,
    STEPS,
    STORAGE_KEY,
    validateCurrentStep,
    handleNext,
    handlePrev,
    handleClearDraft,
    onSubmit,
  };
}
