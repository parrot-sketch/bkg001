import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';

interface UseAppointmentBookingWizardProps {
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

export function useAppointmentBookingWizard({
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
  onCancel,
}: UseAppointmentBookingWizardProps) {
  const isFollowUp = source === AppointmentSource.DOCTOR_FOLLOW_UP || source === 'DOCTOR_FOLLOW_UP' || initialType === 'Follow-up';
  const skipDoctorStep = lockDoctor && !!initialDoctorId;
  const skipPatientStep = !!(initialPatientId || initialPatient);
  const stepSequence = useMemo(() => {
    const steps: number[] = [];
    if (!skipDoctorStep) steps.push(1);
    if (!skipPatientStep) steps.push(2);
    steps.push(3, 4);
    return steps;
  }, [skipDoctorStep, skipPatientStep]);

  const [currentStep, setCurrentStep] = useState<number>(stepSequence[0] ?? 4);
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
    const currentIndex = stepSequence.indexOf(currentStep);
    const nextStep = stepSequence[currentIndex + 1];
    if (nextStep) {
      setCurrentStep(nextStep);
    }
  };

  const handleBack = () => {
    const currentIndex = stepSequence.indexOf(currentStep);
    const previousStep = stepSequence[currentIndex - 1];
    if (previousStep) {
      setCurrentStep(previousStep);
    }
  };

  const handleSubmit = async () => {
    if (!formData.patientId || !formData.doctorId || !formData.appointmentDate || !formData.selectedSlot || !formData.type) {
      toast.error('Missing required fields');
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
        const successMessage = isFollowUp
          ? 'Follow-up appointment scheduled successfully.'
          : 'Appointment request submitted. Awaiting doctor confirmation.';
        toast.success(successMessage, {
          style: {
            background: '#143232',
            color: '#ffffff',
            border: '1px solid #bea032',
          },
        });
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
    const labels: Array<{ id: number; label: string }> = [];
    if (!skipDoctorStep) labels.push({ id: 1, label: 'Doctor' });
    if (!skipPatientStep) labels.push({ id: 2, label: 'Patient' });
    labels.push({ id: 3, label: 'Date & Time' });
    labels.push({ id: 4, label: 'Review' });
    return labels;
  }, [skipDoctorStep, skipPatientStep]);

  const currentStepIndex = stepLabels.findIndex(s => s.id === currentStep) + 1;

  return {
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
    lockDoctor,
    source,
    bookingChannel,
    parentAppointmentId,
    parentConsultationId,
    onSuccess,
    onCancel,
  };
}
