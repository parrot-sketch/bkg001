import { PrismaClient, TheaterBookingStatus, SurgicalCaseStatus } from '@prisma/client';
import { TheaterRepository } from '../repositories/TheaterRepository';
import { TheaterBillingService } from './TheaterBillingService';
import { TheaterNotificationService } from './TheaterNotificationService';
import { TheaterAuditService } from './TheaterAuditService';
import { syncDoctorCalendarEventsForSurgicalCase } from './SurgicalCaseCalendarSyncService';
import {
    LockTheaterSlotDto,
    ConfirmTheaterBookingDto,
    CancelTheaterBookingDto,
    TheaterSlotLockResult,
    TheaterBookingConfirmedResult,
    TheaterBookingCancelledResult,
    RescheduleTheaterBookingDto,
    TheaterBookingRescheduledResult,
    TheaterSchedulingQueueItem,
    TheaterWithBookings,
} from '../dtos/TheaterSchedulingDtos';

export class TheaterSchedulingUseCase {
    private readonly LOCK_TIMEOUT_MS = 15 * 60 * 1000;
    private readonly MAX_ACTIVE_LOCKS = 3;

    constructor(
        private theaterRepository: TheaterRepository,
        private billingService: TheaterBillingService,
        private notificationService: TheaterNotificationService,
        private auditService: TheaterAuditService
    ) {}

    /**
     * Get scheduling queue with pagination
     */
    async getSchedulingQueue(options?: { page?: number; limit?: number; from?: Date; to?: Date }): Promise<{ cases: TheaterSchedulingQueueItem[]; total: number }> {
        return this.theaterRepository.findCasesForScheduling(options);
    }

    /**
     * Get theaters with bookings for a date
     */
    async getTheatersForDate(date: Date): Promise<TheaterWithBookings[]> {
        return this.theaterRepository.findTheatersWithBookings(date);
    }

    /**
     * Lock a theater slot (provisional booking)
     */
    async lockSlot(dto: LockTheaterSlotDto, userId: string): Promise<TheaterSlotLockResult> {
        const { caseId, theaterId, startTime, endTime } = dto;
        const start = new Date(startTime);
        const end = new Date(endTime);
        const now = new Date();

        // Validate surgical case
        const surgicalCase = await this.theaterRepository.findCaseById(caseId);
        if (!surgicalCase) {
            throw new Error('Surgical case not found');
        }

        if (surgicalCase.status !== SurgicalCaseStatus.READY_FOR_THEATER_BOOKING) {
            throw new Error(`Case must be in READY_FOR_THEATER_BOOKING status (current: ${surgicalCase.status})`);
        }

        // Check for overlapping bookings
        const overlap = await this.theaterRepository.findOverlappingBookings(theaterId, start, end);
        
        if (overlap) {
            // Idempotency check
            const existingForCase = await this.theaterRepository.findExistingLockForCase(caseId, userId);
            if (existingForCase && existingForCase.theater_id === theaterId) {
                const theater = await this.theaterRepository.findTheaterById(theaterId);
                return {
                    bookingId: existingForCase.id,
                    status: existingForCase.status,
                    theaterId: existingForCase.theater_id,
                    theaterName: theater?.name || 'Unknown',
                    startTime: existingForCase.start_time,
                    endTime: existingForCase.end_time,
                    lockedAt: existingForCase.locked_at!,
                    lockExpiresAt: existingForCase.lock_expires_at!,
                    caseId,
                    caseStatus: surgicalCase.status,
                };
            }
            throw new Error('Theater slot is already booked or locked by another user');
        }

        // Check lock limit
        const lockExpiration = new Date(now.getTime() - this.LOCK_TIMEOUT_MS);
        const activeLocks = await this.theaterRepository.countActiveLocks(userId, lockExpiration);
        
        if (activeLocks >= this.MAX_ACTIVE_LOCKS) {
            throw new Error(`You have reached the maximum number of active locks (${this.MAX_ACTIVE_LOCKS}). Please confirm or release existing locks.`);
        }

        // Create booking
        const prisma = (this.theaterRepository as any).prisma;
        const booking = await prisma.theaterBooking.create({
            data: {
                surgical_case_id: caseId,
                theater_id: theaterId,
                start_time: start,
                end_time: end,
                status: TheaterBookingStatus.PROVISIONAL,
                locked_by: userId,
                locked_at: now,
                lock_expires_at: new Date(now.getTime() + this.LOCK_TIMEOUT_MS),
            },
        });

        const theater = await this.theaterRepository.findTheaterById(theaterId);

        // Audit
        await this.auditService.logSlotLocked(userId, caseId, theater?.name || 'Unknown', start, end);

        return {
            bookingId: booking.id,
            status: booking.status,
            theaterId: booking.theater_id,
            theaterName: theater?.name || 'Unknown',
            startTime: booking.start_time,
            endTime: booking.end_time,
            lockedAt: booking.locked_at!,
            lockExpiresAt: booking.lock_expires_at!,
            caseId,
            caseStatus: surgicalCase.status,
        };
    }

