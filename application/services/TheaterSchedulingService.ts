import { PrismaClient, TheaterBookingStatus, SurgicalCaseStatus, BillType, PaymentStatus, PriceType } from '@prisma/client';
import { db } from '@/lib/db';
import {
    LockTheaterSlotDto,
    ConfirmTheaterBookingDto,
    CancelTheaterBookingDto,
    TheaterSlotLockResult,
    TheaterBookingConfirmedResult,
    TheaterBookingCancelledResult,
    TheaterSchedulingQueueItem,
    TheaterWithBookings,
    TheaterBookingSlot,
} from '../dtos/TheaterSchedulingDtos';
import { createNotification, createNotificationForRole } from '@/lib/notifications/createNotification';
import { Role } from '@prisma/client';
import { format } from 'date-fns';

export class TheaterSchedulingService {
    public readonly prisma: PrismaClient;
    private readonly LOCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
    private readonly MAX_ACTIVE_LOCKS = 3;

    constructor(prisma: PrismaClient) { 
        this.prisma = prisma;
    }

    /**
     * Log surgical case status transition for audit trail
     */
    private async logStatusTransition(
        tx: any,
        caseId: string,
        fromStatus: string,
        toStatus: string,
        userId: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        await tx.clinicalAuditEvent.create({
            data: {
                actor_user_id: userId,
                action_type: 'STATUS_TRANSITION',
                entity_type: 'SurgicalCase',
                entity_id: caseId,
                metadata: JSON.stringify({
                    from_status: fromStatus,
                    to_status: toStatus,
                    ...metadata,
                }),
            },
        });
    }

