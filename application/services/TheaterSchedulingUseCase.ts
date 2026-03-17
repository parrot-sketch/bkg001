import { PrismaClient, TheaterBookingStatus, SurgicalCaseStatus } from '@prisma/client';
import { TheaterRepository } from '../repositories/TheaterRepository';
import { TheaterBillingService } from './TheaterBillingService';
import { TheaterNotificationService } from './TheaterNotificationService';
import { TheaterAuditService } from './TheaterAuditService';
import {
    LockTheaterSlotDto,
    ConfirmTheaterBookingDto,
    CancelTheaterBookingDto,
    TheaterSlotLockResult,
    TheaterBookingConfirmedResult,
    TheaterBookingCancelledResult,
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
     * Get scheduling queue
     */
    async getSchedulingQueue(): Promise<TheaterSchedulingQueueItem[]> {
        return this.theaterRepository.findCasesForScheduling();
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
}
