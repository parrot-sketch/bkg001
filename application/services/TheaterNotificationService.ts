import { Role } from '@prisma/client';
import { createNotification, createNotificationForRole } from '@/lib/notifications/createNotification';
import { format } from 'date-fns';

export class TheaterNotificationService {
    /**
     * Notify relevant parties when a theater booking is confirmed
     */
    async notifyTheaterBooked(booking: any, confirmedBooking: any, userId: string): Promise<void> {
        const patientName = `${booking.surgical_case.patient.first_name} ${booking.surgical_case.patient.last_name}`.trim();
        const procedureName = booking.surgical_case.procedure_name || 'Surgical procedure';
        const bookingDate = format(booking.start_time, 'MMM d, yyyy');
        const bookingTime = format(booking.start_time, 'HH:mm');

        // Notify surgeon
        if (booking.surgical_case.primary_surgeon?.user_id) {
            await createNotification({
                userId: booking.surgical_case.primary_surgeon.user_id,
                type: 'IN_APP',
                subject: 'Theater Booked for Your Case',
                message: `${patientName} - ${procedureName} scheduled for ${bookingDate} at ${bookingTime} in ${booking.theater.name}.`,
                metadata: {
                    surgicalCaseId: booking.surgical_case_id,
                    bookingId: confirmedBooking.id,
                    event: 'THEATER_BOOKED',
                },
                senderId: userId,
            });
        }

        // Notify nurses
        await createNotificationForRole(Role.NURSE, {
            type: 'IN_APP',
            subject: 'Theater Booking Confirmed',
            message: `${patientName} - ${procedureName} scheduled for ${bookingDate} at ${bookingTime} in ${booking.theater.name}.`,
            metadata: {
                surgicalCaseId: booking.surgical_case_id,
                bookingId: confirmedBooking.id,
                event: 'THEATER_BOOKED',
            },
            senderId: userId,
        });
    }

    /**
     * Notify relevant parties when a booking is cancelled
     */
    async notifyBookingCancelled(booking: any, userId: string): Promise<void> {
        const patientName = booking.surgical_case?.patient
            ? `${booking.surgical_case.patient.first_name} ${booking.surgical_case.patient.last_name}`.trim()
            : 'Patient';

        await createNotificationForRole(Role.NURSE, {
            type: 'IN_APP',
            subject: 'Theater Booking Cancelled',
            message: `${patientName} - Theater booking in ${booking.theater.name} has been cancelled.`,
            metadata: {
                surgicalCaseId: booking.surgical_case_id,
                bookingId: booking.id,
                event: 'THEATER_CANCELLED',
            },
            senderId: userId,
        });
    }

    /**
     * Notify when a slot is locked (optional - for real-time updates)
     */
    async notifySlotLocked(booking: any, userId: string): Promise<void> {
        // Could add notifications for relevant staff about provisional locks
    }
}
