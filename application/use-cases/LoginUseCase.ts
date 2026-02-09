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
    //    JwtAuthService.login() already fetches the user internally,
    //    and returns `authenticatedUser` alongside the tokens so we
    //    don't need a redundant findByEmail here.
    const tokens = await this.authService.login(email, dto.password);

    // 3. Resolve user info — prefer the inline authenticatedUser to
    //    avoid a duplicate SELECT.  Fall back to a DB lookup only if
    //    the auth service implementation doesn't provide it.
    let userInfo: { id: string; email: string; role: string; firstName?: string; lastName?: string };

    if (tokens.authenticatedUser) {
      userInfo = tokens.authenticatedUser;
    } else {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new DomainException('User not found after authentication', {
          email: email.getValue(),
        });
      }
      userInfo = {
        id: user.getId(),
        email: user.getEmail().getValue(),
        role: user.getRole(),
        firstName: user.getFirstName(),
        lastName: user.getLastName(),
      };
    }

    // 4. Record audit event (console-only — no DB round-trip)
    await this.auditService.recordEvent({
      userId: userInfo.id,
      recordId: userInfo.id,
      action: 'LOGIN',
      model: 'User',
      details: `User ${userInfo.email} logged in successfully`,
    });

    // 5. Opportunistic cleanup of expired/revoked refresh tokens (fire-and-forget)
    //    Keeps the RefreshToken table from growing unboundedly.
    if ('cleanupExpiredTokens' in this.authService) {
      (this.authService as any).cleanupExpiredTokens().catch(() => {
        // Swallow errors — cleanup is best-effort and must not block login
      });
    }

    // 6. Return response DTO
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: userInfo,
    };
  }
}
