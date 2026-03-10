import { PrismaClient, TheaterBookingStatus, SurgicalCaseStatus, BillType, PaymentStatus, PriceType } from '@prisma/client';

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
     * Also creates/updates a billing record with the theater usage fee.
     */
    async confirmBooking(bookingId: string, userId: string) {
        return this.db.$transaction(async (tx) => {
            // 1. Load booking — first pass for validation
            const booking = await tx.theaterBooking.findUnique({
                where: { id: bookingId },
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

            // 2. Confirm the booking
            const confirmedBooking = await tx.theaterBooking.update({
                where: { id: bookingId },
                data: {
                    status: TheaterBookingStatus.CONFIRMED,
                    confirmed_by: userId,
                    confirmed_at: now,
                    version: { increment: 1 },
                },
            });

            // 3. Transition the surgical case to SCHEDULED
            await tx.surgicalCase.update({
                where: { id: booking.surgical_case_id },
                data: { status: SurgicalCaseStatus.SCHEDULED },
            });

            // 4. Fetch theater hourly rate and patient_id for billing
            const [theater, surgicalCase] = await Promise.all([
                tx.theater.findUnique({
                    where: { id: booking.theater_id },
                    select: { hourly_rate: true, name: true },
                }),
                tx.surgicalCase.findUnique({
                    where: { id: booking.surgical_case_id },
                    select: { patient_id: true },
                }),
            ]);

            if (!surgicalCase) {
                throw new Error('Surgical case not found during billing');
            }

            // 5. Calculate theater fee
            const durationMs = booking.end_time.getTime() - booking.start_time.getTime();
            const durationHours = durationMs / (1000 * 60 * 60);
            const feeAmount = Math.round((theater?.hourly_rate ?? 0) * durationHours);

            // 6. Find or create the "Theater Usage Fee" service entry
            let theaterService = await tx.service.findFirst({
                where: { service_name: 'Theater Usage Fee', category: 'THEATER' },
            });
            if (!theaterService) {
                theaterService = await tx.service.create({
                    data: {
                        service_name: 'Theater Usage Fee',
                        description: 'Calculated hourly theater room usage fee',
                        price: 0,
                        category: 'THEATER',
                        price_type: PriceType.VARIABLE,
                        is_active: true,
                    },
                });
            }

            // 7. Upsert the Payment record for this surgical case
            const payment = await tx.payment.upsert({
                where: { surgical_case_id: booking.surgical_case_id },
                create: {
                    patient_id: surgicalCase.patient_id,
                    surgical_case_id: booking.surgical_case_id,
                    bill_date: now,
                    total_amount: feeAmount,
                    bill_type: BillType.SURGERY,
                    status: PaymentStatus.UNPAID,
                },
                update: {
                    total_amount: { increment: feeAmount },
                },
            });

            // 8. Remove any existing theater fee line item (idempotent rebook handling)
            await tx.patientBill.deleteMany({
                where: {
                    payment_id: payment.id,
                    service_id: theaterService.id,
                },
            });

            // 9. Create the theater fee billing line item
            if (feeAmount > 0) {
                await tx.patientBill.create({
                    data: {
                        payment_id: payment.id,
                        service_id: theaterService.id,
                        service_date: booking.start_time,
                        quantity: 1,
                        unit_cost: feeAmount,
                        total_cost: feeAmount,
                    },
                });
            }

            // 10. Audit log
            await tx.auditLog.create({
                data: {
                    user_id: userId,
                    record_id: booking.surgical_case_id,
                    action: 'UPDATE',
                    model: 'SurgicalCase',
                    details: `Case scheduled. Theater: ${theater?.name ?? booking.theater_id}. Fee: KES ${feeAmount} for ${durationHours.toFixed(2)}h.`,
                },
            });

            return confirmedBooking;
        });
    }

    /**
     * Cancels an existing booking or lock.
     * If the booking was confirmed, also reverses the theater fee billing.
     */
    async cancelBooking(bookingId: string, userId: string) {
        return this.db.$transaction(async (tx) => {
            const booking = await tx.theaterBooking.findUnique({
                where: { id: bookingId }
            });

            if (!booking) {
                throw new Error('Theater booking not found');
            }

            // 1. Mark booking as cancelled
            await tx.theaterBooking.update({
                where: { id: bookingId },
                data: {
                    status: TheaterBookingStatus.CANCELLED,
                    version: { increment: 1 }
                }
            });

            // 2. If it was confirmed, revert the case and reverse billing
            if (booking.status === TheaterBookingStatus.CONFIRMED) {
                 // a. Revert surgical case status
                 await tx.surgicalCase.update({
                    where: { id: booking.surgical_case_id },
                    data: { status: SurgicalCaseStatus.READY_FOR_SCHEDULING }
                });

                // b. Reverse billing: Find the theater fee service
                const theaterService = await tx.service.findFirst({
                    where: { service_name: 'Theater Usage Fee', category: 'THEATER' }
                });

                if (theaterService) {
                    // Find the payment for this case
                    const payment = await tx.payment.findUnique({
                        where: { surgical_case_id: booking.surgical_case_id }
                    });

                    if (payment) {
                        // Find the theater fee line item
                        const feeLineItems = await tx.patientBill.findMany({
                            where: {
                                payment_id: payment.id,
                                service_id: theaterService.id
                            }
                        });

                        // Deduct the total cost of these line items from the payment
                        const totalFeeToReverse = feeLineItems.reduce((sum, item) => sum + item.total_cost, 0);

                        if (totalFeeToReverse > 0) {
                            await tx.payment.update({
                                where: { id: payment.id },
                                data: { total_amount: { decrement: totalFeeToReverse } }
                            });

                            // Delete the line items
                            await tx.patientBill.deleteMany({
                                where: {
                                    payment_id: payment.id,
                                    service_id: theaterService.id
                                }
                            });
                        }
                    }
                }

                // c. Audit log
                await tx.auditLog.create({
                    data: {
                        user_id: userId,
                        record_id: booking.surgical_case_id,
                        action: 'UPDATE',
                        model: 'SurgicalCase',
                        details: 'Theater booking cancelled, fee reversed, case reverted to READY_FOR_SCHEDULING',
                    }
                });
            }
        });
    }
}
