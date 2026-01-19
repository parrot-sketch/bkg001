import { IAuthService } from '../../domain/interfaces/services/IAuthService';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';

/**
 * Use Case: LogoutUseCase
 * 
 * Orchestrates user logout.
 * 
 * Business Purpose:
 * - Invalidates refresh tokens
 * - Terminates user session
 * - Records audit event for logout
 * 
 * Security Considerations:
 * - All refresh tokens for the user are revoked
 * - Access tokens remain valid until expiration (stateless)
 * - All logout actions are audited
 * 
 * Workflow:
 * 1. Revoke refresh tokens via AuthService
 * 2. Record audit event
 */
export class LogoutUseCase {
  constructor(
    private readonly authService: IAuthService,
    private readonly auditService: IAuditService,
  ) {}

  /**
   * Executes the logout use case
   * 
   * @param userId - ID of the user to logout
   * @returns Promise that resolves when logout completes
   */
  async execute(userId: string): Promise<void> {
    // 1. Revoke refresh tokens via AuthService
    await this.authService.logout(userId);

    // 2. Record audit event
    await this.auditService.recordEvent({
      userId: userId,
      recordId: userId,
      action: 'LOGOUT',
      model: 'User',
      details: `User ${userId} logged out`,
    });
  }
}
