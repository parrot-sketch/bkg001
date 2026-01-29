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
  constructor(private readonly db: PrismaClient) { }

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
}

/**
 * Interface: IPatientRepository
 * 
 * This is re-exported here for convenience when importing from infrastructure layer
 */
export type { IPatientRepository } from '@/domain/interfaces/repositories/IPatientRepository';
