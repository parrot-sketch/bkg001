/**
 * Repository: PrismaPatientFileNumberRepository
 * 
 * Prisma-based implementation for patient file number generation.
 * Queries database to find highest existing file number.
 */

import { PrismaClient } from '@prisma/client';
import { IPatientFileNumberRepository } from '../../../domain/services/PatientFileNumberGenerator';

export class PrismaPatientFileNumberRepository implements IPatientFileNumberRepository {
  constructor(private readonly prisma: PrismaClient) {
    if (!prisma) {
      throw new Error('PrismaClient is required');
    }
  }

  /**
   * Finds the highest existing file number
   * 
   * Strategy:
   * - Query all patients, order by file_number DESC
   * - Extract numeric part, find maximum
   * - Return the highest file number string
   * 
   * @returns Highest file number (e.g., "NS042") or null if no patients exist
   */
  async findHighestFileNumber(): Promise<string | null> {
    try {
      // Get all patients with file numbers, ordered by creation date
      // We'll extract the highest number from file_number field
      // Note: file_number is non-nullable in schema, so no need to filter for null
      const patients = await this.prisma.patient.findMany({
        select: {
          file_number: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (patients.length === 0) {
        return null;
      }

      // Extract numeric parts and find maximum
      let highestNumber = 0;
      let highestFileNumber: string | null = null;

      for (const patient of patients) {
        if (!patient.file_number) continue;

        // Extract number from file number (e.g., "NS001" -> 1)
        const match = patient.file_number.match(/^NS(\d+)$/);
        if (match) {
          const number = parseInt(match[1], 10);
          if (number > highestNumber) {
            highestNumber = number;
            highestFileNumber = patient.file_number;
          }
        }
      }

      return highestFileNumber;
    } catch (error) {
      console.error('Error finding highest file number:', error);
      throw new Error(`Failed to find highest file number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
