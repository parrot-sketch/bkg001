import { ITimeService } from '../../domain/interfaces/services/ITimeService';

/**
 * Service: SystemTimeService
 * 
 * System clock implementation of ITimeService.
 * This service wraps the system clock to provide time operations.
 * 
 * This abstraction enables:
 * - Testability: Can be mocked for deterministic tests
 * - Timezone handling: Can be extended to support timezone-aware operations
 * - Clock synchronization: Can be extended to use synchronized time sources
 * 
 * Responsibilities:
 * - Provide current date and time
 * - NO business logic - only time operations
 * 
 * Clean Architecture Rule: This class implements domain interface,
 * translating domain time needs to system clock.
 */
export class SystemTimeService implements ITimeService {
  /**
   * Gets the current date and time from the system clock
   * 
   * @returns Current Date object representing the current date and time
   */
  now(): Date {
    return new Date();
  }

  /**
   * Gets the current date (without time component)
   * 
   * Returns the current date with time set to midnight (00:00:00) in local timezone.
   * 
   * @returns Current Date object with time set to midnight
   */
  today(): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }
}
