'use client';

import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { AppointmentBookingWizard } from './AppointmentBookingWizard';
import { useQueryClient } from '@tanstack/react-query';

export function BookAppointmentDialog() {
  const {
    isOpen,
    initialPatientId,
    initialPatient,
    initialDoctorId,
    initialDoctor,
    lockDoctor,
    initialDate,
    initialTime,
    source,
    bookingChannel,
    parentAppointmentId,
    parentConsultationId,
    closeBookingDialog,
    markBookingSuccess,
  } = useBookAppointmentStore();

  const queryClient = useQueryClient();

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['appointmentsByDate'] });
    queryClient.invalidateQueries({ queryKey: ['frontdesk-patients'] });
    queryClient.invalidateQueries({ queryKey: ['patient'] });
    closeBookingDialog();
    markBookingSuccess();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (!open ? closeBookingDialog() : undefined)}>
      <SheetContent side="right" className="p-0 sm:max-w-[560px] w-[95vw] bg-white">
        <SheetTitle className="sr-only">Book Appointment</SheetTitle>
        <AppointmentBookingWizard
          initialPatientId={initialPatientId}
          initialPatient={initialPatient}
          initialDoctorId={initialDoctorId}
          initialDoctor={initialDoctor}
          lockDoctor={lockDoctor}
          initialDate={initialDate}
          initialTime={initialTime}
          source={source}
          bookingChannel={bookingChannel}
          parentAppointmentId={parentAppointmentId}
          parentConsultationId={parentConsultationId}
          userRole="frontdesk"
          variant="sheet"
          onSuccess={handleSuccess}
          onCancel={closeBookingDialog}
        />
      </SheetContent>
    </Sheet>
  );
}
