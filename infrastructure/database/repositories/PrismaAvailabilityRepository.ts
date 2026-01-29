/**
 * Repository: PrismaAvailabilityRepository
 * 
 * Prisma-based implementation of IAvailabilityRepository.
 * Handles data persistence for availability entities using Prisma ORM.
 */

import { PrismaClient } from '@prisma/client';
import {
  IAvailabilityRepository,
  WorkingDay,
  ScheduleSession,
  ScheduleBlock,
  AvailabilityOverride,
  AvailabilityBreak,
  SlotConfiguration,
  DoctorAvailability,
} from '../../../domain/interfaces/repositories/IAvailabilityRepository';

export class PrismaAvailabilityRepository implements IAvailabilityRepository {
  constructor(private readonly prisma: PrismaClient) {
    if (!prisma) {
      throw new Error('PrismaClient is required');
    }
  }

  async getDoctorAvailability(doctorId: string): Promise<DoctorAvailability | null> {
    const [workingDays, overrides, blocks, breaks, slotConfig] = await Promise.all([
      this.getWorkingDays(doctorId),
      this.getOverrides(doctorId, new Date(0), new Date('2099-12-31')), // Get all overrides
      this.getBlocks(doctorId, new Date(0), new Date('2099-12-31')), // Get all blocks
      this.getBreaks(doctorId),
      this.getSlotConfiguration(doctorId),
    ]);

    // Get all sessions for all working days
    const sessions: ScheduleSession[] = [];
    for (const workingDay of workingDays) {
      const daySessions = await this.getSessionsForWorkingDay(workingDay.id);
      sessions.push(...daySessions);
    }

    return {
      doctorId,
      workingDays,
      sessions,
      overrides,
      blocks,
      breaks,
      slotConfiguration: slotConfig || undefined,
    };
  }

  async getWorkingDays(doctorId: string): Promise<WorkingDay[]> {
    const workingDays = await this.prisma.workingDay.findMany({
      where: { doctor_id: doctorId },
      orderBy: { day: 'asc' },
    });

    return workingDays.map((wd) => ({
      id: wd.id,
      doctorId: wd.doctor_id,
      day: wd.day,
      startTime: wd.start_time,
      endTime: wd.end_time,
      isAvailable: wd.is_available,
    }));
  }

  async saveWorkingDays(doctorId: string, workingDays: WorkingDay[]): Promise<void> {
    // Get existing working days
    const existingWorkingDays = await this.prisma.workingDay.findMany({
      where: { doctor_id: doctorId },
    });

    // Create a map of existing working days by day name
    const existingMap = new Map(existingWorkingDays.map(wd => [wd.day, wd]));

    // Update or create each working day
    for (const wd of workingDays) {
      const existing = existingMap.get(wd.day);
      
      if (existing) {
        // Update existing working day (preserves ID and associated sessions)
        await this.prisma.workingDay.update({
          where: { id: existing.id },
          data: {
            start_time: wd.startTime,
            end_time: wd.endTime,
            is_available: wd.isAvailable,
          },
        });
        existingMap.delete(wd.day); // Mark as processed
      } else {
        // Create new working day
        await this.prisma.workingDay.create({
          data: {
            doctor_id: doctorId,
            day: wd.day,
            start_time: wd.startTime,
            end_time: wd.endTime,
            is_available: wd.isAvailable,
          },
        });
      }
    }

    // Delete working days that are no longer needed
    // (days that were in DB but not in the new workingDays array)
    for (const [day, existing] of existingMap.entries()) {
      await this.prisma.workingDay.delete({
        where: { id: existing.id },
      });
    }
  }