    /**
     * Get surgical cases ready for theater booking
     */
    async getSchedulingQueue(): Promise<TheaterSchedulingQueueItem[]> {
        const cases = await this.prisma.surgicalCase.findMany({
            where: {
                status: SurgicalCaseStatus.READY_FOR_THEATER_BOOKING,
            },
            select: {
                id: true,
                status: true,
                urgency: true,
                procedure_name: true,
                created_at: true,
                patient: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        file_number: true,
                        date_of_birth: true,
                        gender: true,
                    },
                },
                primary_surgeon: {
                    select: {
                        id: true,
                        name: true,
                        specialization: true,
                    },
                },
                case_plan: {
                    select: {
                        id: true,
                        procedure_plan: true,
                        readiness_status: true,
                    },
                },
                theater_booking: {
                    select: {
                        id: true,
                        theater_id: true,
                        start_time: true,
                        end_time: true,
                        status: true,
                    },
                },
                clinical_forms: {
                    where: {
                        template_key: 'nurse_preop_ward_checklist',
                        status: 'FINAL',
                    },
                    select: {
                        id: true,
                        signed_at: true,
                    },
                    take: 1,
                },
            },
            orderBy: [
                { urgency: 'asc' },
                { created_at: 'asc' },
            ],
        });

        return cases.map((c) => {
            const preOpChecklist = c.clinical_forms[0];
            const existingBooking = c.theater_booking && c.theater_booking.status !== 'CANCELLED'
                ? c.theater_booking
                : null;

            return {
                id: c.id,
                caseNumber: c.id.slice(0, 8).toUpperCase(),
                status: c.status,
                urgency: c.urgency || 'ELECTIVE',
                procedure: c.procedure_name || 'Unspecified',
                patient: {
                    id: c.patient.id,
                    name: `${c.patient.first_name} ${c.patient.last_name}`.trim(),
                    fileNumber: c.patient.file_number,
                    dateOfBirth: c.patient.date_of_birth,
                    gender: c.patient.gender,
                },
                surgeon: c.primary_surgeon
                    ? {
                        id: c.primary_surgeon.id,
                        name: c.primary_surgeon.name,
                        specialization: c.primary_surgeon.specialization,
                    }
                    : null,
                preOpChecklistFinalized: !!preOpChecklist,
                preOpChecklistFinalizedAt: preOpChecklist?.signed_at || null,
                existingBooking: existingBooking
                    ? {
                        id: existingBooking.id,
                        theaterId: existingBooking.theater_id,
                        theaterName: '', // Will be populated if needed
                        startTime: existingBooking.start_time,
                        endTime: existingBooking.end_time,
                        status: existingBooking.status,
                    }
                    : null,
                createdAt: c.created_at,
                scheduledAt: existingBooking?.start_time || null,
            };
        });
    }

    /**
     * Get theaters with bookings for a specific date
     */
    async getTheatersForDate(date: Date): Promise<TheaterWithBookings[]> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const theaters = await this.prisma.theater.findMany({
            where: { is_active: true },
            select: {
                id: true,
                name: true,
                type: true,
                is_active: true,
                hourly_rate: true,
            },
        });

        const bookings = await this.prisma.theaterBooking.findMany({
            where: {
                start_time: { gte: startOfDay, lt: endOfDay },
                status: { not: TheaterBookingStatus.CANCELLED },
            },
            select: {
                id: true,
                surgical_case_id: true,
                theater_id: true,
                start_time: true,
                end_time: true,
                status: true,
                locked_by: true,
                locked_at: true,
                lock_expires_at: true,
                surgical_case: {
                    select: {
                        patient: {
                            select: {
                                first_name: true,
                                last_name: true,
                            },
                        },
                        procedure_name: true,
                    },
                },
            },
        });

        return theaters.map((theater) => ({
            id: theater.id,
            name: theater.name,
            type: theater.type,
            isActive: theater.is_active,
            hourlyRate: theater.hourly_rate,
            bookings: bookings
                .filter((b) => b.theater_id === theater.id)
                .map((b) => ({
                    id: b.id,
                    caseId: b.surgical_case_id,
                    caseNumber: b.surgical_case_id.slice(0, 8).toUpperCase(),
                    patientName: b.surgical_case?.patient
                        ? `${b.surgical_case.patient.first_name} ${b.surgical_case.patient.last_name}`.trim()
                        : 'Unknown',
                    procedure: b.surgical_case?.procedure_name || 'Unspecified',
                    startTime: b.start_time,
                    endTime: b.end_time,
                    status: b.status,
                    lockedBy: b.locked_by,
                    lockedAt: b.locked_at,
                    lockExpiresAt: b.lock_expires_at,
                })),
        }));
    }

    /**
     * Lock a theater slot (provisional booking)
     */
    async lockSlot(dto: LockTheaterSlotDto, userId: string): Promise<TheaterSlotLockResult> {
        const { caseId, theaterId, startTime, endTime } = dto;
        const start = new Date(startTime);
        const end = new Date(endTime);
        const now = new Date();

        return this.prisma.$transaction(async (tx) => {
            // 1. Validate surgical case
            const surgicalCase = await tx.surgicalCase.findUnique({
                where: { id: caseId },
                select: {
                    id: true,
                    status: true,
                    patient: { select: { id: true, first_name: true, last_name: true } },
                    primary_surgeon: { select: { id: true, name: true, user_id: true } },
                    procedure_name: true,
                },
            });

            if (!surgicalCase) {
                throw new Error('Surgical case not found');
            }

            if (surgicalCase.status !== SurgicalCaseStatus.READY_FOR_THEATER_BOOKING) {
                throw new Error(`Case must be in READY_FOR_THEATER_BOOKING status (current: ${surgicalCase.status})`);
            }

            // 2. Check for overlapping bookings
            const overlap = await tx.theaterBooking.findFirst({
                where: {
                    theater_id: theaterId,
                    status: { not: TheaterBookingStatus.CANCELLED },
                    start_time: { lt: end },
                    end_time: { gt: start },
                    OR: [
                        { status: TheaterBookingStatus.CONFIRMED },
                        {
                            status: TheaterBookingStatus.PROVISIONAL,
                            lock_expires_at: { gt: now },
                        },
                    ],
                },
            });

            if (overlap) {
                // Idempotency: If same user has existing lock for this case
                const existingForCase = await tx.theaterBooking.findFirst({
                    where: {
                        surgical_case_id: caseId,
                        locked_by: userId,
                        status: TheaterBookingStatus.PROVISIONAL,
                        lock_expires_at: { gt: now },
                    },
                });

                if (existingForCase && existingForCase.theater_id === theaterId) {
                    const theater = await tx.theater.findUnique({ where: { id: theaterId } });
                    return {
                        bookingId: existingForCase.id,
                        status: existingForCase.status,
                        theaterId: existingForCase.theater_id,
                        theaterName: theater?.name || 'Unknown',
                        startTime: existingForCase.start_time,
                        endTime: existingForCase.end_time,
                        lockedAt: existingForCase.locked_at!,
                        lockExpiresAt: existingForCase.lock_expires_at!,
                        caseId: caseId,
                        caseStatus: surgicalCase.status,
                    };
                }

                throw new Error('Theater slot is already booked or locked by another user');
            }

            // 3. Check lock limit per user
            const lockExpiration = new Date(now.getTime() - this.LOCK_TIMEOUT_MS);
            const activeLocks = await tx.theaterBooking.count({
                where: {
                    locked_by: userId,
                    status: TheaterBookingStatus.PROVISIONAL,
                    locked_at: { gt: lockExpiration },
                },
            });

            if (activeLocks >= this.MAX_ACTIVE_LOCKS) {
                throw new Error(`You have reached the maximum number of active locks (${this.MAX_ACTIVE_LOCKS}). Please confirm or release existing locks.`);
            }

            // 4. Clean up any existing booking for this case
            await tx.theaterBooking.deleteMany({
                where: { surgical_case_id: caseId },
            });

            // 5. Create provisional booking
            const lockExpiresAt = new Date(now.getTime() + this.LOCK_TIMEOUT_MS);

            const booking = await tx.theaterBooking.create({
                data: {
                    surgical_case_id: caseId,
                    theater_id: theaterId,
                    start_time: start,
                    end_time: end,
                    status: TheaterBookingStatus.PROVISIONAL,
                    locked_by: userId,
                    locked_at: now,
                    lock_expires_at: lockExpiresAt,
                },
            });

            // 6. Get theater name
            const theater = await tx.theater.findUnique({ where: { id: theaterId } });

            // 7. Create audit log
            await tx.auditLog.create({
                data: {
                    user_id: userId,
                    record_id: caseId,
                    action: 'THEATER_SLOT_LOCKED',
                    model: 'SurgicalCase',
                    details: `Provisional lock created for theater: ${theater?.name}. Slot: ${format(start, 'yyyy-MM-dd HH:mm')} - ${format(end, 'HH:mm')}`,
                },
            });

            return {
                bookingId: booking.id,
                status: booking.status,
                theaterId: booking.theater_id,
                theaterName: theater?.name || 'Unknown',
                startTime: booking.start_time,
                endTime: booking.end_time,
                lockedAt: booking.locked_at!,
                lockExpiresAt: booking.lock_expires_at!,
                caseId: caseId,
                caseStatus: surgicalCase.status,
            };
        });
    }

    /**
     * Confirm a provisional booking with full billing integration
     */
    async confirmBooking(dto: ConfirmTheaterBookingDto, userId: string): Promise<TheaterBookingConfirmedResult> {
        const { bookingId } = dto;
        const now = new Date();

        return this.prisma.$transaction(async (tx) => {
            // 1. Load booking with all related data
            const booking = await tx.theaterBooking.findUnique({
                where: { id: bookingId },
                include: {
                    theater: true,
                    surgical_case: {
                        include: {
                            patient: { select: { id: true, first_name: true, last_name: true, file_number: true } },
                            primary_surgeon: { select: { id: true, name: true, user_id: true } },
                            case_plan: { select: { procedure_plan: true } },
                        },
                    },
                },
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

            // Check lock expiration
            if (booking.lock_expires_at && booking.lock_expires_at < now) {
                throw new Error('Booking lock has expired. Please select the slot again.');
            }

            // Verify ownership (Admin can override)
            const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
            if (booking.locked_by !== userId && user?.role !== Role.ADMIN) {
                throw new Error('Booking is locked by another user');
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

            // 3. Transition surgical case to SCHEDULED with audit logging
            const previousCaseStatus = booking.surgical_case.status;
            const updatedCase = await tx.surgicalCase.update({
                where: { id: booking.surgical_case_id },
                data: { status: SurgicalCaseStatus.SCHEDULED },
            });

            // Log status transition
            await this.logStatusTransition(
                tx,
                booking.surgical_case_id,
                previousCaseStatus,
                SurgicalCaseStatus.SCHEDULED,
                userId,
                {
                    theater_id: booking.theater_id,
                    theater_name: booking.theater.name,
                    booking_id: bookingId,
                    scheduled_time: booking.start_time.toISOString(),
                }
            );

            // 4. Calculate and create billing
            const durationMs = booking.end_time.getTime() - booking.start_time.getTime();
            const durationHours = durationMs / (1000 * 60 * 60);
            const feeAmount = Math.round((booking.theater.hourly_rate || 0) * durationHours);

            let billingCreated = false;
            let theaterFeeService: { id: number } | null = null;

            // Find or create theater fee service
            theaterFeeService = await tx.service.findFirst({
                where: { service_name: 'Theater Usage Fee', category: 'THEATER' },
            });

            if (!theaterFeeService) {
                theaterFeeService = await tx.service.create({
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

            // Create or update payment
            const payment = await tx.payment.upsert({
                where: { surgical_case_id: booking.surgical_case_id },
                create: {
                    patient_id: booking.surgical_case.patient.id,
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

            // Remove existing theater fee line items (idempotent)
            await tx.patientBill.deleteMany({
                where: {
                    payment_id: payment.id,
                    service_id: theaterFeeService.id,
                },
            });

            // Create theater fee line item
            if (feeAmount > 0) {
                await tx.patientBill.create({
                    data: {
                        payment_id: payment.id,
                        service_id: theaterFeeService.id,
                        service_date: booking.start_time,
                        quantity: 1,
                        unit_cost: feeAmount,
                        total_cost: feeAmount,
                    },
                });
                billingCreated = true;
            }

            // 5. Create audit log
            await tx.auditLog.create({
                data: {
                    user_id: userId,
                    record_id: booking.surgical_case_id,
                    action: 'THEATER_BOOKING_CONFIRMED',
                    model: 'SurgicalCase',
                    details: `Theater booking confirmed. Theater: ${booking.theater.name}. Fee: KES ${feeAmount} for ${durationHours.toFixed(2)}h. Case status: ${updatedCase.status}`,
                },
            });

            // 6. Send notifications
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
                        bookingId: bookingId,
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
                    bookingId: bookingId,
                    event: 'THEATER_BOOKED',
                },
                senderId: userId,
            });

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
                billing: {
                    created: billingCreated,
                    theaterFee: billingCreated
                        ? {
                            amount: feeAmount,
                            serviceName: 'Theater Usage Fee',
                            hours: parseFloat(durationHours.toFixed(2)),
                        }
                        : null,
                },
            };
        });
    }

    /**
     * Cancel a theater booking with billing reversal
     */
    async cancelBooking(dto: CancelTheaterBookingDto, userId: string): Promise<TheaterBookingCancelledResult> {
        const { bookingId, reason } = dto;
        const now = new Date();

        return this.prisma.$transaction(async (tx) => {
            // 1. Load booking
            const booking = await tx.theaterBooking.findUnique({
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

            // 2. Cancel the booking
            await tx.theaterBooking.update({
                where: { id: bookingId },
                data: {
                    status: TheaterBookingStatus.CANCELLED,
                    version: { increment: 1 },
                },
            });

            let billingReversed = false;
            let reversedAmount = 0;

            // 3. If confirmed, revert case status and reverse billing
            if (booking.status === TheaterBookingStatus.CONFIRMED) {
                const previousStatus = booking.surgical_case.status;
                
                // Revert surgical case
                await tx.surgicalCase.update({
                    where: { id: booking.surgical_case_id },
                    data: { status: SurgicalCaseStatus.READY_FOR_THEATER_BOOKING },
                });

                // Log status transition (reverting)
                await this.logStatusTransition(
                    tx,
                    booking.surgical_case_id,
                    previousStatus,
                    SurgicalCaseStatus.READY_FOR_THEATER_BOOKING,
                    userId,
                    {
                        action: 'booking_cancelled',
                        reason: reason || 'Not provided',
                        billing_reversed: true,
                    }
                );

                // Reverse billing
                const theaterService = await tx.service.findFirst({
                    where: { service_name: 'Theater Usage Fee', category: 'THEATER' },
                });

                if (theaterService) {
                    const payment = await tx.payment.findUnique({
                        where: { surgical_case_id: booking.surgical_case_id },
                    });

                    if (payment) {
                        const feeLineItems = await tx.patientBill.findMany({
                            where: { payment_id: payment.id, service_id: theaterService.id },
                        });

                        reversedAmount = feeLineItems.reduce((sum, item) => sum + item.total_cost, 0);

                        if (reversedAmount > 0) {
                            await tx.payment.update({
                                where: { id: payment.id },
                                data: { total_amount: { decrement: reversedAmount } },
                            });

                            await tx.patientBill.deleteMany({
                                where: { payment_id: payment.id, service_id: theaterService.id },
                            });

                            billingReversed = true;
                        }
                    }
                }
            }

            // 4. Create audit log
            await tx.auditLog.create({
                data: {
                    user_id: userId,
                    record_id: booking.surgical_case_id,
                    action: 'THEATER_BOOKING_CANCELLED',
                    model: 'SurgicalCase',
                    details: `Theater booking cancelled. Reason: ${reason || 'Not provided'}. Billing reversed: KES ${reversedAmount}`,
                },
            });

            // 5. Send notification
            const patientName = booking.surgical_case?.patient
                ? `${booking.surgical_case.patient.first_name} ${booking.surgical_case.patient.last_name}`.trim()
                : 'Patient';

            await createNotificationForRole(Role.NURSE, {
                type: 'IN_APP',
                subject: 'Theater Booking Cancelled',
                message: `${patientName} - Theater booking in ${booking.theater.name} has been cancelled.`,
                metadata: {
                    surgicalCaseId: booking.surgical_case_id,
                    bookingId: bookingId,
                    event: 'THEATER_CANCELLED',
                },
                senderId: userId,
            });

            return {
                bookingId,
                status: TheaterBookingStatus.CANCELLED,
                caseId: booking.surgical_case_id,
                caseStatus: billingReversed ? SurgicalCaseStatus.READY_FOR_THEATER_BOOKING : booking.surgical_case?.status || 'UNKNOWN',
                billingReversed,
                reversedAmount,
            };
        });
    }
}

export const theaterSchedulingService = new TheaterSchedulingService(db);
