import { Patient } from '../../entities/Patient';
import { Email } from '../../value-objects/Email';

/**
 * Repository Interface: IPatientRepository
 * 
 * Defines the contract for patient data persistence operations.
 * This interface represents the "port" in Ports and Adapters architecture.
 * 
 * Implementations of this interface will be provided by the infrastructure layer
 * (e.g., PrismaPatientRepository using Prisma ORM).
 * 
 * Domain Layer Rule: This interface only depends on domain types.
 * No framework, infrastructure, or external dependencies allowed.
 */
export interface IPatientRepository {
  /**
   * Finds a patient by their unique identifier
   * 
   * @param id - The patient's unique identifier
   * @returns Promise resolving to the Patient entity if found, null otherwise
   */
  findById(id: string): Promise<Patient | null>;

  /**
   * Finds a patient by their email address
   * 
   * @param email - The patient's email address (as Email value object)
   * @returns Promise resolving to the Patient entity if found, null otherwise
   */
  findByEmail(email: Email): Promise<Patient | null>;

  /**
   * Saves a new patient to the data store
   * 
   * This method should handle both creation of new patients.
   * If a patient with the same ID already exists, the behavior
   * is implementation-specific (may throw error or update).
   * 
   * @param patient - The Patient entity to save
   * @returns Promise that resolves when the save operation completes
   * @throws Error if the save operation fails
   */
  save(patient: Patient): Promise<void>;

  /**
   * Updates an existing patient in the data store
   * 
   * The patient must already exist in the data store.
   * 
   * @param patient - The Patient entity with updated information
   * @returns Promise that resolves when the update operation completes
   * @throws Error if the patient does not exist or the update fails
   */
  update(patient: Patient): Promise<void>;
}
