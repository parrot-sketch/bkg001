'use client';

import { Form } from '@/components/ui/form';
import { Card } from '@/components/ui/card';
import { useIntakeForm } from './useIntakeForm';
import { FormProgress } from './ui/FormProgress';
import { FormNavigation } from './ui/FormNavigation';
import { FormError } from './ui/FormError';
import { SuccessScreen } from './ui/SuccessScreen';
import { PersonalInfoStep } from './steps/PersonalInfoStep';
import { ContactInfoStep } from './steps/ContactInfoStep';
import { EmergencyContactStep } from './steps/EmergencyContactStep';
import { MedicalInfoStep } from './steps/MedicalInfoStep';
import { InsuranceInfoStep } from './steps/InsuranceInfoStep';
import { ConsentStep } from './steps/ConsentStep';
import { ReviewStep } from './steps/ReviewStep';

interface PatientIntakeFormProps {
  sessionId: string;
  onSuccess: () => void;
}

export function PatientIntakeFormRefactored({
  sessionId,
  onSuccess,
}: PatientIntakeFormProps) {
  const {
    form,
    currentStep,
    isSubmitting,
    submitError,
    submitted,
    draftSaved,
    STEPS,
    handleNext,
    handlePrev,
    handleClearDraft,
    onSubmit: submitForm,
  } = useIntakeForm();

  if (submitted) {
    return <SuccessScreen />;
  }

  const handleFormSubmit = async () => {
    await submitForm(form.getValues(), sessionId, onSuccess);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <PersonalInfoStep form={form} />;
      case 2:
        return <ContactInfoStep form={form} />;
      case 3:
        return <EmergencyContactStep form={form} />;
      case 4:
        return <MedicalInfoStep form={form} />;
      case 5:
        return <InsuranceInfoStep form={form} />;
      case 6:
        return <ConsentStep form={form} />;
      case 7:
        return <ReviewStep form={form} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Header with progress */}
        <FormProgress
          currentStep={currentStep}
          totalSteps={STEPS.length}
          draftSaved={draftSaved}
        />

        {/* Form card */}
        <Card className="bg-white border-0 shadow-sm">
          <Form {...form}>
            <form className="p-6 md:p-8 space-y-8">
              {/* Error Alert */}
              <FormError error={submitError} />

              {/* Step Content */}
              {renderStepContent()}

              {/* Navigation */}
              <FormNavigation
                currentStep={currentStep}
                totalSteps={STEPS.length}
                isSubmitting={isSubmitting}
                onPrevious={handlePrev}
                onNext={handleNext}
                onSubmit={handleFormSubmit}
              />

              {/* Footer */}
              <div className="text-center text-xs text-gray-500 space-y-2 pt-4 border-t">
                <p>* Required fields</p>
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="text-blue-600 hover:text-blue-700 underline text-xs"
                >
                  Clear saved progress
                </button>
              </div>
            </form>
          </Form>
        </Card>

        {/* Footer info */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-xs text-gray-600">
            Your information is encrypted and stored securely. Only authorized medical staff can access your data. Your privacy is our priority.
          </p>
        </div>
      </div>
    </div>
  );
}
