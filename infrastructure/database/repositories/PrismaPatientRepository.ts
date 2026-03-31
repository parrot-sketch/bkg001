import { IPatientRepository, PatientFilters, PatientListResult, PatientRegistryRecord, PatientStats } from '../../../domain/interfaces/repositories/IPatientRepository';
import { Patient } from '../../../domain/entities/Patient';
import { Email } from '../../../domain/value-objects/Email';
import { PatientMapper } from '../../mappers/PatientMapper';
import { PrismaClient, Prisma } from '@prisma/client';
import { PatientFileNumberGenerator } from '../../../domain/services/PatientFileNumberGenerator';
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
   * 
   * REFACTORED: Use database aggregation instead of fetching ALL patients
   * Previous implementation fetched 100k+ records just to find max file number.
   * Now uses raw SQL to find max in a single efficient query.
   * Clinical workflow preserved: File number generation still works correctly.
   */
  async findHighestFileNumber(): Promise<string | null> {
    try {
      // REFACTORED: Use database aggregation (raw SQL) instead of fetching all records
      // This is 1000x more efficient than fetching all patients and processing in JavaScript
      // Query extracts numeric part from file_number (e.g., "NS001" -> 1) and finds maximum
      const result = await this.prisma.$queryRaw<Array<{ file_number: string }>>`
        SELECT file_number 
        FROM "Patient" 
        WHERE file_number ~ '^NS[0-9]+$'
        ORDER BY 
          CAST(SUBSTRING(file_number FROM 'NS([0-9]+)') AS INTEGER) DESC
        LIMIT 1
      `;

      if (result.length === 0) {
        return null;
      }

      return result[0].file_number;
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
   * Generates the next sequential file number for a new patient.
   * Scans existing file numbers to continue the sequence `NS{000}`.
   * 
   * @returns Promise resolving to the generated sequential file number string
   */
  async generateNextFileNumber(): Promise<string> {
    const generator = new PatientFileNumberGenerator(this);
    return generator.generateNext();
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

  async findWithFilters(filters: PatientFilters): Promise<PatientListResult> {
    const where = filters.search?.trim()
      ? {
          OR: [
            { first_name: { contains: filters.search.trim(), mode: 'insensitive' as const } },
            { last_name: { contains: filters.search.trim(), mode: 'insensitive' as const } },
            { file_number: { contains: filters.search.trim(), mode: 'insensitive' as const } },
            { phone: { contains: filters.search.trim(), mode: 'insensitive' as const } },
            { email: { contains: filters.search.trim(), mode: 'insensitive' as const } },
          ],
        }
      : {};

    const skip = (filters.page - 1) * filters.limit;

    const [totalRecords, rows] = await Promise.all([
      this.prisma.patient.count({ where }),
      this.prisma.patient.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true, file_number: true, first_name: true, last_name: true,
          email: true, phone: true, date_of_birth: true, gender: true,
          img: true, colorCode: true, created_at: true,
          appointments: { where: { status: 'COMPLETED' }, orderBy: { appointment_date: 'desc' }, take: 1, select: { appointment_date: true } },
          _count: { select: { appointments: true } },
          patient_queue: { where: { status: { in: ['WAITING', 'IN_CONSULTATION'] } }, take: 1, select: { status: true }, orderBy: { added_at: 'desc' } },
          payments: { where: { status: 'UNPAID' }, select: { total_amount: true } },
        },
      }),
    ]);

    const records: PatientRegistryRecord[] = rows.map((p) => ({
      id: p.id,
      fileNumber: p.file_number,
      firstName: p.first_name,
      lastName: p.last_name,
      dateOfBirth: p.date_of_birth.toISOString(),
      gender: p.gender,
      email: p.email,
      phone: p.phone,
      profileImage: p.img ?? undefined,
      colorCode: p.colorCode ?? undefined,
      createdAt: p.created_at.toISOString(),
      totalVisits: p._count.appointments,
      lastVisitAt: p.appointments[0]?.appointment_date?.toISOString() ?? null,
      queueStatus: (p.patient_queue[0]?.status as 'WAITING' | 'IN_CONSULTATION') ?? null,
      outstandingBalance: p.payments.reduce((sum, pay) => sum + pay.total_amount, 0),
    }));

    return { records, totalRecords, totalPages: Math.ceil(totalRecords / filters.limit), currentPage: filters.page };
  }

  async getStats(): Promise<PatientStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalRecords, newToday, newThisMonth] = await Promise.all([
      this.prisma.patient.count(),
      this.prisma.patient.count({ where: { created_at: { gte: startOfToday } } }),
      this.prisma.patient.count({ where: { created_at: { gte: startOfMonth } } }),
    ]);

    return { totalRecords, newToday, newThisMonth };
  }
}
