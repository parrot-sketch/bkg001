'use server';

import { db } from '@/lib/db';
import { GetDoctorProfileUseCase } from '@/application/use-cases/GetDoctorProfileUseCase';
import { GetDoctorAppointmentsUseCase } from '@/application/use-cases/GetDoctorAppointmentsUseCase';
import { GetMyAvailabilityUseCase } from '@/application/use-cases/GetMyAvailabilityUseCase';
import { PrismaDoctorRepository } from '@/infrastructure/database/repositories/PrismaDoctorRepository';
import { PrismaAvailabilityRepository } from '@/infrastructure/database/repositories/PrismaAvailabilityRepository';

// Initialize Repositories
const doctorRepository = new PrismaDoctorRepository(db);
const availabilityRepository = new PrismaAvailabilityRepository(db);

// Initialize Use Cases
// Note: We instantiate these inside headers/requests if they held state, but they are stateless services.
const getDoctorProfileUseCase = new GetDoctorProfileUseCase(doctorRepository);
const getDoctorAppointmentsUseCase = new GetDoctorAppointmentsUseCase(db);
const getMyAvailabilityUseCase = new GetMyAvailabilityUseCase(availabilityRepository, db);

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
 */
export async function getDoctorAvailability(userId: string) {
    try {
        const doctor = await db.doctor.findUnique({ where: { user_id: userId } });
        if (!doctor) throw new Error('Doctor not found');

        const availability = await getMyAvailabilityUseCase.execute(doctor.id);
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