  async getOverrides(doctorId: string, startDate: Date, endDate: Date): Promise<AvailabilityOverride[]> {
    // Check if the model exists in Prisma client
    if (!this.prisma.availabilityOverride) {
      console.error('Prisma client missing availabilityOverride model. Please run: npx prisma generate');
      // Return empty array as fallback
      return [];
    }

    const overrides = await this.prisma.availabilityOverride.findMany({
      where: {
        doctor_id: doctorId,
        OR: [
          {
            start_date: { lte: endDate },
            end_date: { gte: startDate },
          },
        ],
      },
      orderBy: { start_date: 'asc' },
    });

    return overrides.map((ov) => ({
      id: ov.id,
      doctorId: ov.doctor_id,
      startDate: ov.start_date,
      endDate: ov.end_date,
      reason: ov.reason || undefined,
      isBlocked: ov.is_blocked,
      // Type assertion needed because Prisma client may not have been regenerated
      // These fields exist in the schema but may not be in the generated types yet
      startTime: (ov as any).start_time || undefined,
      endTime: (ov as any).end_time || undefined,
    }));
  }

  async createOverride(override: Omit<AvailabilityOverride, 'id'>): Promise<AvailabilityOverride> {
    if (!this.prisma.availabilityOverride) {
      throw new Error('Prisma client missing availabilityOverride model. Please run: npx prisma generate');
    }

    const created = await this.prisma.availabilityOverride.create({
      data: {
        doctor_id: override.doctorId,
        start_date: override.startDate,
        end_date: override.endDate,
        reason: override.reason,
        is_blocked: override.isBlocked,
        // Type assertion needed because Prisma client may not have been regenerated
        // These fields exist in the schema but may not be in the generated types yet
        start_time: override.startTime || null,
        end_time: override.endTime || null,
      } as any,
    });

    return {
      id: created.id,
      doctorId: created.doctor_id,
      startDate: created.start_date,
      endDate: created.end_date,
      reason: created.reason || undefined,
      isBlocked: created.is_blocked,
      // Type assertion needed because Prisma client may not have been regenerated
      startTime: (created as any).start_time || undefined,
      endTime: (created as any).end_time || undefined,
    };
  }

  async deleteOverride(overrideId: string): Promise<void> {
    if (!this.prisma.availabilityOverride) {
      throw new Error('Prisma client missing availabilityOverride model. Please run: npx prisma generate');
    }

    await this.prisma.availabilityOverride.delete({
      where: { id: overrideId },
    });
  }

  async getBreaks(doctorId: string): Promise<AvailabilityBreak[]> {
    // Check if the model exists in Prisma client
    if (!this.prisma.availabilityBreak) {
      console.error('Prisma client missing availabilityBreak model. Please run: npx prisma generate');
      // Return empty array as fallback
      return [];
    }

    const breaks = await this.prisma.availabilityBreak.findMany({
      where: { doctor_id: doctorId },
      orderBy: { start_time: 'asc' },
    });

    return breaks.map((br) => ({
      id: br.id,
      doctorId: br.doctor_id,
      workingDayId: br.working_day_id || undefined,
      dayOfWeek: br.day_of_week || undefined,
      startTime: br.start_time,
      endTime: br.end_time,
      reason: br.reason || undefined,
    }));
  }

  async createBreak(breakData: Omit<AvailabilityBreak, 'id'>): Promise<AvailabilityBreak> {
    if (!this.prisma.availabilityBreak) {
      throw new Error('Prisma client missing availabilityBreak model. Please run: npx prisma generate');
    }

    const created = await this.prisma.availabilityBreak.create({
      data: {
        doctor_id: breakData.doctorId,
        working_day_id: breakData.workingDayId || null,
        day_of_week: breakData.dayOfWeek || null,
        start_time: breakData.startTime,
        end_time: breakData.endTime,
        reason: breakData.reason || null,
      },
    });

    return {
      id: created.id,
      doctorId: created.doctor_id,
      workingDayId: created.working_day_id || undefined,
      dayOfWeek: created.day_of_week || undefined,
      startTime: created.start_time,
      endTime: created.end_time,
      reason: created.reason || undefined,
    };
  }

  async deleteBreak(breakId: string): Promise<void> {
    if (!this.prisma.availabilityBreak) {
      throw new Error('Prisma client missing availabilityBreak model. Please run: npx prisma generate');
    }

    await this.prisma.availabilityBreak.delete({
      where: { id: breakId },
    });
  }

