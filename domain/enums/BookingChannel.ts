/**
 * Domain Enum: BookingChannel
 *
 * Identifies which UI entry point initiated the appointment booking.
 * This is for analytics/UX tracking only, not business logic.
 *
 * Business logic uses AppointmentSource (who created it).
 * BookingChannel tracks where in the UI the booking was initiated.
 */
export enum BookingChannel {
  /** Dashboard quick book from available doctor card */
  DASHBOARD = 'DASHBOARD',
  /** Patient list "Book" action */
  PATIENT_LIST = 'PATIENT_LIST',
  /** Patient profile appointments tab */
  PATIENT_PROFILE = 'PATIENT_PROFILE',
}

/**
 * Type guard to check if a string is a valid BookingChannel
 */
export function isBookingChannel(value: string): value is BookingChannel {
  return Object.values(BookingChannel).includes(value as BookingChannel);
}
