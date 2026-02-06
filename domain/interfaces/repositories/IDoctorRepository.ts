import { Doctor } from '@prisma/client';

/**
 * Interface for Doctor Repository
 * 
 * Defines the contract for accessing and managing Doctor entity data.
 * Abstracts the underlying data source (Prisma) from the domain/application logic.
 */
export interface IDoctorRepository {
    /**
     * Find a doctor by their unique ID
     * @param id - The doctor's ID
     * @returns The doctor entity or null if not found
     */
    findById(id: string): Promise<Doctor | null>;

    /**
     * Find a doctor by their associated User ID
     * @param userId - The user's ID
     * @returns The doctor entity or null if not found
     */
    findByUserId(userId: string): Promise<Doctor | null>;

    /**
     * Find a doctor by their URL slug
     * @param slug - The doctor's URL slug
     * @returns The doctor entity or null if not found
     */
    findBySlug(slug: string): Promise<Doctor | null>;

    /**
     * Update a doctor's profile
     * @param id - The doctor's ID
     * @param data - Partial doctor data to update
     * @returns The updated doctor entity
     */
    update(id: string, data: Partial<Doctor>): Promise<Doctor>;

    /**
     * Check if a license number is already in use
     * @param licenseNumber - The license number to check
     * @param excludeDoctorId - Optional doctor ID to exclude (for updates)
     * @returns True if the license is unique (not taken), false otherwise
     */
    isLicenseUnique(licenseNumber: string, excludeDoctorId?: string): Promise<boolean>;
}
