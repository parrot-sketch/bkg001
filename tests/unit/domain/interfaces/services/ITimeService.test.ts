import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ITimeService } from '@domain/interfaces/services/ITimeService';

/**
 * Test: ITimeService Interface
 * 
 * These tests validate that:
 * 1. The interface contract is correct
 * 2. The interface can be implemented (mock implementation)
 * 3. The interface methods have correct signatures
 * 4. The interface is usable in a mock-driven environment
 * 5. Time-based operations are testable
 */
describe('ITimeService Interface', () => {
  /**
   * Mock implementation for testing
   * This validates that the interface contract can be satisfied
   * Allows setting a fixed time for deterministic testing
   */
  class MockTimeService implements ITimeService {
    private fixedTime: Date | null = null;

    setFixedTime(time: Date): void {
      this.fixedTime = time;
    }

    clearFixedTime(): void {
      this.fixedTime = null;
    }

    now(): Date {
      return this.fixedTime ? new Date(this.fixedTime) : new Date();
    }

    today(): Date {
      const now = this.now();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      return today;
    }
  }

  describe('Interface Contract', () => {
    it('should be implementable', () => {
      const service: ITimeService = new MockTimeService();
      expect(service).toBeDefined();
    });

    it('should have now method with correct signature', () => {
      const service: ITimeService = new MockTimeService();
      expect(typeof service.now).toBe('function');
      expect(service.now.length).toBe(0); // Takes no parameters
    });

    it('should have today method with correct signature', () => {
      const service: ITimeService = new MockTimeService();
      expect(typeof service.today).toBe('function');
      expect(service.today.length).toBe(0); // Takes no parameters
    });
  });

  describe('Mock Implementation Behavior', () => {
    let service: MockTimeService;

    beforeEach(() => {
      service = new MockTimeService();
    });

    afterEach(() => {
      service.clearFixedTime();
    });

    it('should return current time by default', () => {
      const now = service.now();
      expect(now).toBeInstanceOf(Date);
      expect(now.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should return fixed time when set', () => {
      const fixedDate = new Date('2025-01-15T10:30:00Z');
      service.setFixedTime(fixedDate);

      const result = service.now();
      expect(result.getTime()).toBe(fixedDate.getTime());
    });

    it('should return today with time set to midnight', () => {
      const fixedDate = new Date('2025-01-15T10:30:00Z');
      service.setFixedTime(fixedDate);

      const today = service.today();
      expect(today.getFullYear()).toBe(2025);
      expect(today.getMonth()).toBe(0); // January (0-indexed)
      expect(today.getDate()).toBe(15);
      expect(today.getHours()).toBe(0);
      expect(today.getMinutes()).toBe(0);
      expect(today.getSeconds()).toBe(0);
      expect(today.getMilliseconds()).toBe(0);
    });

    it('should return different Date instances for immutability', () => {
      const fixedDate = new Date('2025-01-15T10:30:00Z');
      service.setFixedTime(fixedDate);

      const time1 = service.now();
      const time2 = service.now();

      // Should be different instances
      expect(time1).not.toBe(time2);
      // But should represent the same time
      expect(time1.getTime()).toBe(time2.getTime());
    });
  });

  describe('Type Safety', () => {
    it('should return Date from now()', () => {
      const service: ITimeService = new MockTimeService();
      const result: Date = service.now();
      expect(result).toBeInstanceOf(Date);
    });

    it('should return Date from today()', () => {
      const service: ITimeService = new MockTimeService();
      const result: Date = service.today();
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('Mock-Driven Environment Usage', () => {
    it('should be usable with Vitest mocks', () => {
      const fixedDate = new Date('2025-01-15T10:30:00Z');
      const mockService: ITimeService = {
        now: vi.fn().mockReturnValue(fixedDate),
        today: vi.fn().mockReturnValue(new Date('2025-01-15T00:00:00Z')),
      };

      expect(mockService.now).toBeDefined();
      expect(mockService.today).toBeDefined();
    });

    it('should allow setting mock return values', () => {
      const fixedDate = new Date('2025-01-15T10:30:00Z');
      const todayDate = new Date('2025-01-15T00:00:00Z');
      const mockService: ITimeService = {
        now: vi.fn().mockReturnValue(fixedDate),
        today: vi.fn().mockReturnValue(todayDate),
      };

      const now = mockService.now();
      expect(now).toBe(fixedDate);
      expect(mockService.now).toHaveBeenCalledTimes(1);

      const today = mockService.today();
      expect(today).toBe(todayDate);
      expect(mockService.today).toHaveBeenCalledTimes(1);
    });
  });

  describe('Deterministic Testing', () => {
    it('should allow setting fixed time for deterministic tests', () => {
      const service = new MockTimeService();
      const fixedDate = new Date('2025-06-15T14:30:00Z');
      service.setFixedTime(fixedDate);

      // Multiple calls should return the same time
      const time1 = service.now();
      const time2 = service.now();
      const time3 = service.now();

      expect(time1.getTime()).toBe(fixedDate.getTime());
      expect(time2.getTime()).toBe(fixedDate.getTime());
      expect(time3.getTime()).toBe(fixedDate.getTime());
    });

    it('should allow clearing fixed time to resume normal behavior', () => {
      const service = new MockTimeService();
      const fixedDate = new Date('2025-01-15T10:30:00Z');
      service.setFixedTime(fixedDate);

      const fixedTime = service.now();
      expect(fixedTime.getTime()).toBe(fixedDate.getTime());

      service.clearFixedTime();

      // Should return current time (will be different from fixed time)
      const currentTime = service.now();
      expect(currentTime.getTime()).toBeGreaterThanOrEqual(Date.now() - 1000); // Within 1 second
    });
  });

  describe('Today Method Behavior', () => {
    it('should return same date regardless of time of day', () => {
      const service = new MockTimeService();

      // Set different times on the same day
      service.setFixedTime(new Date('2025-01-15T00:00:00Z'));
      const today1 = service.today();

      service.setFixedTime(new Date('2025-01-15T12:00:00Z'));
      const today2 = service.today();

      service.setFixedTime(new Date('2025-01-15T23:59:59Z'));
      const today3 = service.today();

      // All should be the same date (midnight of that day)
      expect(today1.getTime()).toBe(today2.getTime());
      expect(today2.getTime()).toBe(today3.getTime());
      expect(today1.getHours()).toBe(0);
      expect(today1.getMinutes()).toBe(0);
      expect(today1.getSeconds()).toBe(0);
    });
  });
});
