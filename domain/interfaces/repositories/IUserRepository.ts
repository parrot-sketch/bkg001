import { User } from '../../entities/User';
import { Email } from '../../value-objects/Email';

/**
 * Repository Interface: IUserRepository
 * 
 * Defines the contract for user data persistence operations.
 * This interface represents the "port" in Ports and Adapters architecture.
 * 
 * Implementations of this interface will be provided by the infrastructure layer
 * (e.g., PrismaUserRepository using Prisma ORM).
 * 
 * Domain Layer Rule: This interface only depends on domain types.
 * No framework, infrastructure, or external dependencies allowed.
 */
export interface IUserRepository {
  /**
   * Finds a user by their unique identifier
   * 
   * @param id - The user's unique identifier
   * @returns Promise resolving to the User entity if found, null otherwise
   */
  findById(id: string): Promise<User | null>;

  /**
   * Finds multiple users by their unique identifiers
   * 
   * @param ids - Array of user unique identifiers
   * @returns Promise resolving to an array of User entities found
   */
  findByIds(ids: string[]): Promise<User[]>;

  /**
   * Finds a user by their email address
   * 
   * @param email - The user's email address (as Email value object)
   * @returns Promise resolving to the User entity if found, null otherwise
   */
  findByEmail(email: Email): Promise<User | null>;

  /**
   * Saves a new user to the data store
   * 
   * This method should handle creation of new users.
   * If a user with the same ID already exists, the behavior
   * is implementation-specific (may throw error or update).
   * 
   * @param user - The User entity to save
   * @returns Promise that resolves when the save operation completes
   * @throws Error if the save operation fails
   */
  save(user: User): Promise<void>;

  /**
   * Updates an existing user in the data store
   * 
   * The user must already exist in the data store.
   * 
   * @param user - The User entity with updated information
   * @returns Promise that resolves when the update operation completes
   * @throws Error if the user does not exist or the update fails
   */
  update(user: User): Promise<void>;

  /**
   * Updates a user's email address
   * 
   * @param userId - The user's unique identifier
   * @param newEmail - The new email address
   * @returns Promise that resolves when the update operation completes
   * @throws Error if the user does not exist or the update fails
   */
  updateEmail(userId: string, newEmail: string): Promise<void>;

  /**
   * Updates a user's password
   * 
   * @param userId - The user's unique identifier
   * @param hashedPassword - The new hashed password
   * @returns Promise that resolves when the update operation completes
   * @throws Error if the user does not exist or the update fails
   */
  updatePassword(userId: string, hashedPassword: string): Promise<void>;

  /**
   * Finds all users with a specific role
   * 
   * @param role - The role to filter by (e.g., 'FRONTDESK', 'DOCTOR', 'NURSE')
   * @returns Promise resolving to an array of User entities with that role
   */
  findByRole(role: string): Promise<User[]>;
}
