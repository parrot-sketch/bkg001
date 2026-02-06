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
    // 1. Fetch active template and slots
    const template = await this.prisma.availabilityTemplate.findFirst({
      where: { doctor_id: doctorId, is_active: true },
      include: { slots: true }
    });

    // 2. Fetch other entities
    const [overrides, blocks, slotConfig] = await this.prisma.$transaction([
      this.prisma.availabilityOverride.findMany({
        where: { doctor_id: doctorId },
        orderBy: { start_date: 'asc' },
      }),
      this.prisma.scheduleBlock.findMany({
        where: { doctor_id: doctorId },
        orderBy: { start_date: 'asc' },
      }),
      this.prisma.slotConfiguration.findUnique({
        where: { doctor_id: doctorId },
      }),
    ]);

    // 49. Group slots by day of week
    const slots = template?.slots || [];
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Group slots by day index (0-6)
    const slotsByDay = new Map<number, typeof slots>();
    slots.forEach(slot => {
      const daySlots = slotsByDay.get(slot.day_of_week) || [];
      daySlots.push(slot);
      slotsByDay.set(slot.day_of_week, daySlots);
    });

    const workingDays: WorkingDay[] = [];
    const sessions: ScheduleSession[] = [];

    // Process each day
    slotsByDay.forEach((daySlots, dayIndex) => {
      if (daySlots.length === 0) return;

      // Create synthetic WorkingDay ID
      const workingDayId = `wd-${template?.id}-${dayIndex}`;

      // Calculate aggregated start/end time (min/max)
      // Sort slots by start time
      daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

      const startTime = daySlots[0].start_time;
      const endTime = daySlots[daySlots.length - 1].end_time;

      workingDays.push({
        id: workingDayId,
        doctorId: doctorId,
        day: daysOfWeek[dayIndex] || 'Monday',
        startTime,
        endTime,
        isAvailable: true,
        type: daySlots.length === 1 ? (daySlots[0].slot_type || undefined) : 'MIXED' // Heuristic for single vs mixed
      });

      // Create Sessions for each slot
      daySlots.forEach(slot => {
        sessions.push({
          id: slot.id,
          workingDayId: workingDayId, // Link to working day
          startTime: slot.start_time,
          endTime: slot.end_time,
          sessionType: slot.slot_type || 'CLINIC', // Default to CLINIC if null
        });
      });
    });

    // Map overrides without 'any' casting
    const mappedOverrides: AvailabilityOverride[] = overrides.map((ov) => ({
      id: ov.id,
      doctorId: ov.doctor_id,
      startDate: ov.start_date,
      endDate: ov.end_date,
      reason: ov.reason || undefined,
      isBlocked: ov.is_blocked,
      startTime: ov.start_time || undefined,
      endTime: ov.end_time || undefined,
    }));

    return {
      doctorId,
      workingDays,
      sessions, // Now populated!
      overrides: mappedOverrides,
      blocks: blocks.map((b) => ({
        id: b.id,
        doctorId: b.doctor_id,
        startDate: b.start_date,
        endDate: b.end_date,
        startTime: b.start_time || undefined,
        endTime: b.end_time || undefined,
        blockType: b.block_type,
        reason: b.reason || undefined,
        createdBy: b.created_by,
      })),
      breaks: [], // Not supported in current schema
      slotConfiguration: slotConfig ? {
        id: slotConfig.id,
        doctorId: slotConfig.doctor_id,
        defaultDuration: slotConfig.default_duration,
        bufferTime: slotConfig.buffer_time,
        slotInterval: slotConfig.slot_interval,
      } : undefined,
    };
  }

  async getDoctorsAvailability(doctorIds: string[], startDate: Date, endDate: Date): Promise<DoctorAvailability[]> {
    // Basic implementation for build fix - iterating (less efficient but safe)
    const results: DoctorAvailability[] = [];
    for (const id of doctorIds) {
      const avail = await this.getDoctorAvailability(id);
      if (avail) results.push(avail);
    }
    return results;
  }

  async getWorkingDays(doctorId: string): Promise<WorkingDay[]> {
    const template = await this.prisma.availabilityTemplate.findFirst({
      where: { doctor_id: doctorId, is_active: true },
      include: { slots: true }
    });

    const slots = template?.slots || [];
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Group slots by day index (0-6)
    const slotsByDay = new Map<number, typeof slots>();
    slots.forEach(slot => {
      const daySlots = slotsByDay.get(slot.day_of_week) || [];
      daySlots.push(slot);
      slotsByDay.set(slot.day_of_week, daySlots);
    });

    const workingDays: WorkingDay[] = [];

    // Process each day
    slotsByDay.forEach((daySlots, dayIndex) => {
      if (daySlots.length === 0) return;

      // Create synthetic WorkingDay ID
      const workingDayId = `wd-${template?.id}-${dayIndex}`;

      // Calculate aggregated start/end time
      daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));
      const startTime = daySlots[0].start_time;
      const endTime = daySlots[daySlots.length - 1].end_time;

      workingDays.push({
        id: workingDayId,
        doctorId: doctorId,
        day: daysOfWeek[dayIndex] || 'Monday',
        startTime,
        endTime,
        isAvailable: true,
        type: daySlots.length === 1 ? (daySlots[0].slot_type || undefined) : 'MIXED'
      });
    });

    return workingDays;
  }

  async saveWorkingDays(doctorId: string, workingDays: WorkingDay[]): Promise<void> {
    // 1. Find or create template
    let template = await this.prisma.availabilityTemplate.findFirst({
      where: { doctor_id: doctorId, is_active: true }
    });

    if (!template) {
      template = await this.prisma.availabilityTemplate.create({
        data: {
          doctor_id: doctorId,
          name: 'Standard',
          is_active: true
        }
      });
    }

    const daysMap: Record<string, number> = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };

    // 2. Clear existing slots
    await this.prisma.availabilitySlot.deleteMany({
      where: { template_id: template.id }
    });

    // 3. Create new slots
    const slotsData = workingDays.map((wd) => ({
      template_id: template.id,
      day_of_week: daysMap[wd.day] ?? 1,
      start_time: wd.startTime,
      end_time: wd.endTime,
      slot_type: 'CLINIC'
    }));

    if (slotsData.length > 0) {
      await this.prisma.availabilitySlot.createMany({
        data: slotsData
      });
    }
  }

  // Updated signature to use string ID
  async getSessionsForWorkingDay(workingDayId: string): Promise<ScheduleSession[]> {
    // Deprecated/Not Supported in new schema style
    return [];
  }

  // Updated signature to use string ID
  async saveSessionsForWorkingDay(
    workingDayId: string,
    sessions: Omit<ScheduleSession, 'id' | 'workingDayId'>[]
  ): Promise<ScheduleSession[]> {
    return [];
  }

  async deleteSession(sessionId: string): Promise<void> {
    // No-op
  }

  async getOverrides(doctorId: string, startDate: Date, endDate: Date): Promise<AvailabilityOverride[]> {
    const overrides = await this.prisma.availabilityOverride.findMany({
      where: {
        doctor_id: doctorId,
        OR: [{ start_date: { lte: endDate }, end_date: { gte: startDate } }],
      },
      orderBy: { start_date: 'asc' },
    });
    return overrides.map(ov => ({
      id: ov.id, doctorId: ov.doctor_id, startDate: ov.start_date, endDate: ov.end_date,
      reason: ov.reason || undefined, isBlocked: ov.is_blocked,
      startTime: ov.start_time || undefined,
      endTime: ov.end_time || undefined
    }));
  }

  async createOverride(override: Omit<AvailabilityOverride, 'id'>): Promise<AvailabilityOverride> {
    const created = await this.prisma.availabilityOverride.create({
      data: {
        doctor_id: override.doctorId, start_date: override.startDate, end_date: override.endDate,
        reason: override.reason, is_blocked: override.isBlocked,
        start_time: override.startTime || null, end_time: override.endTime || null
      }
    });
    return {
      id: created.id, doctorId: created.doctor_id, startDate: created.start_date, endDate: created.end_date,
      reason: created.reason || undefined, isBlocked: created.is_blocked,
      startTime: created.start_time || undefined, endTime: created.end_time || undefined
    };
  }

  async deleteOverride(overrideId: string): Promise<void> {
    await this.prisma.availabilityOverride.delete({ where: { id: overrideId } });
  }

  async getBreaks(doctorId: string): Promise<AvailabilityBreak[]> {
    // Not supported in schema currently
    return [];
  }

  async createBreak(breakData: Omit<AvailabilityBreak, 'id'>): Promise<AvailabilityBreak> {
    // Stub
    return {
      id: 'stub-id',
      doctorId: breakData.doctorId,
      workingDayId: breakData.workingDayId,
      dayOfWeek: breakData.dayOfWeek,
      startTime: breakData.startTime,
      endTime: breakData.endTime,
      reason: breakData.reason
    };
  }

  async deleteBreak(breakId: string): Promise<void> {
    // No-op
  }

  async getBlocks(doctorId: string, startDate: Date, endDate: Date): Promise<ScheduleBlock[]> {
    const blocks = await this.prisma.scheduleBlock.findMany({
      where: { doctor_id: doctorId, OR: [{ start_date: { lte: endDate }, end_date: { gte: startDate } }] },
      orderBy: { start_date: 'asc' }
    });
    return blocks.map(b => ({
      id: b.id, doctorId: b.doctor_id, startDate: b.start_date, endDate: b.end_date,
      startTime: b.start_time || undefined, endTime: b.end_time || undefined,
      blockType: b.block_type, reason: b.reason || undefined, createdBy: b.created_by
    }));
  }

  async createBlock(block: Omit<ScheduleBlock, 'id'>): Promise<ScheduleBlock> {
    const created = await this.prisma.scheduleBlock.create({
      data: {
        doctor_id: block.doctorId, start_date: block.startDate, end_date: block.endDate,
        start_time: block.startTime || null, end_time: block.endTime || null,
        block_type: block.blockType, reason: block.reason, created_by: block.createdBy
      }
    });
    return {
      id: created.id, doctorId: created.doctor_id, startDate: created.start_date, endDate: created.end_date,
      startTime: created.start_time || undefined, endTime: created.end_time || undefined,
      blockType: created.block_type, reason: created.reason || undefined, createdBy: created.created_by
    };
  }

  async deleteBlock(blockId: string): Promise<void> {
    await this.prisma.scheduleBlock.delete({ where: { id: blockId } });
  }

  async getSlotConfiguration(doctorId: string): Promise<SlotConfiguration | null> {
    const config = await this.prisma.slotConfiguration.findUnique({ where: { doctor_id: doctorId } });
    if (!config) return null;
    return {
      id: config.id, doctorId: config.doctor_id, defaultDuration: config.default_duration,
      bufferTime: config.buffer_time, slotInterval: config.slot_interval
    };
  }

  async saveSlotConfiguration(config: SlotConfiguration): Promise<SlotConfiguration> {
    const saved = await this.prisma.slotConfiguration.upsert({
      where: { doctor_id: config.doctorId },
      create: { doctor_id: config.doctorId, default_duration: config.defaultDuration, buffer_time: config.bufferTime, slot_interval: config.slotInterval },
      update: { default_duration: config.defaultDuration, buffer_time: config.bufferTime, slot_interval: config.slotInterval }
    });
    return {
      id: saved.id, doctorId: saved.doctor_id, defaultDuration: saved.default_duration,
      bufferTime: saved.buffer_time, slotInterval: saved.slot_interval
    };
  }
}