  async getSlotConfiguration(doctorId: string): Promise<SlotConfiguration | null> {
    const config = await this.prisma.slotConfiguration.findUnique({
      where: { doctor_id: doctorId },
    });

    if (!config) {
      return null;
    }

    return {
      id: config.id,
      doctorId: config.doctor_id,
      defaultDuration: config.default_duration,
      bufferTime: config.buffer_time,
      slotInterval: config.slot_interval,
    };
  }

  async saveSlotConfiguration(config: SlotConfiguration): Promise<SlotConfiguration> {
    const saved = await this.prisma.slotConfiguration.upsert({
      where: { doctor_id: config.doctorId },
      create: {
        doctor_id: config.doctorId,
        default_duration: config.defaultDuration,
        buffer_time: config.bufferTime,
        slot_interval: config.slotInterval,
      },
      update: {
        default_duration: config.defaultDuration,
        buffer_time: config.bufferTime,
        slot_interval: config.slotInterval,
      },
    });

    return {
      id: saved.id,
      doctorId: saved.doctor_id,
      defaultDuration: saved.default_duration,
      bufferTime: saved.buffer_time,
      slotInterval: saved.slot_interval,
    };
  }

  async getSessionsForWorkingDay(workingDayId: number): Promise<ScheduleSession[]> {
    const sessions = await this.prisma.scheduleSession.findMany({
      where: { working_day_id: workingDayId },
      orderBy: { start_time: 'asc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      workingDayId: s.working_day_id,
      startTime: s.start_time,
      endTime: s.end_time,
      sessionType: s.session_type || undefined,
      maxPatients: s.max_patients || undefined,
      notes: s.notes || undefined,
    }));
  }

  async saveSessionsForWorkingDay(
    workingDayId: number,
    sessions: Omit<ScheduleSession, 'id' | 'workingDayId'>[]
  ): Promise<ScheduleSession[]> {
    // Delete existing sessions
    await this.prisma.scheduleSession.deleteMany({
      where: { working_day_id: workingDayId },
    });

    // Create new sessions
    await this.prisma.scheduleSession.createMany({
      data: sessions.map((s) => ({
        working_day_id: workingDayId,
        start_time: s.startTime,
        end_time: s.endTime,
        session_type: s.sessionType || null,
        max_patients: s.maxPatients || null,
        notes: s.notes || null,
      })),
    });

    // Return created sessions
    return this.getSessionsForWorkingDay(workingDayId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.prisma.scheduleSession.delete({
      where: { id: sessionId },
    });
  }

  async getBlocks(doctorId: string, startDate: Date, endDate: Date): Promise<ScheduleBlock[]> {
    const blocks = await this.prisma.scheduleBlock.findMany({
      where: {
        doctor_id: doctorId,
        OR: [
          {
            start_date: { lte: endDate },
            end_date: { gte: startDate },
          },
        ],
      },
      orderBy: { start_date: 'asc' },
    });

    return blocks.map((b) => ({
      id: b.id,
      doctorId: b.doctor_id,
      startDate: b.start_date,
      endDate: b.end_date,
      startTime: b.start_time || undefined,
      endTime: b.end_time || undefined,
      blockType: b.block_type,
      reason: b.reason || undefined,
      createdBy: b.created_by,
    }));
  }

  async createBlock(block: Omit<ScheduleBlock, 'id'>): Promise<ScheduleBlock> {
    const created = await this.prisma.scheduleBlock.create({
      data: {
        doctor_id: block.doctorId,
        start_date: block.startDate,
        end_date: block.endDate,
        start_time: block.startTime || null,
        end_time: block.endTime || null,
        block_type: block.blockType,
        reason: block.reason || null,
        created_by: block.createdBy,
      },
    });

    return {
      id: created.id,
      doctorId: created.doctor_id,
      startDate: created.start_date,
      endDate: created.end_date,
      startTime: created.start_time || undefined,
      endTime: created.end_time || undefined,
      blockType: created.block_type,
      reason: created.reason || undefined,
      createdBy: created.created_by,
    };
  }

  async deleteBlock(blockId: string): Promise<void> {
    await this.prisma.scheduleBlock.delete({
      where: { id: blockId },
    });
  }
}
