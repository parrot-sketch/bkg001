/**
 * Unit Tests: RefreshTokenUseCase
 * 
 * Tests the token refresh use case in isolation with mocked dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefreshTokenUseCase } from '../../../application/use-cases/RefreshTokenUseCase';
import { IAuthService, JWTToken } from '../../../domain/interfaces/services/IAuthService';
import { DomainException } from '../../../domain/exceptions/DomainException';
import { RefreshTokenDto } from '../../../application/dtos/RefreshTokenDto';

describe('RefreshTokenUseCase', () => {
  let mockAuthService: IAuthService;
  let refreshTokenUseCase: RefreshTokenUseCase;

  beforeEach(() => {
    mockAuthService = {
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      hashPassword: vi.fn(),
      verifyPassword: vi.fn(),
      verifyAccessToken: vi.fn(),
    } as unknown as IAuthService;

    refreshTokenUseCase = new RefreshTokenUseCase(mockAuthService);
  });

  describe('Successful Token Refresh', () => {
    it('should successfully refresh an access token with valid refresh token', async () => {
      // Arrange
      const dto: RefreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      const mockTokens: JWTToken = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      };

      vi.mocked(mockAuthService.refreshToken).mockResolvedValue(mockTokens);

      // Act
      const result = await refreshTokenUseCase.execute(dto);

      // Assert
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      });

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
    });
  });

  describe('Token Refresh Failures', () => {
    it('should throw DomainException when refresh token is invalid', async () => {
      // Arrange
      const dto: RefreshTokenDto = {
        refreshToken: 'invalid-refresh-token',
      };

      vi.mocked(mockAuthService.refreshToken).mockRejectedValue(
        new DomainException('Invalid or expired refresh token')
      );

      // Act & Assert
      await expect(refreshTokenUseCase.execute(dto)).rejects.toThrow(DomainException);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('invalid-refresh-token');
    });

    it('should throw DomainException when refresh token is expired', async () => {
      // Arrange
      const dto: RefreshTokenDto = {
        refreshToken: 'expired-refresh-token',
      };

      vi.mocked(mockAuthService.refreshToken).mockRejectedValue(
        new DomainException('Refresh token has expired')
      );

      // Act & Assert
      await expect(refreshTokenUseCase.execute(dto)).rejects.toThrow(DomainException);
    });

    it('should throw DomainException when refresh token is revoked', async () => {
      // Arrange
      const dto: RefreshTokenDto = {
        refreshToken: 'revoked-refresh-token',
      };

      vi.mocked(mockAuthService.refreshToken).mockRejectedValue(
        new DomainException('Refresh token has been revoked')
      );

      // Act & Assert
      await expect(refreshTokenUseCase.execute(dto)).rejects.toThrow(DomainException);
    });
  });
});
