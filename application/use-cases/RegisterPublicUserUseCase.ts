import { IAuthService } from '../../domain/interfaces/services/IAuthService';
import { IUserRepository } from '../../domain/interfaces/repositories/IUserRepository';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { Email } from '../../domain/value-objects/Email';
import { Password } from '../../domain/value-objects/Password';
import { User } from '../../domain/entities/User';
import { Status } from '../../domain/enums/Status';
import { Role } from '../../domain/enums/Role';
import { PublicRegisterUserDto, PublicRegisterUserResponseDto } from '../dtos/PublicRegisterUserDto';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: RegisterPublicUserUseCase
 * 
 * Orchestrates PUBLIC user registration (self-registration by visitors).
 * 
 * Business Purpose:
 * - Creates a new user account through public signup
 * - Always assigns PATIENT role (cannot be overridden)
 * - Generates UUID server-side (prevents ID enumeration)
 * - Enforces strong password requirements
 * - Ensures email uniqueness
 * - Records audit event for registration
 * 
 * Security Considerations:
 * - Role is hard-coded to PATIENT (no privilege escalation)
 * - UUID generated server-side (prevents enumeration)
 * - Password validated via Password value object before hashing
 * - Generic error messages (no user enumeration)
 * - All registrations are audited
 * - Users created with ACTIVE status
 * 
 * Workflow:
 * 1. Validate email format via Email value object
 * 2. Validate password strength via Password value object
 * 3. Check if user with email already exists
 * 4. Generate UUID for user ID
 * 5. Hash password via AuthService
 * 6. Create User domain entity with PATIENT role
 * 7. Save user via repository
 * 8. Record audit event
 * 9. Return user information (without password)
 * 
 * Clean Architecture:
 * - No Prisma dependencies
 * - Uses repository abstraction
 * - Uses domain value objects
 * - Fully testable in isolation
 */
export class RegisterPublicUserUseCase {
  constructor(
    private readonly authService: IAuthService,
    private readonly userRepository: IUserRepository,
    private readonly auditService: IAuditService,
  ) {}

  /**
   * Executes the public user registration use case
   * 
   * @param dto - PublicRegisterUserDto containing user information (no id, no role)
   * @returns Promise resolving to PublicRegisterUserResponseDto
   * @throws DomainException if registration fails:
   *   - Email already exists (generic error message)
   *   - Invalid email format
   *   - Weak password
   *   - Other validation failures
   */
  async execute(dto: PublicRegisterUserDto): Promise<PublicRegisterUserResponseDto> {
    // 1. Validate and convert email to Email value object
    let email: Email;
    try {
      email = Email.create(dto.email);
    } catch (error) {
      // Re-throw email validation errors as-is (they're already domain exceptions)
      throw error;
    }

    // 2. Validate password strength via Password value object
    let password: Password;
    try {
      // Don't require special characters for public signup (good UX balance)
      password = Password.create(dto.password, false);
    } catch (error) {
      // Re-throw password validation errors as-is
      throw error;
    }

    // 3. Check if user with email already exists
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      // Generic error message - prevents user enumeration
      // Log actual reason internally for debugging
      throw new DomainException('Unable to complete registration. Please try again.', {
        // Internal details for logging (not exposed to client)
        reason: 'Email already exists',
        email: email.getValue(),
      });
    }

    // 4. Generate UUID for user ID (server-side)
    const userId = this.generateUserId();

    // 5. Hash password via AuthService
    // AuthService.hashPassword will also validate minimum length,
    // but we've already validated with Password value object above
    const passwordHash = await this.authService.hashPassword(password.getValue());

    // 6. Create User domain entity with PATIENT role (hard-coded, cannot be overridden)
    const user = User.create({
      id: userId,
      email: email,
      passwordHash: passwordHash,
      role: Role.PATIENT, // Always PATIENT for public signup
      status: Status.ACTIVE, // New users are active by default
      mfaEnabled: false, // MFA not enabled by default
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 7. Save user via repository
    try {
      await this.userRepository.save(user);
    } catch (error) {
      // If save fails due to duplicate (race condition), return generic error
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new DomainException('Unable to complete registration. Please try again.', {
          reason: 'Email already exists (race condition)',
          email: email.getValue(),
        });
      }
      // Re-throw other errors
      throw error;
    }

    // 8. Record audit event
    // Use 'system' as registeredByUserId for public signups (no authenticated user)
    await this.auditService.recordEvent({
      userId: 'system',
      recordId: user.getId(),
      action: 'CREATE',
      model: 'User',
      details: `User ${user.getEmail().getValue()} (${user.getRole()}) registered via public signup`,
    });

    // 9. Return response DTO (no password hash exposed)
    return {
      id: user.getId(),
      email: user.getEmail().getValue(),
      role: Role.PATIENT, // Always PATIENT
      firstName: user.getFirstName(),
      lastName: user.getLastName(),
      createdAt: user.getCreatedAt() ?? new Date(),
    };
  }

  /**
   * Generates a unique user ID (UUID)
   * 
   * This method is extracted to allow easy mocking in tests.
   * In production, this generates a UUID v4.
   * 
   * @returns UUID string
   */
  private generateUserId(): string {
    // Use crypto.randomUUID() if available (Node.js 14.17+, browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback for older environments (should not be needed in modern Node.js)
    // Generate UUID v4 manually
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
