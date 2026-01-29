/**
 * Use Case: AddScheduleBlockUseCase
 * 
 * Orchestrates creating a schedule block (leave, surgery, admin, etc.).
 * 
 * Business Purpose:
 * - Doctor blocks time periods (leave, surgery, emergency duty)
 * - Admin blocks time for doctors (conferences, training)
 * - Prevents bookings during blocked periods
 * 
 * Clinical Workflow:
 * This is part of the availability management workflow:
 * 1. Doctor/admin identifies need to block time
 * 2. Block is created → AddScheduleBlockUseCase (this)
 * 3. Future bookings respect the block
 * 
 * Business Rules:
 * - Doctor must exist
 * - Date range must be valid (start <= end)
 * - If custom hours provided, both startTime and endTime required
 * - Custom hours only allowed for single-day blocks
 * - Block type must be valid
 */

import { IAvailabilityRepository } from '../../domain/interfaces/repositories/IAvailabilityRepository';
import { CreateScheduleBlockDto, ScheduleBlockResponseDto } from '../dtos/ScheduleBlockDto';
import { DomainException } from '../../domain/exceptions/DomainException';
import { PrismaClient } from '@prisma/client';
import {
  dateRangesOverlap,
  timeRangesOverlap,
  timeToMinutes,
  isFullDayBlock,
  isSameDay,
  dateInRange,
} from '../validators/ScheduleValidationHelpers';

const VALID_BLOCK_TYPES = [
  'LEAVE',
  'SURGERY',
  'ADMIN',
  'EMERGENCY',
  'CONFERENCE',
  'BURNOUT_PROTECTION',
  'TRAINING',
  'OTHER',
];

