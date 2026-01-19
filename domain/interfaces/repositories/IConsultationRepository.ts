import { Consultation } from '../../entities/Consultation';
import { ConsultationState } from '../../enums/ConsultationState';

/**
 * Repository Interface: IConsultationRepository
 * 
 * Defines the contract for consultation data persistence operations.
 * This interface represents the "port" in Ports and Adapters architecture.
 * 
 * Implementations of this interface will be provided by the infrastructure layer
 * (e.g., PrismaConsultationRepository using Prisma ORM).
 * 
 * Domain Layer Rule: This interface only depends on domain types.
 * No framework, infrastructure, or external dependencies allowed.
 */
export interface IConsultationRepository {
  /**
   * Finds a consultation by its unique identifier
   * 
   * @param id - The consultation's unique identifier (numeric ID)
   * @returns Promise resolving to the Consultation entity if found, null otherwise
   */
  findById(id: number): Promise<Consultation | null>;

  /**
   * Finds a consultation by appointment ID (1:1 relationship)
   * 
   * @param appointmentId - The appointment's unique identifier
   * @returns Promise resolving to the Consultation entity if found, null otherwise
   */
  findByAppointmentId(appointmentId: number): Promise<Consultation | null>;

  /**
   * Finds all consultations for a specific doctor
   * 
   * @param doctorId - The doctor's unique identifier
   * @param filters - Optional filters for state, date range, etc.
   * @returns Promise resolving to an array of Consultation entities
   *          Returns empty array if no consultations found
   */
  findByDoctorId(
    doctorId: string,
    filters?: {
      state?: ConsultationState;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Consultation[]>;

  /**
   * Saves a new consultation to the data store
   * 
   * This method handles creation of new consultations.
   * If a consultation with the same ID already exists, the behavior
   * is implementation-specific (may throw error or update).
   * 
   * @param consultation - The Consultation entity to save
   * @returns Promise resolving to the saved Consultation entity (with generated ID if new)
   * @throws Error if the save operation fails
   */
  save(consultation: Consultation): Promise<Consultation>;

  /**
   * Updates an existing consultation in the data store
   * 
   * The consultation must already exist in the data store.
   * 
   * @param consultation - The Consultation entity with updated information
   * @returns Promise that resolves when the update operation completes
   * @throws Error if the consultation does not exist or the update fails
   */
  update(consultation: Consultation): Promise<void>;

  /**
   * Deletes a consultation from the data store
   * 
   * @param id - The consultation's unique identifier
   * @returns Promise that resolves when the delete operation completes
   * @throws Error if the consultation does not exist or the delete fails
   */
  delete(id: number): Promise<void>;
}
