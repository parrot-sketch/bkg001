import { Appointment } from '../../entities/Appointment';
import { AppointmentStatus } from '../../enums/AppointmentStatus';

/**
 * Repository Interface: IAppointmentRepository
 * 
 * Defines the contract for appointment data persistence operations.
 * This interface represents the "port" in Ports and Adapters architecture.
 * 
 * Implementations of this interface will be provided by the infrastructure layer
 * (e.g., PrismaAppointmentRepository using Prisma ORM).
 * 
 * Domain Layer Rule: This interface only depends on domain types.
 * No framework, infrastructure, or external dependencies allowed.
 */
export interface IAppointmentRepository {
  /**
   * Finds an appointment by its unique identifier
   * 
   * @param id - The appointment's unique identifier (numeric ID)
   * @returns Promise resolving to the Appointment entity if found, null otherwise
   */
  findById(id: number): Promise<Appointment | null>;

  /**
   * Finds all appointments for a specific patient
   * 
   * @param patientId - The patient's unique identifier
   * @returns Promise resolving to an array of Appointment entities
   *          Returns empty array if no appointments found
   */
  findByPatient(patientId: string, txClient?: unknown): Promise<Appointment[]>;

  /**
   * Finds all appointments for a specific doctor
   * 
   * @param doctorId - The doctor's unique identifier
   * @param filters - Optional filters for status, date range, etc.
   * @returns Promise resolving to an array of Appointment entities
   *          Returns empty array if no appointments found
   */
  findByDoctor(
    doctorId: string,
    filters?: {
      status?: AppointmentStatus;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Appointment[]>;

  /**
   * Finds appointments that are potential no-shows
   * 
   * @param now - Current date/time
   * @param windowMinutes - Minutes after appointment time to consider for no-show detection
   * @returns Promise resolving to an array of Appointment entities that are potential no-shows
   */
  findPotentialNoShows(now: Date, windowMinutes: number): Promise<Appointment[]>;

  /**
   * Checks for appointment conflicts (double booking)
   * 
   * This method performs a database-level conflict check to prevent double booking.
   * It checks for existing non-cancelled appointments with the same doctor, date, and time.
   * 
   * @param doctorId - The doctor's unique identifier
   * @param appointmentDate - The appointment date
   * @param time - The appointment time (HH:mm format)
   * @param txClient - Optional transaction client for use within transactions (implementation-specific)
   * @returns Promise resolving to true if conflict exists, false otherwise
   */
  hasConflict(
    doctorId: string,
    appointmentDate: Date,
    time: string,
    txClient?: unknown
  ): Promise<boolean>;

  /**
   * Saves a new appointment to the data store
   * 
   * This method should handle creation of new appointments.
   * If an appointment with the same ID already exists, the behavior
   * is implementation-specific (may throw error or update).
   * 
   * @param appointment - The Appointment entity to save
   * @param consultationRequestFields - Optional consultation request workflow fields (implementation-specific)
   * @param txClient - Optional transaction client for use within transactions (implementation-specific)
   * @returns Promise that resolves with the database-generated appointment ID
   * @throws Error if the save operation fails
   */
  save(
    appointment: Appointment,
    consultationRequestFields?: unknown,
    txClient?: unknown
  ): Promise<number>;

  /**
   * Updates an existing appointment in the data store
   * 
   * The appointment must already exist in the data store.
   * 
   * @param appointment - The Appointment entity with updated information
   * @param consultationRequestFields - Optional consultation request workflow fields (implementation-specific)
   * @returns Promise that resolves when the update operation completes
   * @throws Error if the appointment does not exist or the update fails
   */
  update(
    appointment: Appointment,
    consultationRequestFields?: unknown
  ): Promise<void>;

  /**
   * Gets consultation request fields for an appointment
   * 
   * This method retrieves consultation workflow fields that are stored with the appointment
   * but managed separately from the core appointment entity.
   * 
   * @param appointmentId - The appointment ID
   * @returns Promise resolving to consultation request fields or null if not found (implementation-specific type)
   */
  getConsultationRequestFields(appointmentId: number): Promise<unknown | null>;


}
