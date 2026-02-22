/**
 * Schedule Mapper
 * 
 * Transforms between Prisma models and domain types for scheduling.
 * Provides type-safe conversion between database and domain layers.
 */

import {
  AvailabilitySlot as DomainAvailabilitySlot,
  SlotConfiguration as DomainSlotConfiguration,
  AvailabilityTemplate as DomainAvailabilityTemplate,
  WorkingDay,
  SlotConfigurationDto,
  CalendarAvailabilitySlot,
  SlotType,
  DayOfWeek,
} from '@/domain/types/schedule';
import {
  AvailabilitySlot as PrismaAvailabilitySlot,
  SlotConfiguration as PrismaSlotConfiguration,
  AvailabilityTemplate as PrismaAvailabilityTemplate,
} from '@prisma/client';

/**
 * Base date for template calendar (Jan 2, 2000 is a Sunday)
 */
const BASE_DATE = new Date(2000, 0, 2);

/**
 * Maps Prisma AvailabilitySlot to domain model
 */
export function mapAvailabilitySlotToDomain(
  slot: PrismaAvailabilitySlot
): DomainAvailabilitySlot {
  return {
    id: slot.id,
    dayOfWeek: slot.day_of_week as DayOfWeek,
    startTime: slot.start_time,
    endTime: slot.end_time,
    slotType: (slot.slot_type || 'CLINIC') as SlotType,
    maxPatients: slot.max_patients ?? undefined,
    createdAt: slot.created_at,
    updatedAt: slot.updated_at,
  };
}

/**
 * Maps domain AvailabilitySlot to Prisma create input
 */
export function mapAvailabilitySlotToPrisma(
  slot: Omit<DomainAvailabilitySlot, 'id' | 'createdAt' | 'updatedAt'>,
  templateId: string
): Omit<PrismaAvailabilitySlot, 'id' | 'created_at' | 'updated_at'> {
  return {
    template_id: templateId,
    day_of_week: slot.dayOfWeek,
    start_time: slot.startTime,
    end_time: slot.endTime,
    slot_type: slot.slotType,
    max_patients: slot.maxPatients ?? null,
  };
}

/**
 * Maps Prisma SlotConfiguration to domain model
 */
export function mapSlotConfigurationToDomain(
  config: PrismaSlotConfiguration
): DomainSlotConfiguration {
  return {
    id: config.id,
    doctorId: config.doctor_id,
    defaultDuration: config.default_duration,
    slotInterval: config.slot_interval,
    bufferTime: config.buffer_time,
    createdAt: config.created_at,
    updatedAt: config.updated_at,
  };
}

/**
 * Maps domain SlotConfiguration to DTO
 */
export function mapSlotConfigurationToDto(
  config: DomainSlotConfiguration
): SlotConfigurationDto {
  return {
    defaultDuration: config.defaultDuration,
    slotInterval: config.slotInterval,
    bufferTime: config.bufferTime,
  };
}

/**
 * Maps DTO to Prisma SlotConfiguration create/update input
 */
export function mapSlotConfigurationDtoToPrisma(
  dto: SlotConfigurationDto,
  doctorId: string
): Omit<PrismaSlotConfiguration, 'id' | 'created_at' | 'updated_at'> {
  return {
    doctor_id: doctorId,
    default_duration: dto.defaultDuration,
    slot_interval: dto.slotInterval,
    buffer_time: dto.bufferTime,
  };
}

/**
 * Maps Prisma AvailabilityTemplate with slots to domain model
 */
export function mapAvailabilityTemplateToDomain(
  template: PrismaAvailabilityTemplate & { slots: PrismaAvailabilitySlot[] }
): DomainAvailabilityTemplate {
  return {
    id: template.id,
    doctorId: template.doctor_id,
    name: template.name,
    isActive: template.is_active,
    slots: template.slots.map(mapAvailabilitySlotToDomain),
    createdAt: template.created_at,
    updatedAt: template.updated_at,
  };
}

/**
 * Maps domain AvailabilitySlot to WorkingDay DTO
 */
export function mapAvailabilitySlotToWorkingDay(
  slot: DomainAvailabilitySlot
): WorkingDay {
  return {
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    type: slot.slotType,
  };
}

/**
 * Maps WorkingDay DTO to domain AvailabilitySlot (for creation)
 */
export function mapWorkingDayToAvailabilitySlot(
  workingDay: WorkingDay,
  templateId: string
): Omit<DomainAvailabilitySlot, 'id' | 'createdAt' | 'updatedAt' | 'maxPatients'> {
  return {
    dayOfWeek: workingDay.dayOfWeek,
    startTime: workingDay.startTime,
    endTime: workingDay.endTime,
    slotType: workingDay.type || 'CLINIC',
  };
}

/**
 * Maps domain AvailabilitySlot to CalendarAvailabilitySlot for react-big-calendar
 */
export function mapAvailabilitySlotToCalendar(
  slot: DomainAvailabilitySlot
): CalendarAvailabilitySlot {
  const dayOffset = slot.dayOfWeek;
  const date = new Date(BASE_DATE);
  date.setDate(BASE_DATE.getDate() + dayOffset);

  const [startH, startM] = slot.startTime.split(':').map(Number);
  const [endH, endM] = slot.endTime.split(':').map(Number);

  const start = new Date(date);
  start.setHours(startH, startM, 0, 0);

  const end = new Date(date);
  end.setHours(endH, endM, 0, 0);

  return {
    id: slot.id,
    title: slot.slotType,
    start,
    end,
    type: slot.slotType,
  };
}

/**
 * Maps WorkingDay array to CalendarAvailabilitySlot array
 */
export function mapWorkingDaysToCalendar(
  workingDays: WorkingDay[]
): CalendarAvailabilitySlot[] {
  return workingDays.map((wd, idx) => {
    const dayOffset = wd.dayOfWeek;
    const date = new Date(BASE_DATE);
    date.setDate(BASE_DATE.getDate() + dayOffset);

    const [startH, startM] = wd.startTime.split(':').map(Number);
    const [endH, endM] = wd.endTime.split(':').map(Number);

    const start = new Date(date);
    start.setHours(startH, startM, 0, 0);

    const end = new Date(date);
    end.setHours(endH, endM, 0, 0);

    return {
      id: `temp-${idx}`,
      title: wd.type || 'CLINIC',
      start,
      end,
      type: (wd.type || 'CLINIC') as SlotType,
    };
  });
}

/**
 * Maps CalendarAvailabilitySlot back to WorkingDay
 */
export function mapCalendarToWorkingDay(
  calendarSlot: CalendarAvailabilitySlot
): WorkingDay {
  const dayOfWeek = calendarSlot.start.getDay() as DayOfWeek;
  const startTime = `${String(calendarSlot.start.getHours()).padStart(2, '0')}:${String(calendarSlot.start.getMinutes()).padStart(2, '0')}`;
  const endTime = `${String(calendarSlot.end.getHours()).padStart(2, '0')}:${String(calendarSlot.end.getMinutes()).padStart(2, '0')}`;

  return {
    dayOfWeek,
    startTime,
    endTime,
    type: calendarSlot.type,
  };
}
