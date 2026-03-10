'use client';

import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AppointmentBookingForm } from './AppointmentBookingForm';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Global Appointment Booking Dialog
 * 
 * Powered by Zustand `useBookAppointmentStore`. Can be triggered from anywhere
 * in the Frontdesk layout. Maintains the user's navigational context while
 * displaying the booking form inside a clean, modern modal.
 */
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
    // Invalidate queries so the underlying pages refresh their data
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['appointmentsByDate'] });
    queryClient.invalidateQueries({ queryKey: ['frontdesk-patients'] });
    queryClient.invalidateQueries({ queryKey: ['patient'] });
    closeBookingDialog();
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeBookingDialog}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] overflow-hidden p-0 border-none bg-white rounded-[2rem] shadow-2xl ring-1 ring-slate-200/50">
        <DialogTitle className="sr-only">Book Appointment</DialogTitle>
        <div className="h-full flex flex-col overflow-y-auto custom-scrollbar bg-white">
          <AppointmentBookingForm
            mode="full"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
