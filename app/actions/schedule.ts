'use server';

import { db } from '@/lib/db';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { AppointmentStatus } from '@prisma/client';
import { WorkingDay, SlotConfigurationDto } from '@/domain/types/schedule';
import { 
  mapAvailabilitySlotToDomain,
  mapSlotConfigurationToDomain,
  mapSlotConfigurationToDto,
  mapSlotConfigurationDtoToPrisma,
  mapAvailabilityTemplateToDomain,
} from '@/infrastructure/mappers/ScheduleMapper';
import { DoctorScheduleService } from '@/application/services/DoctorScheduleService';

const scheduleService = new DoctorScheduleService(db);

// ============================================================================
// SCHEMAS
// ============================================================================

const MoveAppointmentSchema = z.object({
    appointmentId: z.number(),
    newDate: z.date(), // Scheduled start time
    version: z.number(), // Optimistic lock version
    resourceId: z.string().optional(),
});

const BlockTimeSchema = z.object({
    doctorId: z.string(),
    startDate: z.date(),
    endDate: z.date(),
    reason: z.string().optional(),
    type: z.enum(['LEAVE', 'SURGERY', 'ADMIN', 'EMERGENCY', 'CONFERENCE', 'BURNOUT_PROTECTION']),
});

const UpdateAvailabilitySchema = z.object({
    doctorId: z.string(),
    templateName: z.string().optional().default("Standard"),
    slots: z.array(z.object({
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        type: z.enum(['CLINIC', 'SURGERY', 'ADMIN']).optional(),
    })),
});

const UpdateSlotConfigurationSchema = z.object({
    doctorId: z.string(),
    defaultDuration: z.number().min(15).max(120),
    slotInterval: z.number().min(5).max(60),
    bufferTime: z.number().min(0).max(30),
}).refine(
    (data) => {
        // Prevent extreme overlap: interval should be at least 30% of duration
        if (data.slotInterval < data.defaultDuration * 0.3) {
            return false;
        }
        return true;
    },
    {
        message: "Slot interval is too small relative to duration. This creates excessive overlap.",
        path: ["slotInterval"],
    }
).refine(
    (data) => {
        // For 30+ minute appointments, minimum interval is 10 minutes
        if (data.defaultDuration >= 30 && data.slotInterval < 10) {
            return false;
        }
        return true;
    },
    {
        message: "For 30+ minute appointments, minimum interval is 10 minutes.",
        path: ["slotInterval"],
    }
);

// ============================================================================
// ACTIONS
// ============================================================================

export async function getDoctorSchedule(userId: string, start: Date, end: Date) {
    // RESOLVE DOCTOR ID (since input is likely User ID)
    const doctor = await db.doctor.findUnique({ where: { user_id: userId } });
    const doctorId = doctor ? doctor.id : userId;

    try {
        const [rawData, calendarEvents] = await Promise.all([
            scheduleService.getDoctorSchedule(doctorId, start, end),
            db.calendarEvent.findMany({
                where: {
                    doctor_id: doctorId,
                    status: { not: 'CANCELLED' },
                    OR: [
                        { start_time: { gte: start, lte: end } },
                        { start_time: null }, // Tentative / unscheduled — always show
                    ],
                },
                include: {
                    surgical_case: {
                        select: {
                            id: true,
                            procedure_name: true,
                            status: true,
                            patient: { select: { first_name: true, last_name: true, file_number: true } },
                        },
                    },
                },
                orderBy: { start_time: 'asc' },
            }),
        ]);

        // Map to DTOs for UI compatibility if needed
        const workingDays: WorkingDay[] = rawData.workingDays.map((slot: any) => ({
            dayOfWeek: slot.day_of_week as WorkingDay['dayOfWeek'],
            startTime: slot.start_time,
            endTime: slot.end_time,
            type: (slot.slot_type || 'CLINIC') as WorkingDay['type'],
        }));

        const slotConfigDto: SlotConfigurationDto | null = rawData.slotConfig
            ? mapSlotConfigurationToDto(mapSlotConfigurationToDomain(rawData.slotConfig))
            : null;

        return {
            workingDays,
            overrides: rawData.overrides,
            blocks: rawData.blocks,
            appointments: rawData.appointments,
            surgicalCases: rawData.surgicalCases,
            calendarEvents,
            slotConfig: slotConfigDto,
        };
    } catch (error) {
        console.error('[Action] getDoctorSchedule error:', error);
        throw error;
    }
}

export async function moveAppointment(data: z.infer<typeof MoveAppointmentSchema>) {
    const { appointmentId, newDate, version, resourceId } = MoveAppointmentSchema.parse(data);

    try {
        const result = await scheduleService.moveAppointment({
            appointmentId,
            newDate,
            version,
            resourceId
        });

        revalidatePath('/doctor/schedule');
        return { success: true, newVersion: result.version };
    } catch (error: any) {
        console.error('[Action] moveAppointment error:', error);
        throw error;
    }
}

export async function createBlock(data: z.infer<typeof BlockTimeSchema>) {
    const { doctorId, startDate, endDate, reason, type } = BlockTimeSchema.parse(data);

    try {
        await scheduleService.createBlock({
            doctorId,
            startDate,
            endDate,
            blockType: type,
            reason,
            createdBy: 'system', // TODO: Get from session
        });

        revalidatePath('/doctor/schedule');
        return { success: true };
    } catch (error: any) {
        console.error('[Action] createBlock error:', error);
        throw error;
    }
}

export async function updateAvailability(data: z.infer<typeof UpdateAvailabilitySchema>) {
    const { doctorId: userIdOrDoctorId, slots, templateName } = UpdateAvailabilitySchema.parse(data);

    // Resolve Doctor ID
    const doctor = await db.doctor.findUnique({ where: { user_id: userIdOrDoctorId } });
    const doctorId = doctor ? doctor.id : userIdOrDoctorId;

    try {
        await scheduleService.updateAvailability(doctorId, slots as WorkingDay[], templateName);
        revalidatePath('/doctor/schedule');
        return { success: true };
    } catch (error: any) {
        console.error('[Action] updateAvailability error:', error);
        throw error;
    }
}

export async function updateSlotConfiguration(data: z.infer<typeof UpdateSlotConfigurationSchema>) {
    const validated = UpdateSlotConfigurationSchema.parse(data);
    const { doctorId: userIdOrDoctorId, defaultDuration, slotInterval, bufferTime } = validated;

    // Resolve Doctor ID
    const doctor = await db.doctor.findUnique({ where: { user_id: userIdOrDoctorId } });
    const doctorId = doctor ? doctor.id : userIdOrDoctorId;

    // Additional server-side validation
    const overlapRatio = defaultDuration / slotInterval;
    const slotsPerDuration = Math.ceil(overlapRatio);

    // Hard validation: prevent extreme configurations
    if (slotsPerDuration > 4) {
        throw new Error(
            `Configuration creates ${slotsPerDuration}x overlapping slots, which is too complex. ` +
            `Please increase interval to at least ${Math.ceil(defaultDuration * 0.3)} minutes.`
        );
    }

    // Save to database
    await db.slotConfiguration.upsert({
        where: { doctor_id: doctorId },
        create: {
            doctor_id: doctorId,
            default_duration: defaultDuration,
            slot_interval: slotInterval,
            buffer_time: bufferTime,
        },
        update: {
            default_duration: defaultDuration,
            slot_interval: slotInterval,
            buffer_time: bufferTime,
        },
    });

    revalidatePath('/doctor/schedule');
    return { success: true };
}

