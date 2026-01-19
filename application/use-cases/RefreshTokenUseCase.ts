import { IAuthService } from '../../domain/interfaces/services/IAuthService';
import { RefreshTokenDto } from '../dtos/RefreshTokenDto';
import { RefreshTokenResponseDto } from '../dtos/RefreshTokenDto';

/**
 * Use Case: RefreshTokenUseCase
 * 
 * Orchestrates token refresh for authenticated users.
 * 
 * Business Purpose:
 * - Refreshes expired access tokens using valid refresh tokens
 * - Maintains session continuity
 * - No audit logging required (refresh is a low-level operation)
 * 
 * Security Considerations:
 * - Refresh tokens are verified before use
 * - Invalid or expired refresh tokens are rejected
 * - Revoked refresh tokens are rejected
 * 
 * Workflow:
 * 1. Verify refresh token via AuthService
 * 2. Generate new access token
 * 3. Return new tokens
 */
export class RefreshTokenUseCase {
  constructor(private readonly authService: IAuthService) {}

  /**
   * Executes the token refresh use case
   * 
   * @param dto - RefreshToken DTO containing refresh token
   * @returns Promise resolving to RefreshTokenResponseDto with new access token
   * @throws DomainException if refresh token is invalid or expired
   */
  async execute(dto: RefreshTokenDto): Promise<RefreshTokenResponseDto> {
    // 1. Refresh token via AuthService (throws DomainException if invalid)
    const tokens = await this.authService.refreshToken(dto.refreshToken);

    // 2. Return response DTO
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }
}
