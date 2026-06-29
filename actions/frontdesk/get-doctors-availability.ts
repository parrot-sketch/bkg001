'use server';

import db, { withRetry } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { GetAllDoctorsAvailabilityUseCase } from '@/application/use-cases/GetAllDoctorsAvailabilityUseCase';
import { PrismaAvailabilityRepository } from '@/infrastructure/database/repositories/PrismaAvailabilityRepository';
import { Role } from '@/domain/enums/Role';

const availabilityRepository = new PrismaAvailabilityRepository(db);
const getAllDoctorsAvailabilityUseCase = new GetAllDoctorsAvailabilityUseCase(
  availabilityRepository,
  db
);

/**
 * Server action to fetch all doctors availability for a date range.
 * Secures access to FRONTDESK and ADMIN roles.
 */
export async function getDoctorsAvailabilityAction(startDate: Date, endDate: Date) {
  const user = await getCurrentUser();
  if (!user || (user.role !== Role.FRONTDESK && user.role !== Role.ADMIN)) {
    throw new Error('Unauthorized');
  }

  return withRetry(async () => {
    return await getAllDoctorsAvailabilityUseCase.execute({
      startDate,
      endDate,
    });
  });
}
