/**
 * Use Case Factory
 * 
 * Centralized factory for instantiating use cases with their dependencies.
 * This ensures consistent dependency injection across Server Actions and API routes.
 */

import db from '@/lib/db';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { PrismaPatientRepository } from '@/infrastructure/database/repositories/PrismaPatientRepository';
import { PrismaAvailabilityRepository } from '@/infrastructure/database/repositories/PrismaAvailabilityRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import { emailNotificationService } from '@/infrastructure/services/EmailNotificationService';
import { PrismaNotificationService } from '@/infrastructure/services/PrismaNotificationService';
import { SystemTimeService } from '@/infrastructure/services/SystemTimeService';
import { CreatePatientUseCase } from '@/application/use-cases/CreatePatientUseCase';
import { ScheduleAppointmentUseCase } from '@/application/use-cases/ScheduleAppointmentUseCase';
import { CheckInPatientUseCase } from '@/application/use-cases/CheckInPatientUseCase';
import { CreateCasePlanUseCase } from '@/application/use-cases/CreateCasePlanUseCase';
import { PrismaSurgicalCaseRepository } from '@/infrastructure/database/repositories/PrismaSurgicalCaseRepository';
import { PrismaCasePlanRepository } from '@/infrastructure/database/repositories/PrismaCasePlanRepository';
// ... (imports)

// Initialize infrastructure dependencies (singleton pattern)
const appointmentRepository = new PrismaAppointmentRepository(db);
const patientRepository = new PrismaPatientRepository(db);
const availabilityRepository = new PrismaAvailabilityRepository(db);
const casePlanRepository = new PrismaCasePlanRepository(db);
const surgicalCaseRepository = new PrismaSurgicalCaseRepository(db);
const auditService = new ConsoleAuditService();
// ...

// ...


const notificationService = new PrismaNotificationService(db, emailNotificationService); // Uses Prisma for in-app, delegates email/sms to emailNotificationService
const timeService = new SystemTimeService();

/**
 * Get CreatePatientUseCase instance
 */
export function getCreatePatientUseCase(): CreatePatientUseCase {
  return new CreatePatientUseCase(
    patientRepository,
    auditService,
  );
}

/**
 * Get ScheduleAppointmentUseCase instance
 */
export function getScheduleAppointmentUseCase(): ScheduleAppointmentUseCase {
  return new ScheduleAppointmentUseCase(
    appointmentRepository,
    patientRepository,
    availabilityRepository,
    notificationService,
    auditService,
    timeService,
    db,
  );
}

/**
 * Get CheckInPatientUseCase instance
 */
export function getCheckInPatientUseCase(): CheckInPatientUseCase {
  return new CheckInPatientUseCase(
    appointmentRepository,
    auditService,
    timeService,
  );
}

/**
 * Get CreateCasePlanUseCase instance
 */
export function getCreateCasePlanUseCase(): CreateCasePlanUseCase {
  return new CreateCasePlanUseCase(
    casePlanRepository,
    surgicalCaseRepository,
    auditService
  );
}
