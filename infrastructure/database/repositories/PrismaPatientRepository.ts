import { IPatientRepository } from '../../../domain/interfaces/repositories/IPatientRepository';
import { Patient } from '../../../domain/entities/Patient';
import { Email } from '../../../domain/value-objects/Email';
import { PatientMapper } from '../../mappers/PatientMapper';
import { PrismaClient, Prisma } from '@prisma/client';
import { IPatientFileNumberRepository } from '../../../domain/services/PatientFileNumberGenerator';

/**
 * Repository: PrismaPatientRepository
 * 
 * Prisma-based implementation of IPatientRepository.
 * This repository handles data persistence for Patient entities using Prisma ORM.
 * 
 * Responsibilities:
 * - Translate domain operations to Prisma operations
 * - Map between Prisma models and domain entities
 * - Handle database-specific concerns (transactions, errors)
 * - NO business logic - only data access
 * 
 * Clean Architecture Rule: This class depends on domain interfaces and entities,
 * not the other way around. Domain knows nothing about Prisma.
 */
export class PrismaPatientRepository implements IPatientRepository, IPatientFileNumberRepository {
  constructor(private readonly prisma: PrismaClient) {
    if (!prisma) {
      throw new Error('PrismaClient is required');
    }
  }

  /**
   * Finds the highest existing file number
   * Implements IPatientFileNumberRepository for file number generation
   */
  async findHighestFileNumber(): Promise<string | null> {
    try {
      // Get all patients with file numbers
      // Note: file_number is non-nullable in schema, so no need to filter for null
      const patients = await this.prisma.patient.findMany({
        select: {
          file_number: true,
        },
      });

      if (patients.length === 0) {
        return null;
      }

      // Extract numeric parts and find maximum
      let highestNumber = 0;
      let highestFileNumber: string | null = null;

      for (const patient of patients) {
        if (!patient.file_number) continue;

        // Extract number from file number (e.g., "NS001" -> 1)
        const match = patient.file_number.match(/^NS(\d+)$/);
        if (match) {
          const number = parseInt(match[1], 10);
          if (!isNaN(number) && number > highestNumber) {
            highestNumber = number;
            highestFileNumber = patient.file_number;
          }
        }
      }

      return highestFileNumber;
    } catch (error) {
      console.error('[PrismaPatientRepository] Error finding highest file number:', error);
      // Re-throw as Error so it gets caught by the generator
      throw new Error(
        `Failed to find highest file number: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error }
      );
    }
  }

  /**
   * Finds a patient by their unique identifier
   * 
   * @param id - The patient's unique identifier
   * @returns Promise resolving to the Patient entity if found, null otherwise
   */
  async findById(id: string): Promise<Patient | null> {
    try {
      const prismaPatient = await this.prisma.patient.findUnique({
        where: { id },
      });

      if (!prismaPatient) {
        return null;
      }

      return PatientMapper.fromPrisma(prismaPatient);
    } catch (error) {
      // Wrap Prisma errors in a more generic error
      throw new Error(`Failed to find patient by ID: ${id}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Finds a patient by their email address
   * 
   * @param email - The patient's email address (as Email value object)
   * @returns Promise resolving to the Patient entity if found, null otherwise
   */
  async findByEmail(email: Email): Promise<Patient | null> {
    try {
      const prismaPatient = await this.prisma.patient.findUnique({
        where: { email: email.getValue() },
      });

      if (!prismaPatient) {
        return null;
      }

      return PatientMapper.fromPrisma(prismaPatient);
    } catch (error) {
      // Wrap Prisma errors in a more generic error
      throw new Error(`Failed to find patient by email: ${email.getValue()}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Saves a new patient to the data store
   * 
   * This method handles creation of new patients.
   * If a patient with the same ID already exists, it will throw an error.
   * 
   * @param patient - The Patient entity to save
   * @returns Promise that resolves when the save operation completes
   * @throws Error if the save operation fails
   */
  async save(patient: Patient): Promise<void> {
    try {
      const createInput = PatientMapper.toPrismaCreateInput(patient);

      await this.prisma.patient.create({
        data: createInput,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Unique constraint violation
          throw new Error(`Patient with ID ${patient.getId()} or email ${patient.getEmail().getValue()} already exists`);
        }
      }
      // Wrap Prisma errors in a more generic error
      throw new Error(`Failed to save patient: ${patient.getId()}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates an existing patient in the data store
   * 
   * The patient must already exist in the data store.
   * 
   * @param patient - The Patient entity with updated information
   * @returns Promise that resolves when the update operation completes
   * @throws Error if the patient does not exist or the update fails
   */
  async update(patient: Patient): Promise<void> {
    try {
      const updateInput = PatientMapper.toPrismaUpdateInput(patient);

      await this.prisma.patient.update({
        where: { id: patient.getId() },
        data: updateInput,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          // Record not found
          throw new Error(`Patient with ID ${patient.getId()} not found`);
        }
        if (error.code === 'P2002') {
          // Unique constraint violation (e.g., email already taken)
          throw new Error(`Patient with email ${patient.getEmail().getValue()} already exists`);
        }
      }
      // Wrap Prisma errors in a more generic error
      throw new Error(`Failed to update patient: ${patient.getId()}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
