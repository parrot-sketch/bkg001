import { PrismaClient, Doctor } from '@prisma/client';
import { IDoctorRepository } from '../../../domain/interfaces/repositories/IDoctorRepository';

/**
 * Prisma Implementation of Doctor Repository
 * 
 * Handles strict typing and direct database access using Prisma Client.
 */
export class PrismaDoctorRepository implements IDoctorRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Find a doctor by their unique ID
     */
    async findById(id: string): Promise<Doctor | null> {
        return this.prisma.doctor.findUnique({
            where: { id },
        });
    }

    /**
     * Find a doctor by their associated User ID
     */
    async findByUserId(userId: string): Promise<Doctor | null> {
        return this.prisma.doctor.findUnique({
            where: { user_id: userId },
        });
    }

    /**
     * Update a doctor's profile
     */
    async update(id: string, data: Partial<Doctor>): Promise<Doctor> {
        return this.prisma.doctor.update({
            where: { id },
            data,
        });
    }

    /**
     * Check if a license number is already in use
     */
    async isLicenseUnique(licenseNumber: string, excludeDoctorId?: string): Promise<boolean> {
        const existingDoctor = await this.prisma.doctor.findFirst({
            where: {
                license_number: licenseNumber,
                ...(excludeDoctorId ? { id: { not: excludeDoctorId } } : {}),
            },
            select: { id: true },
        });

        return existingDoctor === null; // Returns true if no doctor found (unique)
    }
}
