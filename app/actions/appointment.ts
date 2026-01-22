"use server";

import { VitalSignsFormData } from "@/components/dialogs/add-vital-signs";
import db from "@/lib/db";
import { AppointmentSchema, VitalSignsSchema } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { AppointmentStatus } from "@prisma/client";
import { getScheduleAppointmentUseCase } from "@/lib/use-cases";
import { DomainException } from "@/domain/exceptions/DomainException";
import { normalizeAppointmentRequest, isAppointmentRequestLike } from "@/lib/normalize-api-requests";

import type { CreateAppointmentRequest } from '@/types/api-requests';

export async function createNewAppointment(data: CreateAppointmentRequest | Record<string, unknown>) {
  try {
    // Get current user for audit trail
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, msg: "Unauthorized" };
    }

    // Normalize request data (handles both snake_case and camelCase)
    // This ensures type safety while maintaining backward compatibility
    // Always normalize to handle both formats safely
    const normalized = normalizeAppointmentRequest(data as Record<string, unknown>);

    // Validate input data using Zod schema (expects snake_case)
    // Convert normalized camelCase back to snake_case for validation
    const validationInput = {
      doctor_id: normalized.doctorId,
      appointment_date: normalized.appointmentDate,
      time: normalized.time,
      type: normalized.type,
      note: normalized.note,
    };

    const validatedData = AppointmentSchema.safeParse(validationInput);
    if (!validatedData.success) {
      // Return more specific validation errors
      const errors = validatedData.error.errors.map(e => e.message).join(', ');
      return { success: false, msg: errors || "Invalid data" };
    }

    const validated = validatedData.data;

    // Explicitly validate doctor_id is not empty
    if (!validated.doctor_id || validated.doctor_id.trim().length === 0) {
      return { success: false, msg: "Please select a surgeon" };
    }

    // Resolve Patient ID from User ID if needed
    // If patientId is a User ID (when patient is logged in), find the Patient record
    let patientId = normalized.patientId;
    
    // Check if patientId is actually a User ID by trying to find a Patient by user_id
    // If user role is PATIENT, we should use their User ID to find their Patient record
    if (user.role === 'PATIENT') {
      const patient = await db.patient.findUnique({
        where: { user_id: user.userId },
        select: { id: true },
      });
      
      if (patient) {
        patientId = patient.id;
      } else {
        // If no patient record found, try using the provided patientId as-is
        // It might already be a Patient ID
        patientId = normalized.patientId;
      }
    } else {
      // For non-patient users (frontdesk, admin), patientId should already be a Patient ID
      patientId = normalized.patientId;
    }

    // Use ScheduleAppointmentUseCase instead of direct Prisma
    const scheduleAppointmentUseCase = getScheduleAppointmentUseCase();
    
    const result = await scheduleAppointmentUseCase.execute({
      patientId: patientId,
      doctorId: validated.doctor_id,
      appointmentDate: new Date(validated.appointment_date),
      time: validated.time,
      type: validated.type,
      note: validated.note,
    }, user.userId);

    return {
      success: true,
      message: "Appointment booked successfully",
      data: result,
    };
  } catch (error) {
    // Handle domain exceptions
    if (error instanceof DomainException) {
      return { 
        success: false, 
        msg: error.message || "Failed to create appointment" 
      };
    }

    console.error('Error creating appointment:', error);
    return { success: false, msg: "Internal Server Error" };
  }
}
export async function appointmentAction(
  id: string | number,

  status: AppointmentStatus,
  reason: string
) {
  try {
    await db.appointment.update({
      where: { id: Number(id) },
      data: {
        status,
        reason,
      },
    });

    return {
      success: true,
      error: false,
      msg: `Appointment ${status.toLowerCase()} successfully`,
    };
  } catch (error) {
    console.log(error);
    return { success: false, msg: "Internal Server Error" };
  }
}

export async function addVitalSigns(
  data: VitalSignsFormData,
  appointmentId: string,
  doctorId: string
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, msg: "Unauthorized" };
    }

    const validatedData = VitalSignsSchema.parse(data);

    let medicalRecord = null;

    if (!validatedData.medical_id) {
      medicalRecord = await db.medicalRecord.create({
        data: {
          patient_id: validatedData.patient_id,
          appointment_id: Number(appointmentId),
          doctor_id: doctorId,
        },
      });
    }

    const med_id = validatedData.medical_id || medicalRecord?.id;

    await db.vitalSign.create({
      data: {
        patient_id: validatedData.patient_id,
        appointment_id: Number(appointmentId),
        medical_record_id: med_id ? Number(med_id) : null,
        body_temperature: validatedData.body_temperature,
        systolic: validatedData.systolic,
        diastolic: validatedData.diastolic,
        heart_rate: validatedData.heartRate,
        respiratory_rate: validatedData.respiratory_rate,
        oxygen_saturation: validatedData.oxygen_saturation,
        weight: validatedData.weight,
        height: validatedData.height,
        recorded_by: user.userId,
      },
    });

    return {
      success: true,
      msg: "Vital signs added successfully",
    };
  } catch (error) {
    console.log(error);
    return { success: false, msg: "Internal Server Error" };
  }
}
