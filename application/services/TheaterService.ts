import { PrismaClient, Theater, TheaterBooking } from '@prisma/client';
import { db } from '@/lib/db';

export class TheaterService {
    constructor(private prisma: PrismaClient) { }

    /**
     * Get all theaters with their bookings for a specific date range
     */
    async getTheaters(startDate: Date, endDate: Date) {
        return this.prisma.theater.findMany({
            where: { is_active: true },
            include: {
                bookings: {
                    where: {
                        start_time: { gte: startDate, lt: endDate },
                        status: { not: 'CANCELLED' }
                    }
                }
            }
        });
    }

    /**
     * Attempt to book a slot for a case
     */
    async bookSlot(caseId: string, theaterId: string, startTime: Date, endTime: Date, userId: string): Promise<TheaterBooking> {
        // 1. Check for conflicts
        const conflict = await this.prisma.theaterBooking.findFirst({
            where: {
                theater_id: theaterId,
                status: { not: 'CANCELLED' },
                OR: [
                    {
                        start_time: { lt: endTime },
                        end_time: { gt: startTime }
                    }
                ]
            }
        });

        if (conflict) {
            throw new Error('Theater is already booked for this time slot');
        }

        // 2. Wrap in transaction: Create booking & Update Case Status
        return this.prisma.$transaction(async (tx) => {
            // Create Booking
            const booking = await tx.theaterBooking.create({
                data: {
                    surgical_case_id: caseId,
                    theater_id: theaterId,
                    start_time: startTime,
                    end_time: endTime,
                    status: 'CONFIRMED',
                    locked_by: userId,
                    locked_at: new Date()
                }
            });

            // Update Case to SCHEDULED
            await tx.surgicalCase.update({
                where: { id: caseId },
                data: { status: 'SCHEDULED' }
            });

            return booking;
        });
    }

    /**
     * Cancel a booking
     */
    async cancelBooking(bookingId: string, reason: string) {
        return this.prisma.$transaction(async (tx) => {
            const booking = await tx.theaterBooking.findUnique({ where: { id: bookingId } });
            if (!booking) throw new Error("Booking not found");

            // Update Booking
            await tx.theaterBooking.update({
                where: { id: bookingId },
                data: { status: 'CANCELLED' }
            });

            // Revert Case to READY_FOR_SCHEDULING (or PLANNING?)
            // Usually goes back to READY_FOR_SCHEDULING so it can be rebooked
            await tx.surgicalCase.update({
                where: { id: booking.surgical_case_id },
                data: { status: 'READY_FOR_SCHEDULING' }
            });
        });
    }
}
