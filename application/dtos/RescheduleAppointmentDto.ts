/**
 * DTO: RescheduleAppointmentDto
 * 
 * Data Transfer Object for rescheduling an appointment.
 */
export interface RescheduleAppointmentDto {
    /**
     * Appointment ID to reschedule
     */
    readonly appointmentId: number;

    /**
     * New date for the appointment (YYYY-MM-DD or ISO string)
     */
    readonly newDate: Date | string;

    /**
     * New time for the appointment (HH:mm)
     */
    readonly newTime: string;

    /**
     * Reason for rescheduling (optional)
     * Sent to patient in notification
     */
    readonly reason?: string;
}
