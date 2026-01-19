"use server";

import { VitalSignsFormData } from "@/components/dialogs/add-vital-signs";
import db from "@/lib/db";
import { AppointmentSchema, VitalSignsSchema } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { AppointmentStatus } from "@prisma/client";
import { getScheduleAppointmentUseCase } from "@/lib/use-cases";
import { DomainException } from "@/domain/exceptions/DomainException";

export async function createNewAppointment(data: any) {
  try {
    // Get current user for audit trail
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, msg: "Unauthorized" };
    }

    // Validate input data
    const validatedData = AppointmentSchema.safeParse(data);
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
    // If patient_id is a User ID (when patient is logged in), find the Patient record
    let patientId = data.patient_id;
    
    // Check if patient_id is actually a User ID by trying to find a Patient by user_id
    // If user role is PATIENT, we should use their User ID to find their Patient record
    if (user.role === 'PATIENT') {
      const patient = await db.patient.findUnique({
        where: { user_id: user.userId },
        select: { id: true },
      });
      
      if (patient) {
        patientId = patient.id;
      } else {
        // If no patient record found, try using the provided patient_id as-is
        // It might already be a Patient ID
        patientId = data.patient_id;
      }
    } else {
      // For non-patient users (frontdesk, admin), patient_id should already be a Patient ID
      patientId = data.patient_id;
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
