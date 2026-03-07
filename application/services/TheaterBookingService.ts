import { PrismaClient, TheaterBookingStatus, SurgicalCaseStatus } from '@prisma/client';

export class TheaterBookingService {
    constructor(private db: PrismaClient) {}

    /**
     * Creates a provisional mapping (lock) for a theater slot.
     * Prevents double-booking using optimistic concurrency control.
     */
    async createProvisionalLock(
        caseId: string,
        theaterId: string,
        startTime: Date,
        endTime: Date,
        userId: string
    ) {
        return this.db.$transaction(async (tx) => {
            // 1. Verify Surgical Case Status
            const surgicalCase = await tx.surgicalCase.findUnique({
                where: { id: caseId },
                select: { status: true },
            });

            if (!surgicalCase) {
                throw new Error('Surgical case not found');
            }

            if (surgicalCase.status !== SurgicalCaseStatus.READY_FOR_SCHEDULING) {
                throw new Error(`Cannot book theater for case in status: ${surgicalCase.status}`);
            }

            // 2. Check for Overlapping Bookings in the specific theater
            // An overlap occurs if a booking starts before our end time AND ends after our start time
            // We ignore CANCELLED bookings. We must check CONFIRMED and active PROVISIONAL bookings.
            const now = new Date();
            const overlappingBooking = await tx.theaterBooking.findFirst({
                where: {
                    theater_id: theaterId,
                    status: {
                        in: [TheaterBookingStatus.CONFIRMED, TheaterBookingStatus.PROVISIONAL]
                    },
                    start_time: { lt: endTime },
                    end_time: { gt: startTime },
                    // If provisional, only consider it an overlap if the lock hasn't expired
                    OR: [
                        { status: TheaterBookingStatus.CONFIRMED },
                        { 
                            status: TheaterBookingStatus.PROVISIONAL,
                            lock_expires_at: { gt: now }
                        }
                    ]
                }
            });

            if (overlappingBooking) {
                throw new Error('This theater slot is already booked or locked by another user');
            }

            // 3. Upsert Provisional Booking
            // A case can only have one booking. If one exists (e.g. an expired provisional), replace it.
            const lockExpiresAt = new Date(now.getTime() + 15 * 60000); // 15 minutes lock

            const existingBooking = await tx.theaterBooking.findUnique({
                where: { surgical_case_id: caseId }
            });

            if (existingBooking) {
                // We only update if it is an expired provisional or a cancelled booking
                if (existingBooking.status === TheaterBookingStatus.CONFIRMED) {
                    throw new Error('This case already has a confirmed theater booking');
                }
                if (existingBooking.status === TheaterBookingStatus.PROVISIONAL && existingBooking.lock_expires_at && existingBooking.lock_expires_at > now) {
                     // Check if it's the same user reviving their own lock, else block it
                     if (existingBooking.locked_by !== userId) {
                         throw new Error('This case is currently being booked by another user');
                     }
                }

                return tx.theaterBooking.update({
                    where: { id: existingBooking.id },
                    data: {
                        theater_id: theaterId,
                        start_time: startTime,
                        end_time: endTime,
                        status: TheaterBookingStatus.PROVISIONAL,
                        locked_by: userId,
                        locked_at: now,
                        lock_expires_at: lockExpiresAt,
                        version: { increment: 1 }
                    }
                });
            }

            return tx.theaterBooking.create({
                data: {
                    surgical_case_id: caseId,
                    theater_id: theaterId,
                    start_time: startTime,
                    end_time: endTime,
                    status: TheaterBookingStatus.PROVISIONAL,
                    locked_by: userId,
                    locked_at: now,
                    lock_expires_at: lockExpiresAt,
                }
            });
        });
    }

    /**
     * Confirms a provisional booking, officially scheduling the surgery.
     */
    async confirmBooking(bookingId: string, userId: string) {
        return this.db.$transaction(async (tx) => {
            const booking = await tx.theaterBooking.findUnique({
                where: { id: bookingId }
            });

            if (!booking) {
                throw new Error('Theater booking not found');
            }

            if (booking.status === TheaterBookingStatus.CONFIRMED) {
                throw new Error('Booking is already confirmed');
            }

            if (booking.status !== TheaterBookingStatus.PROVISIONAL) {
                throw new Error(`Cannot confirm booking in status: ${booking.status}`);
            }

            // Ensure lock hasn't expired
            const now = new Date();
            if (booking.lock_expires_at && booking.lock_expires_at < now) {
                throw new Error('Your provisional booking lock has expired. Please select the slot again.');
            }

            // Confirm the booking
            const confirmedBooking = await tx.theaterBooking.update({
                where: { id: bookingId },
                data: {
                    status: TheaterBookingStatus.CONFIRMED,
                    confirmed_by: userId,
                    confirmed_at: now,
                    version: { increment: 1 }
                }
            });

            // Transition the surgical case
            await tx.surgicalCase.update({
                where: { id: booking.surgical_case_id },
                data: { status: SurgicalCaseStatus.SCHEDULED }
            });

            // Log the action
            await tx.auditLog.create({
                data: {
                    user_id: userId,
                    record_id: booking.surgical_case_id,
                    action: 'UPDATE',
                    model: 'SurgicalCase',
                    details: 'Case transitioned from READY_FOR_SCHEDULING to SCHEDULED (Theater booked)',
                }
            });

            return confirmedBooking;
        });
    }

    /**
     * Cancels an existing booking or lock.
     */
    async cancelBooking(bookingId: string, userId: string) {
        return this.db.$transaction(async (tx) => {
            const booking = await tx.theaterBooking.findUnique({
                where: { id: bookingId }
            });

            if (!booking) {
                throw new Error('Theater booking not found');
            }

            await tx.theaterBooking.update({
                where: { id: bookingId },
                data: {
                    status: TheaterBookingStatus.CANCELLED,
                    version: { increment: 1 }
                }
            });

            // Attempt to revert case to READY_FOR_SCHEDULING if it was SCHEDULED
            if (booking.status === TheaterBookingStatus.CONFIRMED) {
                 await tx.surgicalCase.update({
                    where: { id: booking.surgical_case_id },
                    data: { status: SurgicalCaseStatus.READY_FOR_SCHEDULING }
                });

                await tx.auditLog.create({
                    data: {
                        user_id: userId,
                        record_id: booking.surgical_case_id,
                        action: 'UPDATE',
                        model: 'SurgicalCase',
                        details: 'Theater booking cancelled, case reverted to READY_FOR_SCHEDULING',
                    }
                });
            }
        });
    }
}
