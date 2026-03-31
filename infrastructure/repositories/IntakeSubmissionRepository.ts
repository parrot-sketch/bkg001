import { PrismaClient } from '@prisma/client';
import { IntakeSubmission } from '@/domain/entities/IntakeSubmission';
import { IntakeSubmissionMapper } from '@/infrastructure/mappers/IntakeSubmissionMapper';
import { CorruptedDataError } from '@/domain/errors/IntakeErrors';

export interface IIntakeSubmissionRepository {
  create(submission: IntakeSubmission): Promise<IntakeSubmission>;
  findBySessionId(sessionId: string): Promise<IntakeSubmission | null>;
  findPending(limit: number, offset: number): Promise<IntakeSubmission[]>;
  countPending(): Promise<number>;
  updateStatus(submissionId: string, status: string): Promise<void>;
  updateWithPatientId(submissionId: string, patientId: string): Promise<void>;
}

export class PrismaIntakeSubmissionRepository implements IIntakeSubmissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(submission: IntakeSubmission): Promise<IntakeSubmission> {
    const data = IntakeSubmissionMapper.toPersistence(submission);
    await this.prisma.intakeSubmission.create({ data });
    return submission;
  }

  async findBySessionId(sessionId: string): Promise<IntakeSubmission | null> {
    const record = await this.prisma.intakeSubmission.findUnique({
      where: { session_id: sessionId },
    });
    return record ? IntakeSubmissionMapper.toDomain(record) : null;
  }

  async findPending(limit: number, offset: number): Promise<IntakeSubmission[]> {
    const records = await this.prisma.intakeSubmission.findMany({
      where: { status: 'PENDING' },
      orderBy: { submitted_at: 'desc' },
      take: limit,
      skip: offset,
    });

    return records.map((record) => IntakeSubmissionMapper.toDomain(record));
  }

  async countPending(): Promise<number> {
    return this.prisma.intakeSubmission.count({ where: { status: 'PENDING' } });
  }

  async updateStatus(submissionId: string, status: string): Promise<void> {
    await this.prisma.intakeSubmission.update({
      where: { submission_id: submissionId },
      data: { status },
    });
  }

  async updateWithPatientId(submissionId: string, patientId: string): Promise<void> {
    await this.prisma.intakeSubmission.update({
      where: { submission_id: submissionId },
      data: {
        status: 'CONFIRMED',
        created_patient_id: patientId,
        confirmed_at: new Date(),
      },
    });
  }
}
