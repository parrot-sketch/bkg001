/**
 * Service Interface: ITimeService
 * 
 * Defines the contract for time-related operations.
 * This interface represents the "port" in Ports and Adapters architecture.
 * 
 * This service abstracts time operations to enable:
 * - Testability: Can mock time for deterministic tests
 * - Timezone handling: Can implement timezone-aware logic
 * - Clock synchronization: Can use synchronized time sources in distributed systems
 * 
 * Implementations of this interface will be provided by the infrastructure layer
 * (e.g., SystemTimeService using system clock, FixedTimeService for testing).
 * 
 * Domain Layer Rule: This interface only depends on domain types.
 * No framework, infrastructure, or external dependencies allowed.
 */
export interface ITimeService {
  /**
   * Gets the current date and time
   * 
   * This method should return the current date and time according to
   * the system's timezone configuration. For testability, implementations
   * may allow setting a fixed time.
   * 
   * @returns Current Date object representing the current date and time
   */
  now(): Date;

  /**
   * Gets the current date (without time component)
   * 
   * This method should return the current date with time set to midnight (00:00:00).
   * Useful for date-only comparisons and operations.
   * 
   * @returns Current Date object with time set to midnight
   */
  today(): Date;
}
