'use server';

import { db } from '@/lib/db';
import { GetDoctorProfileUseCase } from '@/application/use-cases/GetDoctorProfileUseCase';
import { GetDoctorAppointmentsUseCase } from '@/application/use-cases/GetDoctorAppointmentsUseCase';
import { GetMyAvailabilityUseCase } from '@/application/use-cases/GetMyAvailabilityUseCase';
import { StartConsultationUseCase } from '@/application/use-cases/StartConsultationUseCase';
import { PrismaDoctorRepository } from '@/infrastructure/database/repositories/PrismaDoctorRepository';
import { PrismaAvailabilityRepository } from '@/infrastructure/database/repositories/PrismaAvailabilityRepository';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { PrismaConsultationRepository } from '@/infrastructure/database/repositories/PrismaConsultationRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { revalidateDoctorDashboard } from '@/actions/doctor/get-dashboard-data';
import { revalidateFrontdeskDashboard } from '@/actions/frontdesk/get-dashboard-data';
import { revalidatePath } from 'next/cache';
import { AppointmentStatus } from '@prisma/client';
import { StartConsultationDto } from '@/application/dtos/StartConsultationDto';
import { DomainException } from '@/domain/exceptions/DomainException';

// Initialize Repositories
const doctorRepository = new PrismaDoctorRepository(db);
const availabilityRepository = new PrismaAvailabilityRepository(db);
const appointmentRepository = new PrismaAppointmentRepository(db);
const consultationRepository = new PrismaConsultationRepository(db);
const auditService = new ConsoleAuditService();

// Initialize Use Cases
const getDoctorProfileUseCase = new GetDoctorProfileUseCase(doctorRepository);
const getDoctorAppointmentsUseCase = new GetDoctorAppointmentsUseCase(db);
const getMyAvailabilityUseCase = new GetMyAvailabilityUseCase(availabilityRepository, db);
const startConsultationUseCase = new StartConsultationUseCase(
  appointmentRepository,
  consultationRepository,
  auditService,
);

/**
 * Get Doctor Profile by User ID
 */
export async function getDoctorProfile(userId: string) {
    try {
        const profile = await getDoctorProfileUseCase.executeByUserId(userId);
        return { success: true, data: profile };
    } catch (error: any) {
        console.error('Error fetching doctor profile:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get Doctor Appointments (General)
 */
export async function getDoctorAppointments(doctorId: string, options: any = {}) {
    try {
        const appointments = await getDoctorAppointmentsUseCase.execute({
            doctorId,
            ...options
        });
        return { success: true, data: appointments };
    } catch (error: any) {
        console.error('Error fetching doctor appointments:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get Doctor Availability
 * 
 * @param doctorOrUserId - Can be a Doctor ID or User ID.
 *   If `isDoctorId` is true, the lookup-by-user_id query is skipped
 *   (saves one DB round-trip when the caller already has the doctor ID).
 */
export async function getDoctorAvailability(
    doctorOrUserId: string,
    { isDoctorId = false }: { isDoctorId?: boolean } = {}
) {
    try {
        let doctorId: string;

        if (isDoctorId) {
            // Caller already resolved the doctor ID — skip the lookup
            doctorId = doctorOrUserId;
        } else {
            // Legacy path: resolve doctor by user_id
            const doctor = await db.doctor.findUnique({ where: { user_id: doctorOrUserId } });
            if (!doctor) throw new Error('Doctor not found');
            doctorId = doctor.id;
        }

        // When isDoctorId is true, the caller already resolved the doctor —
        // tell the use case to skip its redundant doctor-exists query too.
        const availability = await getMyAvailabilityUseCase.execute(
            doctorId,
            { skipValidation: isDoctorId }
        );
        return { success: true, data: availability };
    } catch (error: any) {
        console.error('Error fetching doctor availability:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get Today's Appointments
 */
export async function getTodayAppointments(doctorId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return getDoctorAppointments(doctorId, {
        startDate: today,
        endDate: tomorrow,
        status: 'SCHEDULED,CONFIRMED', // Default active
        limit: 50
    });
}

/**
 * Get Upcoming Appointments
 */
export async function getUpcomingAppointments(doctorId: string) {
    const today = new Date();
    return getDoctorAppointments(doctorId, {
        startDate: today,
        status: 'SCHEDULED,CONFIRMED',
        limit: 50
    });
}

/**
 * Start a direct consultation from patient profile (doctor-initiated walk-in)
 * 
 * Creates a walk-in appointment with CHECKED_IN status and immediately
 * starts the consultation, redirecting the doctor to the consultation room.
 */
export async function startDirectConsultation(patientId: string, notes?: string) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        // Resolve doctor record
        const doctor = await db.doctor.findUnique({
            where: { user_id: user.userId },
            select: { id: true, user_id: true, name: true },
        });

        if (!doctor) {
            return { success: false, error: 'Doctor profile not found' };
        }

        const doctorId = doctor.id;
        const now = new Date();

        // 1. Create walk-in appointment with CHECKED_IN status
        const appointment = await db.appointment.create({
            data: {
                patient_id: patientId,
                doctor_id: doctorId,
                appointment_date: now,
                time: now.toTimeString().slice(0, 5),
                type: 'Consultation',
                status: AppointmentStatus.CHECKED_IN,
                source: 'DOCTOR_FOLLOW_UP',
                checked_in_at: now,
                checked_in_by: user.userId,
                status_changed_at: now,
                status_changed_by: user.userId,
                created_at: now,
                updated_at: now,
            },
        });

        // 2. Create patient queue entry
        await db.patientQueue.create({
            data: {
                patient_id: patientId,
                doctor_id: doctorId,
                appointment_id: appointment.id,
                status: 'WAITING',
                added_by: user.userId,
                notes: notes || 'Doctor-initiated consultation',
            },
        });

        // 3. Start the consultation
        const dto: StartConsultationDto = {
            appointmentId: appointment.id,
            doctorId: doctorId,
            userId: doctor.user_id,
            doctorNotes: notes || undefined,
        };

        const result = await startConsultationUseCase.execute(dto);

        // 4. Invalidate caches
        try {
            await revalidateDoctorDashboard(doctorId);
            await revalidateFrontdeskDashboard();
            revalidatePath('/doctor/consultations', 'page');
        } catch {
            // Non-critical
        }

        return {
            success: true,
            appointmentId: appointment.id,
            data: result,
        };
    } catch (error: any) {
        console.error('[startDirectConsultation]', error);
        if (error instanceof DomainException) {
            return { success: false, error: error.message };
        }
        return { success: false, error: error.message || 'Failed to start consultation' };
    }
}
