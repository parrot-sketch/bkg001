import { PrismaClient, Prisma } from '@prisma/client';
import { Patient } from '@/domain/entities/Patient';
import {
  IPatientRepository,
  PatientFilters,
  PatientListResult,
  PatientRegistryRecord,
  PatientStats,
} from '@/domain/interfaces/repositories/IPatientRepository';
import { Email } from '@/domain/value-objects/Email';
import { PatientMapper } from '@/infrastructure/mappers/PatientMapper';

export class PrismaPatientRepository implements IPatientRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<Patient | null> {
    const raw = await this.db.patient.findUnique({ where: { id } });
    return raw ? PatientMapper.fromPrisma(raw) : null;
  }

  async findByEmail(email: Email): Promise<Patient | null> {
    const raw = await this.db.patient.findUnique({ where: { email: email.getValue() } });
    return raw ? PatientMapper.fromPrisma(raw) : null;
  }

  async save(patient: Patient): Promise<void> {
    await this.db.patient.create({ data: PatientMapper.toPrismaCreateInput(patient) });
  }

  async update(patient: Patient): Promise<void> {
    await this.db.patient.update({
      where: { id: patient.getId() },
      data: PatientMapper.toPrismaUpdateInput(patient),
    });
  }

  async findWithFilters(filters: PatientFilters): Promise<PatientListResult> {
    const whereClause = this.buildWhereClause(filters.search);
    const skip = (filters.page - 1) * filters.limit;

    const [totalRecords, rows] = await Promise.all([
      this.db.patient.count({ where: whereClause }),
      this.db.patient.findMany({
        where: whereClause,
        skip,
        take: filters.limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          file_number: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          date_of_birth: true,
          gender: true,
          img: true,
          colorCode: true,
          created_at: true,
          appointments: {
            where: { status: 'COMPLETED' },
            orderBy: { appointment_date: 'desc' },
            take: 1,
            select: { appointment_date: true },
          },
          _count: { select: { appointments: true } },
          patient_queue: {
            where: { status: { in: ['WAITING', 'IN_CONSULTATION'] } },
            take: 1,
            select: { status: true },
            orderBy: { added_at: 'desc' },
          },
          payments: {
            where: { status: 'UNPAID' },
            select: { total_amount: true },
          },
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

    return {
      records,
      totalRecords,
      totalPages: Math.ceil(totalRecords / filters.limit),
      currentPage: filters.page,
    };
  }

  async getStats(): Promise<PatientStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalRecords, newToday, newThisMonth] = await Promise.all([
      this.db.patient.count(),
      this.db.patient.count({ where: { created_at: { gte: startOfToday } } }),
      this.db.patient.count({ where: { created_at: { gte: startOfMonth } } }),
    ]);

    return { totalRecords, newToday, newThisMonth };
  }

  async generateNextFileNumber(): Promise<string> {
    const patients = await this.db.patient.findMany({
      select: { file_number: true },
      where: { file_number: { startsWith: 'NS' } },
    });

    let maxNumber = 0;
    for (const p of patients) {
      if (!p.file_number) continue;
      const numStr = p.file_number.substring(2);
      if (/^\d{1,6}$/.test(numStr)) {
        const num = parseInt(numStr, 10);
        if (num > maxNumber) maxNumber = num;
      }
    }

    return `NS${String(maxNumber + 1).padStart(3, '0')}`;
  }

  private buildWhereClause(search?: string): Prisma.PatientWhereInput {
    if (!search?.trim()) return {};
    const s = search.trim();
    return {
      OR: [
        { first_name: { contains: s, mode: 'insensitive' } },
        { last_name: { contains: s, mode: 'insensitive' } },
        { file_number: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ],
    };
  }
}
