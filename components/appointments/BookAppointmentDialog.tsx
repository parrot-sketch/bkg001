'use client';

import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AppointmentBookingWizard } from './AppointmentBookingWizard';
import { useQueryClient } from '@tanstack/react-query';

export function BookAppointmentDialog() {
  const {
    isOpen,
    initialPatientId,
    initialPatient,
    initialDoctorId,
    initialDoctor,
    initialDate,
    initialTime,
    source,
    bookingChannel,
    parentAppointmentId,
    parentConsultationId,
    closeBookingDialog
  } = useBookAppointmentStore();

  const queryClient = useQueryClient();

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['appointmentsByDate'] });
    queryClient.invalidateQueries({ queryKey: ['frontdesk-patients'] });
    queryClient.invalidateQueries({ queryKey: ['patient'] });
    closeBookingDialog();
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeBookingDialog}>
      <DialogContent 
        className="max-w-2xl w-[95vw] max-h-[85vh] p-0 border-none bg-white rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
      >
        <DialogTitle className="sr-only">Book Appointment</DialogTitle>
        <AppointmentBookingWizard
          initialPatientId={initialPatientId}
          initialPatient={initialPatient}
          initialDoctorId={initialDoctorId}
          initialDoctor={initialDoctor}
          initialDate={initialDate}
          initialTime={initialTime}
          source={source}
          bookingChannel={bookingChannel}
          parentAppointmentId={parentAppointmentId}
          parentConsultationId={parentConsultationId}
          userRole="frontdesk"
          onSuccess={handleSuccess}
          onCancel={closeBookingDialog}
        />
      </DialogContent>
    </Dialog>
  );
}
