import { PrismaClient } from '@prisma/client';
import { Patient } from '@/domain/entities/Patient';
import { IPatientRepository } from '@/domain/interfaces/repositories/IPatientRepository';
import { Email } from '@/domain/value-objects/Email';
import { PatientMapper } from '@/infrastructure/mappers/PatientMapper';

/**
 * Repository: PatientRepository
 *
 * Implements IPatientRepository interface using Prisma ORM.
 *
 * Responsibilities:
 * - Map between domain entities and persistence layer
 * - Handle all CRUD operations for Patient
 * - Provide query methods for finding patients
 *
 * Dependency: PatientMapper (converts between domain and persistence)
 */
export class PrismaPatientRepository implements IPatientRepository {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Find a patient by ID
   */
  async findById(id: string): Promise<Patient | null> {
    const raw = await this.db.patient.findUnique({
      where: { id },
    });

    if (!raw) {
      return null;
    }

    return PatientMapper.fromPrisma(raw);
  }

  /**
   * Find a patient by email
   */
  async findByEmail(email: Email): Promise<Patient | null> {
    const raw = await this.db.patient.findUnique({
      where: { email: email.getValue() },
    });

    if (!raw) {
      return null;
    }

    return PatientMapper.fromPrisma(raw);
  }

  /**
   * Save a new patient
   */
  async save(patient: Patient): Promise<void> {
    await this.db.patient.create({
      data: PatientMapper.toPrismaCreateInput(patient),
    });
  }

  /**
   * Update an existing patient
   */
  async update(patient: Patient): Promise<void> {
    await this.db.patient.update({
      where: { id: patient.getId() },
      data: PatientMapper.toPrismaUpdateInput(patient),
    });
  }

  /**
   * Find a patient by file number
   */
  async findByFileNumber(fileNumber: string): Promise<Patient | null> {
    const raw = await this.db.patient.findUnique({
      where: { file_number: fileNumber },
    });

    if (!raw) {
      return null;
    }

    return PatientMapper.fromPrisma(raw);
  }

  /**
   * Delete a patient
   */
  async delete(id: string): Promise<void> {
    await this.db.patient.delete({
      where: { id },
    });
  }

  /**
   * Check if patient exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.db.patient.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Generates the next sequential file number for a new patient.
   * Scans existing file numbers to continue the sequence `NS{000}`.
   */
  async generateNextFileNumber(): Promise<string> {
    // Strategy: Fetch all valid NSxxx file numbers and find the highest integer
    // This avoids issues where NS9 is sorted after NS10 in plain alphabetical sorting,
    // and ignores the timestamp-corrupted numbers (NS188641413).
    const patients = await this.db.patient.findMany({
      select: { file_number: true },
      where: {
        file_number: { startsWith: 'NS' }
      }
    });

    let maxNumber = 0;

    for (const p of patients) {
      if (!p.file_number) continue;
      
      const numStr = p.file_number.substring(2);
      // Only consider it a pure sequence if it's a reasonably sized number
      // Timestamp corrupted ones are >= 10 digits. We'll set a safe cap of 6 digits (up to 999,999 patients)
      if (/^\d{1,6}$/.test(numStr)) {
        const num = parseInt(numStr, 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    const nextNumber = maxNumber + 1;
    return `NS${String(nextNumber).padStart(3, '0')}`;
  }
}

/**
 * Interface: IPatientRepository
 * 
 * This is re-exported here for convenience when importing from infrastructure layer
 */
export type { IPatientRepository } from '@/domain/interfaces/repositories/IPatientRepository';
