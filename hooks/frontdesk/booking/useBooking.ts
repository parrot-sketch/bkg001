import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doctorApi } from '@/lib/api/doctor';
import { patientApi } from '@/lib/api/patient';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { format, startOfToday } from 'date-fns';
import { toast } from 'sonner';

export type BookingStep = 1 | 2 | 3;

export function useBooking() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId');
  
  const [currentStep, setCurrentStep] = useState<BookingStep>(1);
  const [patient, setPatient] = useState<PatientResponseDto | null>(null);
  const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection State
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorResponseDto | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfToday());
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState('Consultation');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize data
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [docsRes, patientRes] = await Promise.all([
          patientApi.getAllDoctors(),
          patientId ? frontdeskApi.getPatient(patientId) : Promise.resolve(null)
        ]);

        if (docsRes.success) setDoctors(docsRes.data || []);
        if (patientRes?.success) setPatient(patientRes.data);
      } catch (err) {
        console.error('Failed to initialize booking', err);
        toast.error('Failed to load required data');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [patientId]);

  // Load slots when doctor or date changes
  useEffect(() => {
    if (currentStep === 2 && selectedDoctor && selectedDate) {
      loadSlots();
    }
  }, [currentStep, selectedDoctor, selectedDate]);

  const loadSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await doctorApi.getAvailableSlots(selectedDoctor.id, dateStr);
      if (res.success) {
        setAvailableSlots(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load slots', err);
      toast.error('Failed to load available time slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      router.back();
    } else {
      setCurrentStep(prev => (prev - 1) as BookingStep);
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !selectedDoctor) {
      toast.error('Please select a doctor');
      return;
    }
    if (currentStep === 2 && !selectedSlot) {
      toast.error('Please select a time slot');
      return;
    }
    setCurrentStep(prev => (prev + 1) as BookingStep);
  };

  const handleBook = async () => {
    if (!patient || !selectedDoctor || !selectedDate || !selectedSlot) {
      toast.error('Missing required information');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await frontdeskApi.scheduleAppointment({
        patientId: patient.id,
        doctorId: selectedDoctor.id,
        appointmentDate: selectedDate as Date,
        time: selectedSlot,
        type: appointmentType,
        reason: reason,
        note: `Scheduled via modern booking workflow.`,
      });

      if (res.success) {
        toast.success('Appointment scheduled successfully!');
        router.push('/frontdesk/appointments');
      } else {
        toast.error(res.error || 'Failed to schedule appointment');
      }
    } catch (err) {
      console.error('Booking failed', err);
      toast.error('An unexpected error occurred during booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categorizedSlots = useMemo(() => {
    const morning: any[] = [];
    const afternoon: any[] = [];
    const evening: any[] = [];

    availableSlots.forEach(slot => {
      const timeStr = typeof slot === 'string' ? slot : slot.startTime;
      const hour = parseInt(timeStr.split(':')[0]);
      
      if (hour < 12) morning.push(slot);
      else if (hour < 17) afternoon.push(slot);
      else evening.push(slot);
    });

    return { morning, afternoon, evening };
  }, [availableSlots]);

  return {
    currentStep,
    setCurrentStep,
    patient,
    doctors,
    loading,
    selectedDoctor,
    setSelectedDoctor,
    selectedDate,
    setSelectedDate,
    availableSlots,
    loadingSlots,
    selectedSlot,
    setSelectedSlot,
    appointmentType,
    setAppointmentType,
    reason,
    setReason,
    isSubmitting,
    handleBack,
    handleNext,
    handleBook,
    categorizedSlots,
  };
}
