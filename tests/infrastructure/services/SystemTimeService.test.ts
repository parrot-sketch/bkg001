import { describe, it, expect, beforeEach } from 'vitest';
import { SystemTimeService } from '../../../../infrastructure/services/SystemTimeService';

describe('SystemTimeService', () => {
  let service: SystemTimeService;

  beforeEach(() => {
    service = new SystemTimeService();
  });

  describe('now', () => {
    it('should return current date and time', () => {
      const before = new Date();
      const result = service.now();
      const after = new Date();

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should return different dates when called at different times', async () => {
      const first = service.now();
      await new Promise((resolve) => setTimeout(resolve, 10)); // Wait 10ms
      const second = service.now();

      expect(second.getTime()).toBeGreaterThan(first.getTime());
    });
  });

  describe('today', () => {
    it('should return current date with time set to midnight', () => {
      const result = service.today();

      expect(result).toBeInstanceOf(Date);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should return date representing today', () => {
      const now = new Date();
      const today = service.today();

      expect(today.getFullYear()).toBe(now.getFullYear());
      expect(today.getMonth()).toBe(now.getMonth());
      expect(today.getDate()).toBe(now.getDate());
    });

    it('should always return same date when called on the same day', () => {
      const first = service.today();
      const second = service.today();

      expect(first.getTime()).toBe(second.getTime());
    });
  });
});
