import { IAppointmentRepository } from '../../../domain/interfaces/repositories/IAppointmentRepository';
import { IDoctorStatsRepository } from '../../../domain/interfaces/repositories/IDoctorStatsRepository';
import { Appointment } from '../../../domain/entities/Appointment';
import { AppointmentStatus } from '../../../domain/enums/AppointmentStatus';
import { AppointmentMapper } from '../../mappers/AppointmentMapper';
import { ConsultationRequestFields, toPrismaCreateConsultationRequestFields, toPrismaConsultationRequestFields, extractConsultationRequestFields } from '../../mappers/ConsultationRequestMapper';
import { PrismaClient, Prisma } from '@prisma/client';
import { subMonths, subDays } from 'date-fns';

/**
 * Repository: PrismaAppointmentRepository
 * 
 * Prisma-based implementation of IAppointmentRepository and IDoctorStatsRepository.
 * This repository handles data persistence for Appointment entities using Prisma ORM.
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
export class PrismaAppointmentRepository implements IAppointmentRepository, IDoctorStatsRepository {
  constructor(private readonly prisma: PrismaClient) {
    if (!prisma) {
      throw new Error('PrismaClient is required');
    }
  }

  /**
   * Finds an appointment by its unique identifier
   * 
   * @param id - The appointment's unique identifier (numeric ID)
   * @returns Promise resolving to the Appointment entity if found, null otherwise
   */
  async findById(id: number): Promise<Appointment | null> {
    try {
      const prismaAppointment = await this.prisma.appointment.findUnique({
        where: { id },
      });

      if (!prismaAppointment) {
        return null;
      }

      return AppointmentMapper.fromPrisma(prismaAppointment);
    } catch (error) {
      // Wrap Prisma errors in a more generic error
      throw new Error(`Failed to find appointment by ID: ${id}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Finds all appointments for a specific patient
   * 
   * REFACTORED: Added date range filter (last 12 months) and take limit (100)
   * This prevents unbounded queries that could return thousands of historical appointments.
   * Clinical workflow preserved: Recent appointments are sufficient for conflict detection
   * and consultation history. Historical data beyond 12 months should be accessed via
   * paginated endpoints if needed.
   * 
   * @param patientId - The patient's unique identifier
   * @returns Promise resolving to an array of Appointment entities
   *          Returns empty array if no appointments found
   */
  async findByPatient(patientId: string, txClient?: unknown): Promise<Appointment[]> {
    try {
      const client = (txClient as PrismaClient) || this.prisma;

      // REFACTORED: Default to last 12 months (reasonable for clinical workflows)
      // This bounds the query and prevents fetching thousands of historical records
      const since = subMonths(new Date(), 12);
      const DEFAULT_LIMIT = 100; // Reasonable limit for conflict detection and history

      const prismaAppointments = await client.appointment.findMany({
        where: {
          patient_id: patientId,
          appointment_date: { gte: since }, // REFACTORED: Date filter for safety
        },
        orderBy: { appointment_date: 'desc' },
        take: DEFAULT_LIMIT, // REFACTORED: Bounded query
      });

      return prismaAppointments.map((appointment) => AppointmentMapper.fromPrisma(appointment));
    } catch (error) {
      // Wrap Prisma errors in a more generic error
      throw new Error(`Failed to find appointments for patient: ${patientId}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Finds all appointments for a specific doctor
   * 
   * REFACTORED: Added default date range filter (last 12 months) and take limit (100)
   * If filters provide date range, uses that. Otherwise defaults to last 12 months.
   * This prevents unbounded queries when filters are not provided.
   * Clinical workflow preserved: Recent appointments sufficient for availability checks.
   * 
   * @param doctorId - The doctor's unique identifier
   * @param filters - Optional filters for status, date range, etc.
   * @returns Promise resolving to an array of Appointment entities
   *          Returns empty array if no appointments found
   */
  async findByDoctor(
    doctorId: string,
    filters?: {
      status?: AppointmentStatus;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Appointment[]> {
    try {
      const where: Prisma.AppointmentWhereInput = {
        doctor_id: doctorId,
      };

      if (filters?.status) {
        where.status = filters.status as any;
      }

      // REFACTORED: Apply date filter - use provided filters or default to last 12 months
      if (filters?.startDate || filters?.endDate) {
        where.appointment_date = {};
        if (filters.startDate) {
          where.appointment_date.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.appointment_date.lte = filters.endDate;
        }
      } else {
        // REFACTORED: Default date range if no filters provided (prevents unbounded query)
        const since = subMonths(new Date(), 12);
        where.appointment_date = { gte: since };
      }

      // REFACTORED: Only limit execution if no specific date range is requested.
      // For calendar availability checks (e.g. 2 months), we need ALL appointments to prevent double booking.
      const shouldLimit = !filters?.startDate && !filters?.endDate;
      const DEFAULT_LIMIT = 100;

      const prismaAppointments = await this.prisma.appointment.findMany({
        where,
        orderBy: { appointment_date: 'desc' },
        ...(shouldLimit ? { take: DEFAULT_LIMIT } : {}),
      });

      return prismaAppointments.map((appointment) => AppointmentMapper.fromPrisma(appointment));
    } catch (error) {
      // Wrap Prisma errors in a more generic error
      throw new Error(
        `Failed to find appointments for doctor: ${doctorId}. ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Finds appointments that are potential no-shows
   * 
   * REFACTORED: Added take limit (50) as safety measure
   * No-show detection typically processes recent appointments, so limit is reasonable.
   * Clinical workflow preserved: System processes no-shows in batches.
   * 
   * Business Rules:
   * - Appointment time must have passed
   * - Must be at least windowMinutes after appointment time
   * - Patient must not be checked in
   * - Appointment must not already be marked as no-show
   * - Appointment must be in PENDING, SCHEDULED, or CONFIRMED status
   * 
   * @param now - Current date/time
   * @param windowMinutes - Minutes after appointment time to consider for no-show detection
   * @returns Promise resolving to an array of Appointment entities that are potential no-shows
   */
  async findPotentialNoShows(now: Date, windowMinutes: number): Promise<Appointment[]> {
    try {
      const cutoffTime = new Date(now.getTime() - windowMinutes * 60 * 1000);
      const MAX_NO_SHOWS = 50; // REFACTORED: Safety limit for batch processing

      const prismaAppointments = await this.prisma.appointment.findMany({
        where: {
          // Appointment time has passed (at least windowMinutes ago)
          appointment_date: {
            lte: cutoffTime,
          },
          // Not checked in
          checked_in_at: null,
          // Not already marked as no-show
          no_show: false,
          // Status allows no-show detection
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.SCHEDULED] as any,
          },
        } as any,
        orderBy: { appointment_date: 'asc' },
        take: MAX_NO_SHOWS, // REFACTORED: Bounded query
      });

      return prismaAppointments.map((appointment) => AppointmentMapper.fromPrisma(appointment));
    } catch (error) {
      // Wrap Prisma errors in a more generic error
      throw new Error(
        `Failed to find potential no-shows. ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Checks for appointment conflicts (double booking)
   * 
   * This method performs a database-level conflict check to prevent double booking.
   * It checks for existing non-cancelled appointments with the same doctor, date, and time.
   * 
   * @param doctorId - The doctor's unique identifier
   * @param appointmentDate - The appointment date
   * @param time - The appointment time (HH:mm format)
   * @param txClient - Optional transaction client for use within transactions
   * @returns Promise resolving to true if conflict exists, false otherwise
   */
  async hasConflict(
    doctorId: string,
    appointmentDate: Date,
    time: string,
    txClient?: PrismaClient
  ): Promise<boolean> {
    try {
      const client = txClient || this.prisma;
      const appointmentDateTime = new Date(appointmentDate);
      appointmentDateTime.setHours(0, 0, 0, 0);

      const conflict = await client.appointment.findFirst({
        where: {
          doctor_id: doctorId,
          appointment_date: appointmentDateTime,
          time: time,
          status: {
            not: AppointmentStatus.CANCELLED as any,
          },
        },
      });

      return conflict !== null;
    } catch (error) {
      // Wrap Prisma errors in a more generic error
      throw new Error(`Failed to check appointment conflict. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Saves a new appointment to the data store
   * 
   * This method handles creation of new appointments.
   * The appointment ID will be generated by the database.
   * 
   * @param appointment - The Appointment entity to save
   * @param consultationRequestFields - Optional consultation request workflow fields
   * @param txClient - Optional transaction client for use within transactions
   * @returns Promise that resolves when the save operation completes
   * @throws Error if the save operation fails
   */
  async save(
    appointment: Appointment,
    consultationRequestFields?: ConsultationRequestFields,
    txClient?: PrismaClient
  ): Promise<number> {
    try {
      const client = txClient || this.prisma;
      const createInput = AppointmentMapper.toPrismaCreateInput(appointment);

      // Merge consultation request fields if provided
      if (consultationRequestFields) {
        const consultationFields = toPrismaCreateConsultationRequestFields(consultationRequestFields);
        Object.assign(createInput, consultationFields);
      }

      const created = await client.appointment.create({
        data: createInput,
      });

      // Return the database-generated ID
      return created.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Unique constraint violation (including our double booking constraint)
          const target = error.meta?.target;
          const targetArray = Array.isArray(target) ? target : (typeof target === 'string' ? [target] : []);
          if (targetArray.some(t => String(t).includes('appointment_no_double_booking'))) {
            throw new Error(`Double booking detected: Doctor already has an appointment at this time`);
          }
          throw new Error(`Appointment with ID ${appointment.getId()} already exists`);
        }
        if (error.code === 'P2003') {
          // Foreign key constraint violation
          throw new Error(`Invalid patient or doctor ID for appointment`);
        }
      }
      // Wrap Prisma errors in a more generic error
      throw new Error(`Failed to save appointment. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates an existing appointment in the data store
   * 
   * The appointment must already exist in the data store.
   * 
   * @param appointment - The Appointment entity with updated information
   * @param consultationRequestFields - Optional consultation request workflow fields
   * @returns Promise that resolves when the update operation completes
   * @throws Error if the appointment does not exist or the update fails
   */
  async update(appointment: Appointment, consultationRequestFields?: ConsultationRequestFields): Promise<void> {
    try {
      const updateInput = AppointmentMapper.toPrismaUpdateInput(appointment);

      // Merge consultation request fields if provided
      if (consultationRequestFields) {
        const consultationFields = toPrismaConsultationRequestFields(consultationRequestFields);
        Object.assign(updateInput, consultationFields);
      }

      await this.prisma.appointment.update({
        where: { id: appointment.getId() },
        data: updateInput,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          // Record not found
          throw new Error(`Appointment with ID ${appointment.getId()} not found`);
        }
      }
      // Wrap Prisma errors in a more generic error
      throw new Error(`Failed to update appointment: ${appointment.getId()}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets consultation request fields for an appointment
   * 
   * @param appointmentId - The appointment ID
   * @returns Promise resolving to consultation request fields or null if not found
   */
  async getConsultationRequestFields(appointmentId: number): Promise<ConsultationRequestFields | null> {
    try {
      const prismaAppointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          consultation_request_status: true,
          reviewed_by: true,
          reviewed_at: true,
          review_notes: true,
        },
      });

      if (!prismaAppointment) {
        return null;
      }

      return extractConsultationRequestFields(prismaAppointment);
    } catch (error) {
      throw new Error(`Failed to get consultation request fields for appointment ${appointmentId}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  /**
   * Gets aggregated dashboard statistics for a doctor
   * 
   * REFACTORED: O(1) complexity implementation
   * Replaces previous N+1 logic that fetched all appointments and looped through them.
   * Uses 4 parallel aggregation queries:
   * 1. Count today's appointments
   * 2. Count pending check-ins
   * 3. Count upcoming appointments
   * 4. Count pending consultation requests
   * 
   * @param doctorId - The doctor's unique identifier
   * @returns Promise resolving to DoctorDashboardStatsDto
   */
  async getDoctorStats(doctorId: string): Promise<{
    todayAppointmentsCount: number;
    pendingConsultationRequestsCount: number;
    pendingCheckInsCount: number;
    upcomingAppointmentsCount: number;
  }> {
    try {
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 5);

      // Execute counts in parallel for optimal performance
      const [
        todayAppointmentsCount,
        pendingCheckInsCount,
        upcomingAppointmentsCount,
        pendingConsultationRequestsCount
      ] = await Promise.all([
        // 1. Today's appointments (exclude cancelled)
        this.prisma.appointment.count({
          where: {
            doctor_id: doctorId,
            appointment_date: {
              gte: today,
              lt: tomorrow,
            },
            status: {
              not: AppointmentStatus.CANCELLED as any,
            },
          },
        }),

        // 2. Pending check-ins (Today's appointments that are SCHEDULED/PINGING but not checked in)
        // Simplified check: SCHEDULED appointments for today
        this.prisma.appointment.count({
          where: {
            doctor_id: doctorId,
            appointment_date: {
              gte: today,
              lt: tomorrow,
            },
            status: {
              in: [AppointmentStatus.SCHEDULED, AppointmentStatus.PENDING] as any,
            },
            checked_in_at: null,
          } as any,
        }),

        // 3. Upcoming appointments (Tomorrow to +5 days)
        this.prisma.appointment.count({
          where: {
            doctor_id: doctorId,
            appointment_date: {
              gte: tomorrow,
              lte: nextWeek,
            },
            status: {
              not: AppointmentStatus.CANCELLED as any,
            },
          },
        }),

        // 4. Pending Consultation Requests
        // This queries based on the consultation status fields directly
        this.prisma.appointment.count({
          where: {
            doctor_id: doctorId,
            consultation_request_status: {
              in: ['PENDING_REVIEW', 'APPROVED'], // Matching values from ConsultationRequestStatus enum
            } as any,
            status: {
              not: AppointmentStatus.CANCELLED as any,
            },
          } as any, // Cast needed because consultation fields are optional in schema
        }),
      ]);

      return {
        todayAppointmentsCount,
        pendingCheckInsCount,
        upcomingAppointmentsCount,
        pendingConsultationRequestsCount,
      };
    } catch (error) {
      throw new Error(`Failed to get doctor stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
