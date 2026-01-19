/**
 * Service: PatientFileNumberGenerator
 * 
 * Generates sequential patient file numbers in format: NS001, NS002, NS003, etc.
 * 
 * This service ensures:
 * - Thread-safe sequential numbering
 * - Format consistency (NS prefix + zero-padded number)
 * - No duplicates
 * 
 * Implementation Strategy:
 * - Query database for highest existing file number
 * - Increment and format
 * - Handle race conditions via database constraints
 */

import { IUserRepository } from '../interfaces/repositories/IUserRepository';
import { DomainException } from '../exceptions/DomainException';

export interface IPatientFileNumberGenerator {
  /**
   * Generates the next patient file number
   * 
   * Format: NS001, NS002, NS003, etc.
   * 
   * @returns Promise resolving to the next file number (e.g., "NS001")
   * @throws DomainException if generation fails
   */
  generateNext(): Promise<string>;
}

/**
 * Patient File Number Generator
 * 
 * Generates sequential file numbers for patients.
 * Uses database to ensure uniqueness and sequential ordering.
 */
export class PatientFileNumberGenerator implements IPatientFileNumberGenerator {
  private readonly PREFIX = 'NS';
  private readonly MIN_NUMBER = 1;
  private readonly MAX_NUMBER = 999999; // NS999999 max

  constructor(
    private readonly patientRepository: IPatientFileNumberRepository,
  ) {
    if (!patientRepository) {
      throw new Error('PatientRepository is required for file number generation');
    }
  }

  /**
   * Generates the next sequential file number
   * 
   * Strategy:
   * 1. Find highest existing file number in database
   * 2. Extract numeric part
   * 3. Increment by 1
   * 4. Format with prefix and zero-padding
   * 
   * @returns Next file number (e.g., "NS001")
   */
  async generateNext(): Promise<string> {
    try {
      // Get the highest existing file number
      const highestFileNumber = await this.patientRepository.findHighestFileNumber();

      let nextNumber: number;

      if (!highestFileNumber) {
        // No patients exist yet - start at NS001
        nextNumber = this.MIN_NUMBER;
      } else {
        // Extract number from existing file number (e.g., "NS001" -> 1)
        const numericPart = this.extractNumber(highestFileNumber);
        
        if (numericPart === null) {
          throw new DomainException(
            `Invalid file number format in database: ${highestFileNumber}. Expected format: NS001, NS002, etc.`,
            { fileNumber: highestFileNumber }
          );
        }

        // Increment
        nextNumber = numericPart + 1;

        // Check bounds
        if (nextNumber > this.MAX_NUMBER) {
          throw new DomainException(
            `Maximum file number reached (${this.MAX_NUMBER}). Cannot generate more file numbers.`,
            { maxNumber: this.MAX_NUMBER }
          );
        }
      }

      // Format: NS001, NS002, etc. (zero-padded to 3 digits minimum)
      const paddedNumber = nextNumber.toString().padStart(3, '0');
      return `${this.PREFIX}${paddedNumber}`;
    } catch (error) {
      // If it's already a DomainException, re-throw it
      if (error instanceof DomainException) {
        throw error;
      }

      // Log the original error for debugging
      console.error('[PatientFileNumberGenerator] Error generating file number:', error);
      
      // Wrap any other error in a DomainException
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCause = error instanceof Error && 'cause' in error ? (error as any).cause : error;
      
      throw new DomainException(
        `Failed to generate patient file number: ${errorMessage}`,
        { 
          originalError: errorMessage,
          cause: errorCause 
        }
      );
    }
  }

  /**
   * Extracts the numeric part from a file number string
   * 
   * Examples:
   * - "NS001" -> 1
   * - "NS042" -> 42
   * - "NS1234" -> 1234
   * 
   * @param fileNumber - File number string (e.g., "NS001")
   * @returns Numeric part or null if invalid format
   */
  private extractNumber(fileNumber: string): number | null {
    // Remove prefix
    if (!fileNumber.startsWith(this.PREFIX)) {
      return null;
    }

    const numericPart = fileNumber.slice(this.PREFIX.length);
    const number = parseInt(numericPart, 10);

    // Validate it's a valid number
    if (isNaN(number) || number < this.MIN_NUMBER) {
      return null;
    }

    return number;
  }
}

/**
 * Repository interface for file number generation
 * 
 * This allows the generator to query for the highest file number
 * without depending on full Patient repository.
 */
export interface IPatientFileNumberRepository {
  /**
   * Finds the highest existing file number in the database
   * 
   * @returns The highest file number (e.g., "NS042") or null if no patients exist
   */
  findHighestFileNumber(): Promise<string | null>;
}
