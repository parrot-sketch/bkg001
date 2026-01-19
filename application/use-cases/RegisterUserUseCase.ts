import { IAuthService } from '../../domain/interfaces/services/IAuthService';
import { IUserRepository } from '../../domain/interfaces/repositories/IUserRepository';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { Email } from '../../domain/value-objects/Email';
import { User } from '../../domain/entities/User';
import { Status } from '../../domain/enums/Status';
import { RegisterUserDto } from '../dtos/RegisterUserDto';
import { RegisterUserResponseDto } from '../dtos/RegisterUserDto';
import { DomainException } from '../../domain/exceptions/DomainException';

/**
 * Use Case: RegisterUserUseCase
 * 
 * Orchestrates user registration in the healthcare system.
 * 
 * Business Purpose:
 * - Creates a new user account
 * - Hashes password securely
 * - Ensures email uniqueness
 * - Records audit event for registration
 * 
 * Security Considerations:
 * - Passwords are hashed using bcrypt/argon2
 * - Email uniqueness is enforced
 * - All registrations are audited
 * - Users are created with ACTIVE status by default
 * 
 * Workflow:
 * 1. Validate email format via Email value object
 * 2. Check if user with email already exists
 * 3. Hash password via AuthService
 * 4. Create User domain entity
 * 5. Save user via repository
 * 6. Record audit event
 * 7. Return user information (without password)
 */
export class RegisterUserUseCase {
  constructor(
    private readonly authService: IAuthService,
    private readonly userRepository: IUserRepository,
    private readonly auditService: IAuditService,
  ) {}

  /**
   * Executes the user registration use case
   * 
   * @param dto - RegisterUser DTO containing user information
   * @param registeredByUserId - ID of the user performing the registration (for audit)
   * @returns Promise resolving to RegisterUserResponseDto
   * @throws DomainException if registration fails (email already exists, invalid data, etc.)
   */
  async execute(dto: RegisterUserDto, registeredByUserId: string): Promise<RegisterUserResponseDto> {
    // 1. Validate and convert email to Email value object
    const email = Email.create(dto.email);

    // 2. Check if user with email already exists
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new DomainException('User with this email already exists', {
        email: email.getValue(),
      });
    }

    // 3. Hash password via AuthService
    const passwordHash = await this.authService.hashPassword(dto.password);

    // 4. Create User domain entity
    const user = User.create({
      id: dto.id,
      email: email,
      passwordHash: passwordHash,
      role: dto.role,
      status: Status.ACTIVE, // New users are active by default
      mfaEnabled: false, // MFA not enabled by default
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. Save user via repository
    await this.userRepository.save(user);

    // 6. Record audit event
    await this.auditService.recordEvent({
      userId: registeredByUserId,
      recordId: user.getId(),
      action: 'CREATE',
      model: 'User',
      details: `User ${user.getEmail().getValue()} (${user.getRole()}) registered by ${registeredByUserId}`,
    });

    // 7. Return response DTO (no password hash exposed)
    return {
      id: user.getId(),
      email: user.getEmail().getValue(),
      role: user.getRole(),
      firstName: user.getFirstName(),
      lastName: user.getLastName(),
      createdAt: user.getCreatedAt() ?? new Date(),
    };
  }
}
