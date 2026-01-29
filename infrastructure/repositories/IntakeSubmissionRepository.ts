import { PrismaClient } from '@prisma/client';
import { IntakeSubmission } from '@/domain/entities/IntakeSubmission';
import { IntakeSubmissionMapper } from '@/infrastructure/mappers/IntakeSubmissionMapper';

/**
 * Repository Interface: IntakeSubmissionRepository
 *
 * Defines contract for persisting IntakeSubmissions
 */
export interface IIntakeSubmissionRepository {
  create(submission: IntakeSubmission): Promise<IntakeSubmission>;
  findBySessionId(sessionId: string): Promise<IntakeSubmission | null>;
  findPending(limit: number, offset: number): Promise<IntakeSubmission[]>;
  countPending(): Promise<number>;
  updateStatus(submissionId: string, status: string): Promise<IntakeSubmission>;
  updateWithPatientId(
    submissionId: string,
    patientId: string,
  ): Promise<IntakeSubmission>;
}

/**
 * Implementation: PrismaIntakeSubmissionRepository
 *
 * Uses Prisma ORM for database access
 */
export class PrismaIntakeSubmissionRepository implements IIntakeSubmissionRepository {
  constructor(private readonly prisma: PrismaClient) { }

  async create(submission: IntakeSubmission): Promise<IntakeSubmission> {
    const persistenceData = IntakeSubmissionMapper.toPersistence(submission);

    await this.prisma.intakeSubmission.create({
      data: persistenceData,
    });

    return submission;
  }

  async findBySessionId(sessionId: string): Promise<IntakeSubmission | null> {
    const record = await this.prisma.intakeSubmission.findUnique({
      where: { session_id: sessionId },
    });

    if (!record) {
      return null;
    }

    return IntakeSubmissionMapper.toDomain(record);
  }

  async findPending(limit: number, offset: number): Promise<IntakeSubmission[]> {
    const records = await this.prisma.intakeSubmission.findMany({
      where: { status: 'PENDING' },
      orderBy: { submitted_at: 'desc' },
      take: limit,
      skip: offset,
    });

    const entries: IntakeSubmission[] = [];
    for (const record of records) {
      try {
        entries.push(IntakeSubmissionMapper.toDomain(record));
      } catch (error) {
        console.error(`[Repository] Skipping invalid intake record ${record.submission_id}:`, error);
      }
    }

    return entries;
  }

  async countPending(): Promise<number> {
    return this.prisma.intakeSubmission.count({
      where: { status: 'PENDING' },
    });
  }

  async updateStatus(submissionId: string, status: string): Promise<IntakeSubmission> {
    const record = await this.prisma.intakeSubmission.update({
      where: { submission_id: submissionId },
      data: { status },
    });

    return IntakeSubmissionMapper.toDomain(record);
  }

  async updateWithPatientId(
    submissionId: string,
    patientId: string,
  ): Promise<IntakeSubmission> {
    const record = await this.prisma.intakeSubmission.update({
      where: { submission_id: submissionId },
      data: {
        status: 'CONFIRMED',
        created_patient_id: patientId,
        confirmed_at: new Date(),
      },
    });

    return IntakeSubmissionMapper.toDomain(record);
  }
}
