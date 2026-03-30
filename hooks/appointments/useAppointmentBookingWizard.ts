import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { format, startOfDay } from 'date-fns';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { usePatientAppointments } from '@/hooks/appointments/useAppointments';

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

  return {
    // State
    currentStep,
    setCurrentStep,
    formData,
    setFormData,
    selectedPatient,
    setSelectedPatient,
    selectedDoctor,
    setSelectedDoctor,
    isSubmitting,
    
    // Computed
    isFollowUp,
    sameDoctorConflict,
    differentDoctorAppointments,
    stepLabels,
    currentStepIndex,
    
    // Handlers
    canProceed,
    handleNext,
    handleBack,
    handleSubmit,
    
    // Props (for components that need them)
    lockDoctor,
    source,
    bookingChannel,
    parentAppointmentId,
    parentConsultationId,
    onSuccess,
    onCancel,
  };
}
