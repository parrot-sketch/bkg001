import { PrismaClient, SurgicalCaseStatus, TheaterBookingStatus } from '@prisma/client';
import { TheaterSchedulingQueueItem, TheaterWithBookings, TheaterBookingSlot } from '../dtos/TheaterSchedulingDtos';

export class TheaterRepository {
    constructor(private prisma: PrismaClient) {}

    /**
     * Get surgical cases ready for theater booking with pagination
     */
    async findCasesForScheduling(options?: { page?: number; limit?: number }): Promise<{ cases: TheaterSchedulingQueueItem[]; total: number }> {
        const page = options?.page ?? 1;
        const limit = options?.limit ?? 20;
        const skip = (page - 1) * limit;

        const [cases, total] = await Promise.all([
            this.prisma.surgicalCase.findMany({
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
                skip,
                take: limit,
            }),
            this.prisma.surgicalCase.count({
                where: { status: SurgicalCaseStatus.READY_FOR_THEATER_BOOKING },
            }),
        ]);

        const items = cases.map((c) => {
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
                        theaterName: '',
                        startTime: existingBooking.start_time,
                        endTime: existingBooking.end_time,
                        status: existingBooking.status,
                    }
                    : null,
                createdAt: c.created_at,
                scheduledAt: existingBooking?.start_time || null,
            };
        });

        return { cases: items, total };
    }

    /**
     * Get theaters with bookings for a specific date
     */
    async findTheatersWithBookings(date: Date): Promise<TheaterWithBookings[]> {
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
                .map((b): TheaterBookingSlot => ({
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
     * Find a surgical case by ID
     */
    async findCaseById(caseId: string) {
        return this.prisma.surgicalCase.findUnique({
            where: { id: caseId },
            include: {
                patient: { select: { id: true, first_name: true, last_name: true } },
                primary_surgeon: { select: { id: true, name: true, user_id: true } },
            },
        });
    }

    /**
     * Find a theater by ID
     */
    async findTheaterById(theaterId: string) {
        return this.prisma.theater.findUnique({
            where: { id: theaterId },
        });
    }

    /**
     * Find overlapping bookings for a theater
     */
    async findOverlappingBookings(theaterId: string, start: Date, end: Date) {
        const now = new Date();
        return this.prisma.theaterBooking.findFirst({
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
    }

    /**
     * Count active locks for a user
     */
    async countActiveLocks(userId: string, lockExpiration: Date) {
        return this.prisma.theaterBooking.count({
            where: {
                locked_by: userId,
                status: TheaterBookingStatus.PROVISIONAL,
                locked_at: { gt: lockExpiration },
            },
        });
    }

    /**
     * Find existing lock for a case
     */
    async findExistingLockForCase(caseId: string, userId: string) {
        const now = new Date();
        return this.prisma.theaterBooking.findFirst({
            where: {
                surgical_case_id: caseId,
                locked_by: userId,
                status: TheaterBookingStatus.PROVISIONAL,
                lock_expires_at: { gt: now },
            },
        });
    }

    /**
     * Find a booking by ID
     */
    async findBookingById(bookingId: string) {
        return this.prisma.theaterBooking.findUnique({
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
    }

    /**
     * Update surgical case status
     */
    async updateCaseStatus(caseId: string, status: SurgicalCaseStatus) {
        return this.prisma.surgicalCase.update({
            where: { id: caseId },
            data: { status },
        });
    }

    /**
     * Find or create theater fee service
     */
    async findOrCreateTheaterFeeService() {
        let service = await this.prisma.service.findFirst({
            where: { service_name: 'Theater Usage Fee', category: 'THEATER' },
        });

        if (!service) {
            service = await this.prisma.service.create({
                data: {
                    service_name: 'Theater Usage Fee',
                    description: 'Calculated hourly theater room usage fee',
                    price: 0,
                    category: 'THEATER',
                    price_type: 'VARIABLE',
                    is_active: true,
                },
            });
        }

        return service;
    }
}
