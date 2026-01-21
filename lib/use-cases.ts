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
import { SystemTimeService } from '@/infrastructure/services/SystemTimeService';
import { CreatePatientUseCase } from '@/application/use-cases/CreatePatientUseCase';
import { ScheduleAppointmentUseCase } from '@/application/use-cases/ScheduleAppointmentUseCase';

// Initialize infrastructure dependencies (singleton pattern)
const appointmentRepository = new PrismaAppointmentRepository(db);
const patientRepository = new PrismaPatientRepository(db);
const availabilityRepository = new PrismaAvailabilityRepository(db);
const auditService = new ConsoleAuditService();
const notificationService = emailNotificationService; // Real email service (with fallback to mock if not configured)
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
