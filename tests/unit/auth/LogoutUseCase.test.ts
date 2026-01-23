/**
 * Unit Tests: LogoutUseCase
 * 
 * Tests the logout use case in isolation with mocked dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LogoutUseCase } from '../../../application/use-cases/LogoutUseCase';
import { IAuthService } from '../../../domain/interfaces/services/IAuthService';
import { IAuditService } from '../../../domain/interfaces/services/IAuditService';

describe('LogoutUseCase', () => {
  let mockAuthService: IAuthService;
  let mockAuditService: IAuditService;
  let logoutUseCase: LogoutUseCase;

  beforeEach(() => {
    mockAuthService = {
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      hashPassword: vi.fn(),
      verifyPassword: vi.fn(),
      verifyAccessToken: vi.fn(),
    } as unknown as IAuthService;

    mockAuditService = {
      recordEvent: vi.fn(),
    } as unknown as IAuditService;

    logoutUseCase = new LogoutUseCase(mockAuthService, mockAuditService);
  });

  describe('Successful Logout', () => {
    it('should successfully logout a user and revoke refresh tokens', async () => {
      // Arrange
      const userId = 'user-123';
      vi.mocked(mockAuthService.logout).mockResolvedValue(undefined);
      vi.mocked(mockAuditService.recordEvent).mockResolvedValue(undefined);

      // Act
      await logoutUseCase.execute(userId);

      // Assert
      expect(mockAuthService.logout).toHaveBeenCalledWith(userId);
      expect(mockAuditService.recordEvent).toHaveBeenCalledWith({
        userId: 'user-123',
        recordId: 'user-123',
        action: 'LOGOUT',
        model: 'User',
        details: 'User user-123 logged out',
      });
    });

    it('should record audit event with correct details', async () => {
      // Arrange
      const userId = 'doctor-456';
      vi.mocked(mockAuthService.logout).mockResolvedValue(undefined);
      vi.mocked(mockAuditService.recordEvent).mockResolvedValue(undefined);

      // Act
      await logoutUseCase.execute(userId);

      // Assert
      expect(mockAuditService.recordEvent).toHaveBeenCalledWith({
        userId: 'doctor-456',
        recordId: 'doctor-456',
        action: 'LOGOUT',
        model: 'User',
        details: 'User doctor-456 logged out',
      });
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from auth service', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new Error('Logout failed');
      vi.mocked(mockAuthService.logout).mockRejectedValue(error);

      // Act & Assert
      await expect(logoutUseCase.execute(userId)).rejects.toThrow('Logout failed');
      expect(mockAuditService.recordEvent).not.toHaveBeenCalled();
    });

    it('should still attempt logout even if audit logging fails', async () => {
      // Arrange
      const userId = 'user-123';
      vi.mocked(mockAuthService.logout).mockResolvedValue(undefined);
      vi.mocked(mockAuditService.recordEvent).mockRejectedValue(
        new Error('Audit service unavailable')
      );

      // Act & Assert
      // The use case should still complete logout even if audit fails
      // (In production, you might want to log this but not fail the logout)
      await expect(logoutUseCase.execute(userId)).rejects.toThrow();
      expect(mockAuthService.logout).toHaveBeenCalled();
    });
  });
});
