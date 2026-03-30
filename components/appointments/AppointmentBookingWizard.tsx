'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';

import { StepIndicator } from './steps/StepIndicator';
import { DoctorSelectionStep } from './steps/DoctorSelectionStep';
import { PatientSelectionStep } from './steps/PatientSelectionStep';
import { DateTimeSelectionStep } from './steps/DateTimeSelectionStep';
import { ReviewStep } from './steps/ReviewStep';
import { useAppointmentBookingWizard } from '@/hooks/appointments/useAppointmentBookingWizard';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';

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
  onSuccess,
  onCancel
}: BookingWizardProps) {
  const {
    currentStep,
    formData,
    setFormData,
    selectedPatient,
    setSelectedPatient,
    selectedDoctor,
    setSelectedDoctor,
    isSubmitting,
    isFollowUp,
    sameDoctorConflict,
    differentDoctorAppointments,
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

  return (
    <div className="flex flex-col h-[85vh] max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-white rounded-t-2xl">
        <div>
          <h2 className="text-base font-bold text-slate-900">Book Appointment</h2>
          <p className="text-xs text-slate-500">Schedule a new appointment</p>
        </div>
      </div>

      {/* Progress */}
      <div className="px-5 py-3 bg-slate-50">
        <StepIndicator steps={stepLabels} currentStep={currentStep} currentStepIndex={currentStepIndex} />
      </div>

      {/* Follow-up Banner */}
      {isFollowUp && parentConsultationId && (
        <div className="mx-5 mt-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 flex items-start gap-2">
          <FileText className="h-3.5 w-3.5 text-amber-700 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 text-xs">Follow-up Appointment</p>
            <p className="text-[10px] text-amber-700">Linked to consultation #{parentConsultationId}</p>
          </div>
        </div>
      )}

      {/* Step Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <Card className="border-none shadow-none bg-white mx-5 my-3">
          <CardContent className="p-4">
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
                sameDoctorConflict={sameDoctorConflict}
                differentDoctorAppointments={differentDoctorAppointments}
                isFollowUp={isFollowUp}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer - Fixed at bottom */}
      <div className="flex items-center justify-between px-5 py-3 border-t bg-white rounded-b-2xl">
        <Button variant="outline" onClick={currentStep === 1 ? onCancel : handleBack} className="gap-1.5 h-8 px-3 text-xs rounded-lg">
          {currentStep === 1 ? 'Cancel' : <><ChevronLeft className="h-3.5 w-3.5" /> Back</>}
        </Button>

        {currentStep < 4 ? (
          <Button onClick={handleNext} disabled={!canProceed()} className="gap-1.5 h-8 px-3 text-xs rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-all duration-200">
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!formData.type || isSubmitting} className="gap-1.5 h-8 px-3 text-xs rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-all duration-200">
            {isSubmitting ? 'Booking...' : isFollowUp ? 'Schedule Follow-up' : 'Confirm Booking'}
          </Button>
        )}
      </div>
    </div>
  );
}
