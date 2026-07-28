'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Stethoscope, User, Calendar, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

import { DoctorSelectionStep } from './steps/DoctorSelectionStep';
import { PatientSelectionStep } from './steps/PatientSelectionStep';
import { DateTimeSelectionStep } from './steps/DateTimeSelectionStep';
import { ReviewStep } from './steps/ReviewStep';
import { useAppointmentBookingWizard } from '@/hooks/appointments/useAppointmentBookingWizard';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { Button } from '@/components/ui/button';

interface BookingWizardProps {
  initialPatientId?: string;
  initialPatient?: PatientResponseDto;
  initialDoctorId?: string;
  initialDoctor?: DoctorResponseDto;
  initialDate?: string;
  initialTime?: string;
  initialType?: string;
  userRole?: 'doctor' | 'frontdesk';
  lockDoctor?: boolean;
  source?: AppointmentSource | string;
  bookingChannel?: BookingChannel;
  parentAppointmentId?: number;
  parentConsultationId?: number;
  variant?: 'dialog' | 'sheet' | 'page';
  onSuccess?: (appointmentId?: number, date?: Date) => void;
  onCancel?: () => void;
}

export function AppointmentBookingWizard({
  initialPatientId,
  initialPatient,
  initialDoctorId,
  initialDoctor,
  initialDate,
  initialTime,
  initialType,
  userRole = 'frontdesk',
  lockDoctor = false,
  source,
  bookingChannel,
  parentAppointmentId,
  parentConsultationId,
  variant = 'dialog',
  onSuccess,
  onCancel
}: BookingWizardProps) {
  const {
    currentStep,
    setCurrentStep,
    formData,
    setFormData,
    selectedPatient,
    setSelectedPatient,
    selectedDoctor,
    setSelectedDoctor,
    isSubmitting,
    isFollowUp,
    stepLabels,
    currentStepIndex,
    canProceed,
    handleNext,
    handleBack,
    handleSubmit,
  } = useAppointmentBookingWizard({
    initialPatientId,
    initialPatient,
    initialDoctorId,
    initialDoctor,
    initialDate,
    initialTime,
    initialType,
    userRole,
    lockDoctor,
    source,
    bookingChannel,
    parentAppointmentId,
    parentConsultationId,
    onSuccess,
    onCancel,
  });

  const isSheet = variant === 'sheet';
  const showNav = variant === 'page';

  return (
    <div className={cn(
      'flex flex-col overflow-hidden',
      isSheet ? 'h-full bg-white' : 'bg-white rounded-xl shadow-sm border border-[#e7d6bf]'
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-5 py-3 border-b bg-white shrink-0',
        isSheet ? 'rounded-t-2xl' : 'rounded-t-xl'
      )}>
        <div className="flex items-center gap-3">
          {showNav && (
            <Button
              variant="ghost"
              size="icon"
              onClick={currentStep === 1 ? onCancel : handleBack}
              className="rounded-lg hover:bg-slate-100 -ml-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h2 className="text-base font-bold text-[#2c2e4b]">
              {isFollowUp ? 'Schedule Follow-up' : 'Book Appointment'}
            </h2>
            {!isSheet && (
              <p className="text-xs text-[#2c2e4b]/60">
                {isFollowUp ? 'Choose the follow-up date and time for this patient' : 'Schedule a new appointment'}
              </p>
            )}
          </div>
        </div>
        {showNav && (
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-900 rounded-lg"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        )}
      </div>

      {/* Compact Horizontal Stepper */}
      <div className="shrink-0 border-b border-[#e7d6bf] bg-[#e7d6bf]/10">
        <div className="flex items-center px-4">
          {stepLabels.map((step, idx) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStepIndex > idx + 1;
            const stepIcons: Record<number, typeof Stethoscope> = { 1: Stethoscope, 2: User, 3: Calendar, 4: FileText };
            const StepIcon = stepIcons[step.id] || User;

            return (
              <button
                key={step.id}
                onClick={() => {
                  if (isCompleted) {
                    setCurrentStep(step.id);
                  }
                }}
                disabled={!isCompleted && !isActive}
                className={cn(
                  'flex items-center gap-2 py-3 px-3 text-xs font-medium transition-all relative flex-1 justify-center',
                  isActive
                    ? 'text-[#caa26a]'
                    : isCompleted
                    ? 'text-[#2c2e4b]/70 hover:text-[#2c2e4b]'
                    : 'text-[#2c2e4b]/40 cursor-default'
                )}
              >
                {/* Connector line */}
                {idx > 0 && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-4 bg-[#e7d6bf]" />
                )}

                <div className={cn(
                  'h-5 w-5 rounded-full flex items-center justify-center border transition-all shrink-0',
                  isActive
                    ? 'border-[#caa26a] bg-[#caa26a] text-white'
                    : isCompleted
                    ? 'border-[#caa26a] bg-[#caa26a] text-white'
                    : 'border-[#e7d6bf] bg-white text-[#2c2e4b]/40'
                )}>
                  {isCompleted ? (
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <StepIcon className="h-3 w-3" />
                  )}
                </div>
                <span className={cn(
                  'hidden sm:inline whitespace-nowrap',
                  isActive && 'font-semibold'
                )}>
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className={cn('px-5 py-4', isSheet ? 'mx-0' : 'mx-5 my-3')}>
          {currentStep === 1 && (
            <DoctorSelectionStep
              selectedDoctorId={formData.doctorId}
              onSelect={(id) => setFormData(prev => ({ ...prev, doctorId: id, appointmentDate: '', selectedSlot: null }))}
              selectedDoctor={selectedDoctor}
              onDoctorLoaded={setSelectedDoctor}
              lockDoctor={lockDoctor}
            />
          )}

          {currentStep === 2 && (
            <PatientSelectionStep
              selectedPatientId={formData.patientId}
              onSelect={(id, patient) => {
                setFormData(prev => ({ ...prev, patientId: id }));
                if (patient) setSelectedPatient(patient);
              }}
              selectedPatient={selectedPatient}
              onPatientCleared={() => setSelectedPatient(null)}
            />
          )}

          {currentStep === 3 && (
            <DateTimeSelectionStep
              doctorId={formData.doctorId}
              selectedDate={formData.appointmentDate}
              selectedSlot={formData.selectedSlot}
              onSelect={(date, slot) => setFormData(prev => ({ ...prev, appointmentDate: date, selectedSlot: slot }))}
            />
          )}

          {currentStep === 4 && (
            <ReviewStep
              formData={formData}
              onFormDataChange={setFormData}
              selectedPatient={selectedPatient}
              selectedDoctor={selectedDoctor}
              isFollowUp={isFollowUp}
            />
          )}
        </div>
      </div>

      {/* Footer - Fixed at bottom */}
      <div className={cn('flex items-center justify-between px-5 py-3 border-t bg-white shrink-0', isSheet ? 'rounded-b-2xl' : 'rounded-b-xl')}>
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : handleBack}
          className="gap-1.5 h-8 px-3 text-xs rounded-lg border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
        >
          {currentStep === 1 ? 'Cancel' : <><ChevronLeft className="h-3.5 w-3.5" /> Back</>}
        </Button>

        {currentStep < 4 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="gap-1.5 h-8 px-3 text-xs rounded-lg bg-[#2c2e4b] hover:bg-[#1a1c2f] text-white transition-all duration-200"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!formData.type || isSubmitting}
            className="gap-1.5 h-8 px-3 text-xs rounded-lg bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] transition-all duration-200"
          >
            {isSubmitting ? 'Submitting...' : isFollowUp ? 'Schedule Follow-up' : 'Submit Request'}
          </Button>
        )}
      </div>
    </div>
  );
}
