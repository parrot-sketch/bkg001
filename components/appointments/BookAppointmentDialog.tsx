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
    initialDoctorId,
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-0 bg-transparent shadow-none sm:rounded-2xl">
        <DialogTitle className="sr-only">Book Appointment</DialogTitle>
        {/* We use AppointmentBookingForm directly, it handles its own card layout */}
        <div className="bg-slate-50/50 backdrop-blur-md rounded-2xl shadow-2xl ring-1 ring-slate-900/5">
          <AppointmentBookingForm
            mode="full"
            initialPatientId={initialPatientId}
            initialDoctorId={initialDoctorId}
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
