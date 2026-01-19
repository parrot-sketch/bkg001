import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConsoleAuditService } from '../../../../infrastructure/services/ConsoleAuditService';
import type { AuditEvent } from '../../../../domain/interfaces/services/IAuditService';

describe('ConsoleAuditService', () => {
  let service: ConsoleAuditService;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    service = new ConsoleAuditService();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Set NODE_ENV to test to avoid production logging format
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recordEvent', () => {
    it('should log audit event as JSON', async () => {
      const event: AuditEvent = {
        userId: 'user-1',
        recordId: 'record-1',
        action: 'CREATE',
        model: 'Patient',
        details: 'Created new patient',
        ipAddress: '192.168.1.1',
        sessionId: 'session-123',
      };

      await service.recordEvent(event);

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      const parsedLog = JSON.parse(logCall);
      
      expect(parsedLog.userId).toBe('user-1');
      expect(parsedLog.recordId).toBe('record-1');
      expect(parsedLog.action).toBe('CREATE');
      expect(parsedLog.model).toBe('Patient');
      expect(parsedLog.details).toBe('Created new patient');
      expect(parsedLog.ipAddress).toBe('192.168.1.1');
      expect(parsedLog.sessionId).toBe('session-123');
      expect(parsedLog.timestamp).toBeDefined();
    });

    it('should log audit event with optional fields as null when not provided', async () => {
      const event: AuditEvent = {
        userId: 'user-1',
        recordId: 'record-1',
        action: 'VIEW',
        model: 'Appointment',
      };

      await service.recordEvent(event);

      expect(consoleLogSpy).toHaveBeenCalled();
      const logCall = consoleLogSpy.mock.calls[0][0];
      const parsedLog = JSON.parse(logCall);
      
      expect(parsedLog.details).toBeNull();
      expect(parsedLog.ipAddress).toBeNull();
      expect(parsedLog.sessionId).toBeNull();
    });

    it('should throw error if logging fails', async () => {
      const event: AuditEvent = {
        userId: 'user-1',
        recordId: 'record-1',
        action: 'CREATE',
        model: 'Patient',
      };

      // Force console.log to throw an error
      consoleLogSpy.mockImplementation(() => {
        throw new Error('Logging failed');
      });

      await expect(service.recordEvent(event)).rejects.toThrow(
        'Failed to record audit event'
      );
      
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should include timestamp in log', async () => {
      const event: AuditEvent = {
        userId: 'user-1',
        recordId: 'record-1',
        action: 'UPDATE',
        model: 'Patient',
      };

      const beforeTime = new Date().toISOString();
      await service.recordEvent(event);
      const afterTime = new Date().toISOString();

      const logCall = consoleLogSpy.mock.calls[0][0];
      const parsedLog = JSON.parse(logCall);
      
      expect(parsedLog.timestamp).toBeDefined();
      expect(parsedLog.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(parsedLog.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });
});