export class AddScheduleBlockUseCase {
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
   * Executes the add schedule block use case
   * 
   * @param dto - CreateScheduleBlockDto with block data
   * @returns Promise resolving to ScheduleBlockResponseDto
   * @throws DomainException if validation fails
   */
  async execute(dto: CreateScheduleBlockDto): Promise<ScheduleBlockResponseDto> {
    // Step 1: Validate doctor exists
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
      select: { id: true },
    });

    if (!doctor) {
      throw new DomainException(`Doctor with ID ${dto.doctorId} not found`, {
        doctorId: dto.doctorId,
      });
    }

    // Step 2: Validate dates
    const startDate = new Date(dto.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new DomainException('Invalid date format', {
        startDate: dto.startDate,
        endDate: dto.endDate,
      });
    }

    if (startDate > endDate) {
      throw new DomainException('Start date must be before or equal to end date', {
        startDate: dto.startDate,
        endDate: dto.endDate,
      });
    }

    // Step 3: Validate block type
    if (!VALID_BLOCK_TYPES.includes(dto.blockType)) {
      throw new DomainException(
        `Invalid block type: ${dto.blockType}. Must be one of: ${VALID_BLOCK_TYPES.join(', ')}`,
        { blockType: dto.blockType }
      );
    }

    // Step 4: Validate custom hours (if provided)
    const isSingleDay = startDate.toISOString().split('T')[0] === endDate.toISOString().split('T')[0];
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/; // HH:mm format

    if (dto.startTime || dto.endTime) {
      if (!isSingleDay) {
        throw new DomainException('Custom hours can only be set for single-day blocks', {
          startDate: dto.startDate,
          endDate: dto.endDate,
        });
      }

      if (!dto.startTime || !dto.endTime) {
        throw new DomainException('Both startTime and endTime must be provided for custom hours', {
          startTime: dto.startTime,
          endTime: dto.endTime,
        });
      }

      if (!timeRegex.test(dto.startTime) || !timeRegex.test(dto.endTime)) {
        throw new DomainException('Time must be in HH:mm format', {
          startTime: dto.startTime,
          endTime: dto.endTime,
        });
      }

      // Validate end time is after start time
      const [startHours, startMinutes] = dto.startTime.split(':').map(Number);
      const [endHours, endMinutes] = dto.endTime.split(':').map(Number);
      const startTotal = startHours * 60 + startMinutes;
      const endTotal = endHours * 60 + endMinutes;

      if (endTotal <= startTotal) {
        throw new DomainException('End time must be after start time', {
          startTime: dto.startTime,
          endTime: dto.endTime,
        });
      }
    }

    // Step 5: Validate block doesn't overlap with existing blocks
    // Rules:
    // - Full-day block prevents any partial blocks on overlapping dates
    // - Partial blocks cannot overlap with other partial blocks
    // - Partial blocks cannot overlap with full-day blocks
    const existingBlocks = await this.availabilityRepository.getBlocks(
      dto.doctorId,
      startDate,
      endDate
    );

    const newBlockIsFullDay = isFullDayBlock({ startTime: dto.startTime, endTime: dto.endTime });
    const newBlockStartTime = dto.startTime ? timeToMinutes(dto.startTime) : null;
    const newBlockEndTime = dto.endTime ? timeToMinutes(dto.endTime) : null;

    for (const existingBlock of existingBlocks) {
      const existingIsFullDay = isFullDayBlock({
        startTime: existingBlock.startTime || null,
        endTime: existingBlock.endTime || null,
      });

      // Check if date ranges overlap
      if (
        dateRangesOverlap(
          startDate,
          endDate,
          existingBlock.startDate,
          existingBlock.endDate
        )
      ) {
        // Rule 3: Full-day block prevents any partial blocks on same date
        if (newBlockIsFullDay && !existingIsFullDay) {
          throw new DomainException(
            `Cannot create full-day block: A partial block already exists on overlapping dates (${existingBlock.startDate.toISOString().split('T')[0]} - ${existingBlock.endDate.toISOString().split('T')[0]})`,
            {
              existingBlock: {
                id: existingBlock.id,
                startDate: existingBlock.startDate,
                endDate: existingBlock.endDate,
                startTime: existingBlock.startTime,
                endTime: existingBlock.endTime,
                blockType: existingBlock.blockType,
              },
              newBlock: {
                startDate: dto.startDate,
                endDate: dto.endDate,
                startTime: dto.startTime,
                endTime: dto.endTime,
              },
            }
          );
        }

        // Rule 3: Full-day block prevents any partial blocks on same date (reverse)
        if (!newBlockIsFullDay && existingIsFullDay) {
          throw new DomainException(
            `Cannot create partial block: A full-day block already exists on overlapping dates (${existingBlock.startDate.toISOString().split('T')[0]} - ${existingBlock.endDate.toISOString().split('T')[0]})`,
            {
              existingBlock: {
                id: existingBlock.id,
                startDate: existingBlock.startDate,
                endDate: existingBlock.endDate,
                blockType: existingBlock.blockType,
              },
              newBlock: {
                startDate: dto.startDate,
                endDate: dto.endDate,
                startTime: dto.startTime,
                endTime: dto.endTime,
              },
            }
          );
        }

        // Rule 4: Partial blocks cannot overlap with other partial blocks
        // Check time overlap only if blocks share at least one calendar day
        if (!newBlockIsFullDay && !existingIsFullDay) {
          const existingStartTime = existingBlock.startTime
            ? timeToMinutes(existingBlock.startTime)
            : null;
          const existingEndTime = existingBlock.endTime
            ? timeToMinutes(existingBlock.endTime)
            : null;

          // Check if blocks share any calendar day
          const existingStart = new Date(existingBlock.startDate);
          existingStart.setHours(0, 0, 0, 0);
          const existingEnd = new Date(existingBlock.endDate);
          existingEnd.setHours(23, 59, 59, 999);

          // Iterate through each day in the new block's range
          const checkDate = new Date(startDate);
          while (checkDate <= endDate) {
            if (dateInRange(checkDate, existingStart, existingEnd)) {
              // Blocks share this day - check if time ranges overlap
              if (
                newBlockStartTime !== null &&
                newBlockEndTime !== null &&
                existingStartTime !== null &&
                existingEndTime !== null &&
                timeRangesOverlap(
                  newBlockStartTime,
                  newBlockEndTime,
                  existingStartTime,
                  existingEndTime
                )
              ) {
                throw new DomainException(
                  `Cannot create block: Time range overlaps with existing block (${existingBlock.startTime}-${existingBlock.endTime} on ${checkDate.toISOString().split('T')[0]})`,
                  {
                    existingBlock: {
                      id: existingBlock.id,
                      startDate: existingBlock.startDate,
                      endDate: existingBlock.endDate,
                      startTime: existingBlock.startTime,
                      endTime: existingBlock.endTime,
                      blockType: existingBlock.blockType,
                    },
                    newBlock: {
                      startDate: dto.startDate,
                      endDate: dto.endDate,
                      startTime: dto.startTime,
                      endTime: dto.endTime,
                    },
                    conflictingDate: checkDate.toISOString().split('T')[0],
                  }
                );
              }
            }
            // Move to next day
            checkDate.setDate(checkDate.getDate() + 1);
          }
        }

        // Rule 2: Full-day blocks cannot overlap (both are full day)
        if (newBlockIsFullDay && existingIsFullDay) {
          throw new DomainException(
            `Cannot create block: A full-day block already exists on overlapping dates (${existingBlock.startDate.toISOString().split('T')[0]} - ${existingBlock.endDate.toISOString().split('T')[0]})`,
            {
              existingBlock: {
                id: existingBlock.id,
                startDate: existingBlock.startDate,
                endDate: existingBlock.endDate,
                blockType: existingBlock.blockType,
              },
              newBlock: {
                startDate: dto.startDate,
                endDate: dto.endDate,
              },
            }
          );
        }
      }
    }

    // Step 6: Create block via repository
    const block = await this.availabilityRepository.createBlock({
      doctorId: dto.doctorId,
      startDate,
      endDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      blockType: dto.blockType,
      reason: dto.reason,
      createdBy: dto.createdBy,
    });

    // Step 6: Return response DTO
    return {
      id: block.id,
      doctorId: block.doctorId,
      startDate: block.startDate,
      endDate: block.endDate,
      startTime: block.startTime,
      endTime: block.endTime,
      blockType: block.blockType,
      reason: block.reason,
      createdBy: block.createdBy,
      createdAt: new Date(), // Repository doesn't return this, but we can fetch if needed
      updatedAt: new Date(),
    };
  }
}
