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
     * Attempt to lock a slot for a case (Provisional Booking)
     * Two-phase booking: 1. Lock/Provisional -> 2. Confirm
     */
    async lockSlot(caseId: string, theaterId: string, startTime: Date, endTime: Date, userId: string): Promise<TheaterBooking> {
        const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
        const now = new Date();
        const lockExpiration = new Date(now.getTime() - LOCK_TIMEOUT_MS);

        // HARDENING 1: Lock Limit Rule (Max 3 active locks per user)
        const myActiveLocks = await this.prisma.theaterBooking.count({
            where: {
                locked_by: userId,
                status: 'PROVISIONAL',
                locked_at: { gt: lockExpiration }
            }
        });

        if (myActiveLocks >= 3) {
            // Check if one of them is THIS case (idempotency override)
            const existingLock = await this.prisma.theaterBooking.findFirst({
                where: {
                    surgical_case_id: caseId,
                    locked_by: userId,
                    status: 'PROVISIONAL',
                    locked_at: { gt: lockExpiration }
                }
            });
            if (!existingLock) {
                throw new Error('You have reached the maximum number of active locks (3). Please confirm or release existing keys.');
            }
        }

        // 1. Check for conflicts
        // Conflict if:
        // - Status is CONFIRMED
        // - OR Status is PROVISIONAL AND still within validity window
        const conflict = await this.prisma.theaterBooking.findFirst({
            where: {
                theater_id: theaterId,
                status: { not: 'CANCELLED' },
                AND: [
                    {
                        start_time: { lt: endTime },
                        end_time: { gt: startTime }
                    },
                    {
                        OR: [
                            { status: 'CONFIRMED' },
                            {
                                AND: [
                                    { status: 'PROVISIONAL' },
                                    // Use explicit expiry field if available, fallback to calc
                                    {
                                        OR: [
                                            { lock_expires_at: { gt: now } },
                                            { locked_at: { gt: lockExpiration } }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        });

        if (conflict) {
            // Idempotency: If I already hold the lock for this exact slot/case, return it
            if (conflict.locked_by === userId && conflict.surgical_case_id === caseId && conflict.status === 'PROVISIONAL') {
                // Refresh lock if near expiry? Optional.
                return conflict;
            }
            throw new Error('Theater is already booked or locked for this time slot');
        }

        // 2. Create Provisional Booking
        // Use transaction to ensure cleanup of old attempts for this case
        return this.prisma.$transaction(async (tx) => {
            // Cleanup previous booking for this case if exists (e.g. failed previous attempt)
            await tx.theaterBooking.deleteMany({
                where: { surgical_case_id: caseId }
            });

            const booking = await tx.theaterBooking.create({
                data: {
                    surgical_case_id: caseId,
                    theater_id: theaterId,
                    start_time: startTime,
                    end_time: endTime,
                    status: 'PROVISIONAL',
                    locked_by: userId,
                    locked_at: now,
                    lock_expires_at: new Date(now.getTime() + LOCK_TIMEOUT_MS)
                }
            });
            return booking;
        });
    }

    /**
     * Confirm a locked booking
     */
    async confirmBooking(bookingId: string, userId: string, userRole?: string): Promise<TheaterBooking> {
        return this.prisma.$transaction(async (tx) => {
            const booking = await tx.theaterBooking.findUnique({ where: { id: bookingId } });
            if (!booking) throw new Error("Booking not found");

            if (booking.status === 'CONFIRMED') return booking; // Already confirmed
            if (booking.status !== 'PROVISIONAL') throw new Error("Booking is not in provisional state");

            // Check lock expiration
            // Prefer tracking field, fallback to calc
            const now = new Date();
            const expiredByField = booking.lock_expires_at && booking.lock_expires_at < now;
            const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
            const expiredByCalc = booking.locked_at && (now.getTime() - booking.locked_at.getTime() > LOCK_TIMEOUT_MS);

            if (expiredByField || (!booking.lock_expires_at && expiredByCalc)) {
                throw new Error("Booking lock has expired. Please try again.");
            }

            // Verify ownership with Admin Override
            if (booking.locked_by !== userId) {
                if (userRole === 'ADMIN') {
                    // TODO: Log audit event for override
                    console.warn(`[AUDIT] Admin ${userId} overrode lock held by ${booking.locked_by}`);
                } else {
                    throw new Error("Booking is locked by another user");
                }
            }

            // Update Status to CONFIRMED
            const updated = await tx.theaterBooking.update({
                where: { id: bookingId },
                data: {
                    status: 'CONFIRMED',
                    confirmed_by: userId, // Updated field name based on schema
                    confirmed_at: now
                }
            });

            // Update Case to SCHEDULED
            await tx.surgicalCase.update({
                where: { id: booking.surgical_case_id },
                data: { status: 'SCHEDULED' }
            });

            return updated;
        });
    }

    /**
     * Legacy immediate booking (One-step)
     * Kept for backward compatibility if needed, but internally uses similar logic
     */
    async bookSlot(caseId: string, theaterId: string, startTime: Date, endTime: Date, userId: string): Promise<TheaterBooking> {
        // Reuse lock -> confirm logic for simplicity/DRY?
        // Or keep original implementation? Original implementation is fine for now but let's just make it call the new methods if we want atomic consistency, 
        // BUT calling two transactions is not atomic. 
        // So keeping original implementation for atomic one-step booking is better.

        // 1. Check for conflicts
        const conflict = await this.prisma.theaterBooking.findFirst({
            where: {
                theater_id: theaterId,
                status: { not: 'CANCELLED' },
                OR: [
                    {
                        start_time: { lt: endTime },
                        end_time: { gt: startTime },
                        // For legacy force-book, we respect all non-cancelled bookings
                    }
                ]
            }
        });

        if (conflict) {
            throw new Error('Theater is already booked for this time slot');
        }

        // 2. Wrap in transaction: Create booking & Update Case Status
        return this.prisma.$transaction(async (tx) => {
            // Cleanup previous booking for this case
            await tx.theaterBooking.deleteMany({
                where: { surgical_case_id: caseId }
            });

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

            // Revert Case to READY_FOR_SCHEDULING
            await tx.surgicalCase.update({
                where: { id: booking.surgical_case_id },
                data: { status: 'READY_FOR_SCHEDULING' }
            });
        });
    }
}