    /**
     * Confirm a provisional booking with billing
     */
    async confirmBooking(dto: ConfirmTheaterBookingDto, userId: string): Promise<TheaterBookingConfirmedResult> {
        const { bookingId } = dto;
        const now = new Date();

        // Load booking
        const booking = await this.theaterRepository.findBookingById(bookingId);
        if (!booking) {
            throw new Error('Theater booking not found');
        }

        if (booking.status === TheaterBookingStatus.CONFIRMED) {
            throw new Error('Booking is already confirmed');
        }

        if (booking.status !== TheaterBookingStatus.PROVISIONAL) {
            throw new Error(`Cannot confirm booking in status: ${booking.status}`);
        }

        // Check lock expiration
        if (booking.lock_expires_at && booking.lock_expires_at < now) {
            throw new Error('Booking lock has expired. Please select the slot again.');
        }

        const prisma = (this.theaterRepository as any).prisma;

        // Update booking status
        const confirmedBooking = await prisma.theaterBooking.update({
            where: { id: bookingId },
            data: {
                status: TheaterBookingStatus.CONFIRMED,
                confirmed_by: userId,
                confirmed_at: now,
                version: { increment: 1 },
            },
        });

        // Get previous status before update
        const previousStatus = booking.surgical_case.status;

        // Update case status
        const updatedCase = await this.theaterRepository.updateCaseStatus(
            booking.surgical_case_id,
            SurgicalCaseStatus.SCHEDULED
        );

        // Log status transition
        await this.auditService.logStatusTransition(
            userId,
            booking.surgical_case_id,
            previousStatus,
            SurgicalCaseStatus.SCHEDULED,
            {
                theater_id: booking.theater_id,
                theater_name: booking.theater.name,
                booking_id: bookingId,
            }
        );

        // Handle billing
        const billingResult = await this.billingService.createTheaterFeeForBooking(
            booking,
            confirmedBooking
        );

        // Send notifications
        await this.notificationService.notifyTheaterBooked(
            booking,
            confirmedBooking,
            userId
        );

        await syncDoctorCalendarEventsForSurgicalCase(prisma, booking.surgical_case_id);

        // Audit confirmation
        const feeAmount = billingResult.theaterFee?.amount || 0;
        await this.auditService.logBookingConfirmed(
            userId,
            booking.surgical_case_id,
            booking.theater.name,
            feeAmount
        );

        return {
            bookingId: confirmedBooking.id,
            status: confirmedBooking.status,
            theaterId: confirmedBooking.theater_id,
            theaterName: booking.theater.name,
            startTime: confirmedBooking.start_time,
            endTime: confirmedBooking.end_time,
            confirmedAt: confirmedBooking.confirmed_at!,
            caseId: booking.surgical_case_id,
            caseStatus: updatedCase.status,
            billing: billingResult,
        };
    }

