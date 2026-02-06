import { PrismaClient } from '@prisma/client';
import { AppointmentResponseDto } from '../dtos/AppointmentResponseDto';
import { UserMapper } from '../../infrastructure/auth/mappers/UserMapper';
import { extractConsultationRequestFields } from '../../infrastructure/mappers/ConsultationRequestMapper';
import { UseCaseFactory } from '@/lib/use-case-factory';

interface GetDoctorAppointmentsDto {
    doctorId: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    includeAll?: boolean;
}

/**
 * Use Case: GetDoctorAppointmentsUseCase
 * 
 * Query Service that retrieves doctor appointments with full details including:
 * - Patient and Doctor info
 * - Consultation Request status
 * - "Booked By" user context
 * 
 * Implementation Note:
 * This use case acts as a CQRS Query Handler. It bypasses the Domain Repository/Entity 
 * pattern slightly to perform efficient "Read Model" queries with specific joins (User tables)
 * that might not strictly belong in the core Appointment Domain Entity.
 */
export class GetDoctorAppointmentsUseCase {
    constructor(
        private readonly prisma: PrismaClient,
    ) {
        if (!prisma) throw new Error('PrismaClient is required');
        UseCaseFactory.validatePrismaClient(prisma);
    }

    async execute(dto: GetDoctorAppointmentsDto): Promise<AppointmentResponseDto[]> {
        const { doctorId, status, startDate, endDate, limit = 100, includeAll } = dto;

        // 1. Build Query Filters
        const where: any = {
            doctor_id: doctorId
        };

        if (status) {
            if (status.includes(',')) {
                where.status = { in: status.split(',').map(s => s.trim()) as any };
            } else {
                where.status = status as any;
            }
        }

        if (startDate || endDate) {
            where.appointment_date = {};
            if (startDate) where.appointment_date.gte = startDate;
            if (endDate) where.appointment_date.lte = endDate;
        }

        // 2. Fetch Appointments via Prisma
        const appointments = await this.prisma.appointment.findMany({
            where,
            select: {
                id: true,
                patient_id: true,
                doctor_id: true,
                status_changed_by: true, // Needed for Booked By
                appointment_date: true,
                time: true,
                status: true,
                type: true,
                note: true,
                reason: true,
                consultation_request_status: true,
                reviewed_by: true,
                reviewed_at: true,
                review_notes: true,
                created_at: true,
                updated_at: true,
                patient: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone: true,
                        img: true,
                    },
                },
                doctor: {
                    select: {
                        id: true,
                        name: true,
                        specialization: true,
                    },
                },
            },
            orderBy: {
                appointment_date: 'desc',
            },
            take: limit,
        });

        // 3. Batched User Fetch: Resolve "Booked By" Users
        const bookerUserIds = Array.from(new Set(
            appointments
                .map(a => a.status_changed_by)
                .filter((id): id is string => !!id)
        ));

        const bookers = await this.prisma.user.findMany({
            where: { id: { in: bookerUserIds } },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                role: true,
            }
        });

        const bookerMap = new Map(bookers.map(u => [u.id, u]));

        // 4. Map to DTO
        return appointments.map((appointment) => {
            const consultationFields = extractConsultationRequestFields(appointment);

            // Resolve booker
            const booker = appointment.status_changed_by ? bookerMap.get(appointment.status_changed_by) : undefined;
            const bookedBy = booker ? {
                id: booker.id,
                name: `${booker.first_name || ''} ${booker.last_name || ''}`.trim() || 'Unknown User',
                role: booker.role,
            } : undefined;

            return {
                id: appointment.id,
                patientId: appointment.patient_id,
                doctorId: appointment.doctor_id,
                appointmentDate: appointment.appointment_date,
                time: appointment.time,
                status: appointment.status,
                type: appointment.type,
                note: appointment.note ?? undefined,
                reason: appointment.reason ?? undefined,
                consultationRequestStatus: consultationFields.consultationRequestStatus ?? undefined,
                reviewedBy: consultationFields.reviewedBy ?? undefined,
                reviewedAt: consultationFields.reviewedAt ?? undefined,
                reviewNotes: consultationFields.reviewNotes ?? undefined,
                bookedBy: bookedBy, // The new field
                createdAt: appointment.created_at,
                updatedAt: appointment.updated_at,
                patient: appointment.patient ? {
                    id: appointment.patient.id,
                    firstName: appointment.patient.first_name,
                    lastName: appointment.patient.last_name,
                    email: appointment.patient.email,
                    phone: appointment.patient.phone,
                    img: appointment.patient.img,
                } : undefined,
                doctor: appointment.doctor ? {
                    id: appointment.doctor.id,
                    name: appointment.doctor.name,
                    specialization: appointment.doctor.specialization,
                } : undefined,
            };
        });
    }
}
