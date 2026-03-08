import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { useCheckIn } from '@/hooks/frontdesk/useTodaysSchedule';
import { AppointmentStatus, canCheckIn, isAwaitingConfirmation } from '@/domain/enums/AppointmentStatus';

export function useAppointmentDetail(params: Promise<{ id: string }>) {
  const { id } = use(params);
  const router = useRouter();
  const appointmentId = parseInt(id, 10);
  
  const { data: appointment, isLoading, error } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const response = await frontdeskApi.getAppointment(appointmentId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load appointment');
      }
      return response.data;
    },
    enabled: !isNaN(appointmentId),
  });

  const { mutate: checkIn, isPending: isCheckingIn } = useCheckIn();

  const handleCheckIn = () => {
    checkIn({ appointmentId }, {
      onSuccess: () => {
        router.refresh();
      },
    });
  };

  const showCheckInButton = appointment ? canCheckIn(appointment.status as AppointmentStatus) : false;
  const showAwaitingConfirmation = appointment ? isAwaitingConfirmation(appointment.status as AppointmentStatus) : false;
  
  const patientName = appointment?.patient 
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim()
    : 'Unknown Patient';

  return {
    appointment,
    isLoading,
    error,
    isCheckingIn,
    handleCheckIn,
    showCheckInButton,
    showAwaitingConfirmation,
    patientName,
    router,
    appointmentId
  };
}
