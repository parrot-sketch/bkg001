'use client';

import { useState, useMemo, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info, CheckCircle, FileText, ChevronLeft, ChevronRight, X } from 'lucide-react';

import { StepIndicator } from './steps/StepIndicator';
import { DoctorSelectionStep } from './steps/DoctorSelectionStep';
import { PatientSelectionStep } from './steps/PatientSelectionStep';
import { DateTimeSelectionStep } from './steps/DateTimeSelectionStep';
import { ReviewStep } from './steps/ReviewStep';
import { usePatientAppointments } from '@/hooks/appointments/useAppointments';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { startOfDay } from 'date-fns';

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
  const router = useRouter();
  const isFollowUp = source === AppointmentSource.DOCTOR_FOLLOW_UP || source === 'DOCTOR_FOLLOW_UP' || initialType === 'Follow-up';

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState(() => {
    let parsedDate = '';
    if (initialDate) {
      try {
        parsedDate = new Date(initialDate).toISOString().split('T')[0];
      } catch {
        parsedDate = initialDate;
      }
    }
    return {
      patientId: initialPatientId || '',
      doctorId: initialDoctorId || '',
      appointmentDate: parsedDate,
      selectedSlot: initialTime || null,
      type: initialType || '',
      reason: '',
      note: '',
    };
  });

  const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(initialPatient || null);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorResponseDto | null>(initialDoctor || null);

  const { data: patientAppointments = [] } = usePatientAppointments(
    formData.patientId,
    !!formData.patientId && !!formData.appointmentDate
  );

  const existingAppointmentsOnDate = useMemo(() => {
    if (!formData.appointmentDate || !formData.patientId) return [];
    const selectedDateOnly = startOfDay(new Date(formData.appointmentDate));
    const excludedStatuses = [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED];
    return patientAppointments.filter((apt) => {
      const aptDate = startOfDay(new Date(apt.appointmentDate));
      return aptDate.getTime() === selectedDateOnly.getTime() && !excludedStatuses.includes(apt.status as AppointmentStatus);
    });
  }, [patientAppointments, formData.appointmentDate, formData.patientId]);

  const sameDoctorConflict = useMemo(() => {
    if (!formData.doctorId || existingAppointmentsOnDate.length === 0) return null;
    return existingAppointmentsOnDate.find(apt => apt.doctorId === formData.doctorId);
  }, [existingAppointmentsOnDate, formData.doctorId]);

  const differentDoctorAppointments = useMemo(() => {
    if (!formData.doctorId || existingAppointmentsOnDate.length === 0) return [];
    return existingAppointmentsOnDate.filter(apt => apt.doctorId !== formData.doctorId);
  }, [existingAppointmentsOnDate, formData.doctorId]);

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!formData.doctorId;
      case 2: return !!formData.patientId;
      case 3: return !!formData.appointmentDate && !!formData.selectedSlot;
      case 4: return !!formData.type;
      default: return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;
    if (currentStep === 1 && formData.patientId) {
      setCurrentStep(3);
    } else {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    if (currentStep === 3 && (initialPatientId || initialPatient)) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
  };

  const handleSubmit = async () => {
    if (!formData.patientId || !formData.doctorId || !formData.appointmentDate || !formData.selectedSlot || !formData.type) {
      toast.error('Missing required fields');
      return;
    }

    if (sameDoctorConflict) {
      toast.warning(`This patient already has an appointment with this doctor on ${format(new Date(formData.appointmentDate), 'MMMM d, yyyy')} at ${sameDoctorConflict.time}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { frontdeskApi } = await import('@/lib/api/frontdesk');
      const { doctorApi } = await import('@/lib/api/doctor');
      const api = userRole === 'doctor' ? doctorApi : frontdeskApi;

      const response = await api.scheduleAppointment({
        patientId: formData.patientId,
        doctorId: formData.doctorId,
        appointmentDate: new Date(formData.appointmentDate),
        time: formData.selectedSlot,
        type: formData.type,
        reason: formData.reason || undefined,
        note: formData.note,
        ...(source ? { source: typeof source === 'string' ? source : source } : {}),
        ...(bookingChannel ? { bookingChannel } : {}),
        ...(parentAppointmentId ? { parentAppointmentId } : {}),
        ...(parentConsultationId ? { parentConsultationId } : {}),
      });

      if (response.success) {
        toast.success(isFollowUp ? 'Follow-up appointment scheduled' : 'Appointment scheduled successfully');
        if (onSuccess) onSuccess(response.data?.id, new Date(formData.appointmentDate));
      } else {
        toast.error(response.error || 'Failed to schedule appointment');
      }
    } catch (error) {
      console.error('Booking error', error);
      toast.error('An error occurred while booking the appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepLabels = useMemo(() => {
    const labels = [
      { id: 1, label: 'Doctor' },
      { id: 3, label: 'Date & Time' },
      { id: 4, label: 'Review' },
    ];
    if (!initialPatientId && !initialPatient) {
      labels.splice(1, 0, { id: 2, label: 'Patient' });
    }
    return labels;
  }, [initialPatientId, initialPatient]);

  const currentStepIndex = stepLabels.findIndex(s => s.id === currentStep) + 1;

  return (
    <div className="flex flex-col h-[90vh] max-h-[90vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white rounded-t-2xl">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Book Appointment</h2>
          <p className="text-sm text-slate-500">Follow the steps to schedule a new appointment</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Progress */}
      <div className="px-6 py-4 bg-slate-50">
        <StepIndicator steps={stepLabels} currentStep={currentStep} currentStepIndex={currentStepIndex} />
      </div>

      {/* Follow-up Banner */}
      {isFollowUp && parentConsultationId && (
        <div className="mx-6 mt-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 flex items-start gap-3">
          <FileText className="h-4 w-4 text-amber-700 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 text-sm">Follow-up Appointment</p>
            <p className="text-xs text-amber-700">Linked to consultation #{parentConsultationId}</p>
          </div>
        </div>
      )}

      {/* Step Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <Card className="border-none shadow-none bg-white mx-6 my-4">
          <CardContent className="p-6">
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
      <div className="flex items-center justify-between px-6 py-4 border-t bg-white rounded-b-2xl">
        <Button variant="outline" onClick={currentStep === 1 ? onCancel : handleBack} className="gap-2">
          {currentStep === 1 ? 'Cancel' : <><ChevronLeft className="h-4 w-4" /> Back</>}
        </Button>

        {currentStep < 4 ? (
          <Button onClick={handleNext} disabled={!canProceed()} className="gap-2 bg-cyan-600 hover:bg-cyan-700">
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!formData.type || isSubmitting} className="gap-2 bg-cyan-600 hover:bg-cyan-700">
            {isSubmitting ? 'Booking...' : isFollowUp ? 'Schedule Follow-up' : 'Confirm Booking'}
          </Button>
        )}
      </div>
    </div>
  );
}