    /**
     * Cancel a theater booking with billing reversal
     */
    async cancelBooking(dto: CancelTheaterBookingDto, userId: string): Promise<TheaterBookingCancelledResult> {
        const { bookingId, reason } = dto;

        const prisma = (this.theaterRepository as any).prisma;
        
        const booking = await prisma.theaterBooking.findUnique({
            where: { id: bookingId },
            include: {
                theater: { select: { name: true } },
                surgical_case: {
                    include: { patient: { select: { id: true, first_name: true, last_name: true } } },
                },
            },
        });

        if (!booking) {
            throw new Error('Theater booking not found');
        }

        // Cancel booking
        await prisma.theaterBooking.update({
            where: { id: bookingId },
            data: {
                status: TheaterBookingStatus.CANCELLED,
                version: { increment: 1 },
            },
        });

        let billingReversed = false;
        let reversedAmount = 0;

        // If confirmed, revert case status and reverse billing
        if (booking.status === TheaterBookingStatus.CONFIRMED) {
            const previousStatus = booking.surgical_case.status;
            
            // Revert case status
            await this.theaterRepository.updateCaseStatus(
                booking.surgical_case_id,
                SurgicalCaseStatus.READY_FOR_THEATER_BOOKING
            );

            // Log status transition
            await this.auditService.logStatusTransition(
                userId,
                booking.surgical_case_id,
                previousStatus,
                SurgicalCaseStatus.READY_FOR_THEATER_BOOKING,
                { action: 'booking_cancelled', reason }
            );

            // Reverse billing
            const billingResult = await this.billingService.reverseTheaterFee(booking.surgical_case_id);
            billingReversed = billingResult.reversed;
            reversedAmount = billingResult.amount;
        }

        await syncDoctorCalendarEventsForSurgicalCase(prisma, booking.surgical_case_id);

        // Notify
        await this.notificationService.notifyBookingCancelled(booking, userId);

        // Audit
        await this.auditService.logBookingCancelled(userId, booking.surgical_case_id, reason, reversedAmount);

        return {
            bookingId,
            status: TheaterBookingStatus.CANCELLED,
            caseId: booking.surgical_case_id,
            caseStatus: SurgicalCaseStatus.READY_FOR_THEATER_BOOKING,
            billingReversed,
            reversedAmount,
        };
    }

    /**
     * Reschedule an existing confirmed booking (updates the existing booking row).
     *
     * Notes:
     * - TheaterBooking is unique per surgical case, so rescheduling must update in place.
     * - Case status remains SCHEDULED (this is a scheduling action, not a clinical rollback).
     * - Billing is recalculated by reversing existing theater fee and re-applying based on new slot.
     */
    async rescheduleBooking(dto: RescheduleTheaterBookingDto, userId: string): Promise<TheaterBookingRescheduledResult> {
        const { bookingId, theaterId, startTime, endTime, reason } = dto;
        const start = new Date(startTime);
        const end = new Date(endTime);
        const now = new Date();

        const existing = await this.theaterRepository.findBookingById(bookingId);
        if (!existing) {
            throw new Error('Theater booking not found');
        }

        if (existing.status !== TheaterBookingStatus.CONFIRMED) {
            throw new Error(`Only CONFIRMED bookings can be rescheduled (current: ${existing.status})`);
        }

        const overlap = await this.theaterRepository.findOverlappingBookings(theaterId, start, end, bookingId);
        if (overlap) {
            throw new Error('The selected theater slot is not available');
        }

        const prisma = (this.theaterRepository as any).prisma as PrismaClient;

        const from = {
            theaterName: existing.theater.name,
            startTime: existing.start_time,
            endTime: existing.end_time,
        };

        const updated = await prisma.theaterBooking.update({
            where: { id: bookingId },
            data: {
                theater_id: theaterId,
                start_time: start,
                end_time: end,
                version: { increment: 1 },
                confirmed_by: userId,
                confirmed_at: now,
            },
            include: {
                theater: true,
                surgical_case: {
                    include: {
                        patient: { select: { id: true, first_name: true, last_name: true, file_number: true } },
                        primary_surgeon: { select: { id: true, name: true, user_id: true } },
                    },
                },
            },
        });

        // Billing: remove prior theater fee then re-apply based on updated slot.
        const reversal = await this.billingService.reverseTheaterFee(updated.surgical_case_id);
        const billing = await this.billingService.createTheaterFeeForBooking(updated, updated);

        // Notifications + audit
        await this.notificationService.notifyBookingRescheduled(updated, userId);
        await this.auditService.logBookingRescheduled(
            userId,
            updated.surgical_case_id,
            from,
            { theaterName: updated.theater.name, startTime: updated.start_time, endTime: updated.end_time },
            reason,
        );

        await syncDoctorCalendarEventsForSurgicalCase(prisma, updated.surgical_case_id);

        return {
            bookingId: updated.id,
            status: updated.status,
            theaterId: updated.theater_id,
            theaterName: updated.theater.name,
            startTime: updated.start_time,
            endTime: updated.end_time,
            rescheduledAt: now,
            caseId: updated.surgical_case_id,
            caseStatus: updated.surgical_case.status,
            billing: {
                reversed: reversal.reversed,
                reversedAmount: reversal.amount,
                created: billing.created,
                theaterFee: billing.theaterFee,
            },
        };
    }
}
