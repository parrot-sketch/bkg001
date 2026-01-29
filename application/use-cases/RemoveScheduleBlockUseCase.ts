/**
 * Use Case: RemoveScheduleBlockUseCase
 * 
 * Orchestrates removing a schedule block.
 * 
 * Business Purpose:
 * - Doctor/admin removes a block (leave cancelled, surgery rescheduled)
 * - Frees up time for bookings
 * 
 * Clinical Workflow:
 * This is part of the availability management workflow:
 * 1. Doctor/admin identifies block to remove
 * 2. Block is deleted → RemoveScheduleBlockUseCase (this)
 * 3. Time becomes available for bookings
 * 
 * Business Rules:
 * - Block must exist
 * - Only block owner (doctor) or admin can delete
 */

import { IAvailabilityRepository } from '../../domain/interfaces/repositories/IAvailabilityRepository';
import { DomainException } from '../../domain/exceptions/DomainException';
import { PrismaClient } from '@prisma/client';

export class RemoveScheduleBlockUseCase {
  constructor(
    private readonly availabilityRepository: IAvailabilityRepository,
    private readonly prisma: PrismaClient,
  ) {
    if (!availabilityRepository) {
      throw new Error('AvailabilityRepository is required');
    }
    if (!prisma) {
      throw new Error('PrismaClient is required');
    }
  }

  /**
   * Executes the remove schedule block use case
   * 
   * @param blockId - Block ID to remove
   * @param userId - User ID performing the action (for authorization)
   * @param userRole - User role (for authorization)
   * @returns Promise resolving to void
   * @throws DomainException if validation fails
   */
  async execute(blockId: string, userId: string, userRole: string): Promise<void> {
    // Step 1: Get block to verify it exists and check ownership
    const block = await this.prisma.scheduleBlock.findUnique({
      where: { id: blockId },
      select: {
        id: true,
        doctor_id: true,
        created_by: true,
        doctor: {
          select: {
            user_id: true,
          },
        },
      },
    });

    if (!block) {
      throw new DomainException(`Schedule block with ID ${blockId} not found`, {
        blockId,
      });
    }

    // Step 2: Verify authorization (doctor can only delete their own blocks, admin can delete any)
    const isAdmin = userRole === 'ADMIN';
    const isDoctorOwner = block.doctor.user_id === userId;

    if (!isAdmin && !isDoctorOwner) {
      throw new DomainException('Access denied: Only the block owner or admin can delete blocks', {
        blockId,
        userId,
        userRole,
      });
    }

    // Step 3: Delete block via repository
    await this.availabilityRepository.deleteBlock(blockId);
  }
}
