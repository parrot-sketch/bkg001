import { IAuthService } from '../../domain/interfaces/services/IAuthService';
import { IUserRepository } from '../../domain/interfaces/repositories/IUserRepository';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { Email } from '../../domain/value-objects/Email';
import { LoginDto } from '../dtos/LoginDto';
import { LoginResponseDto } from '../dtos/LoginDto';
import { DomainException } from '../../domain/exceptions/DomainException';
import { Role } from '../../domain/enums/Role';

/**
 * Use Case: LoginUseCase
 * 
 * Orchestrates user authentication via email and password.
 * 
 * Business Purpose:
 * - Authenticates user credentials
 * - Generates JWT tokens (access and refresh)
 * - Records audit event for login
 * - Updates last login timestamp
 * 
 * Security Considerations:
 * - Passwords are verified using secure hashing
 * - Only ACTIVE users can authenticate
 * - Generic error messages prevent user enumeration
 * - All login attempts are audited
 * 
 * Workflow:
 * 1. Validate email format via Email value object
 * 2. Authenticate user via AuthService
 * 3. Record audit event
 * 4. Return JWT tokens and user information
 */
export class LoginUseCase {
  constructor(
    private readonly authService: IAuthService,
    private readonly userRepository: IUserRepository,
    private readonly auditService: IAuditService,
  ) {}

  /**
   * Executes the login use case
   * 
   * @param dto - Login DTO containing email and password
   * @returns Promise resolving to LoginResponseDto with tokens and user info
   * @throws DomainException if authentication fails
   */
  async execute(dto: LoginDto): Promise<LoginResponseDto> {
    // 1. Validate and convert email to Email value object
    const email = Email.create(dto.email);

    // 2. Authenticate user (throws DomainException if invalid)
    const tokens = await this.authService.login(email, dto.password);

    // 3. Get user information
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      // This should never happen after successful login, but handle it anyway
      throw new DomainException('User not found after authentication', {
        email: email.getValue(),
      });
    }

    // 4. Record audit event
    await this.auditService.recordEvent({
      userId: user.getId(),
      recordId: user.getId(),
      action: 'LOGIN',
      model: 'User',
      details: `User ${user.getEmail().getValue()} logged in successfully`,
    });

    // 5. Return response DTO
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.getId(),
        email: user.getEmail().getValue(),
        role: user.getRole(),
        firstName: user.getFirstName(),
        lastName: user.getLastName(),
      },
    };
  }
}
