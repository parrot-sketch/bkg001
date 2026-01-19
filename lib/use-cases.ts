/**
 * Use Case Factory
 * 
 * Centralized factory for instantiating use cases with their dependencies.
 * This ensures consistent dependency injection across Server Actions and API routes.
 */

import db from '@/lib/db';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { PrismaPatientRepository } from '@/infrastructure/database/repositories/PrismaPatientRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import { MockNotificationService } from '@/infrastructure/services/MockNotificationService';
import { SystemTimeService } from '@/infrastructure/services/SystemTimeService';
import { CreatePatientUseCase } from '@/application/use-cases/CreatePatientUseCase';
import { ScheduleAppointmentUseCase } from '@/application/use-cases/ScheduleAppointmentUseCase';

// Initialize infrastructure dependencies (singleton pattern)
const appointmentRepository = new PrismaAppointmentRepository(db);
const patientRepository = new PrismaPatientRepository(db);
const auditService = new ConsoleAuditService();
const notificationService = new MockNotificationService();
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
    notificationService,
    auditService,
    timeService,
  );
}
