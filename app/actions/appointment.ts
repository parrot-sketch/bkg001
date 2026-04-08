"use server";

import { VitalSignsFormData } from "@/components/dialogs/add-vital-signs";
import db from "@/lib/db";
import { AppointmentSchema, VitalSignsSchema } from "@/lib/schema";
import { getCurrentUser, getCurrentUserFull } from "@/lib/auth/server-auth";
import { revalidateDoctorDashboard } from '@/actions/doctor/get-dashboard-data';
import { revalidateFrontdeskDashboard } from '@/actions/frontdesk/get-dashboard-data';
import { revalidateNurseDashboard } from '@/actions/nurse/get-dashboard-data';
import { revalidatePath } from 'next/cache';
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

/**
 * Mark an appointment as no-show (manual action by frontdesk)
 */
export async function markNoShow(appointmentId: number, reason?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, msg: "Unauthorized" };
    }

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
        doctor: {
          select: { id: true, user_id: true, name: true },
        },
      },
    });

    if (!appointment) {
      return { success: false, msg: "Appointment not found" };
    }

    // Check if appointment can be marked as no-show
    const validStatuses: AppointmentStatus[] = [
      AppointmentStatus.PENDING,
      AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
      AppointmentStatus.SCHEDULED,
      AppointmentStatus.CONFIRMED,
    ];

    if (!validStatuses.includes(appointment.status)) {
      return { success: false, msg: `Cannot mark appointment with status ${appointment.status} as no-show` };
    }

    // Get full user for name
    const fullUser = await getCurrentUserFull();
    
    // Update appointment to NO_SHOW
    const updated = await db.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.NO_SHOW,
        no_show: true,
        no_show_at: new Date(),
        marked_no_show_at: new Date(),
        no_show_reason: reason || null,
        no_show_notes: `Manually marked as no-show by ${fullUser?.first_name || 'Staff'} ${fullUser?.last_name || ''}`,
        status_changed_at: new Date(),
        status_changed_by: user.userId,
      },
    });

    // Send notifications
    const { sendNoShowNotification } = await import('@/domain/utils/notification-helpers');
    await sendNoShowNotification({
      appointmentId: appointment.id,
      patientName: `${appointment.patient.first_name} ${appointment.patient.last_name}`,
      patientId: appointment.patient.id,
      patientEmail: appointment.patient.email,
      doctorId: appointment.doctor.id,
      doctorUserId: appointment.doctor.user_id,
      doctorName: appointment.doctor.name,
      appointmentTime: appointment.time,
      appointmentDate: appointment.appointment_date,
      isAutomatic: false,
    });

    return { success: true, msg: "Appointment marked as no-show", appointment: updated };
  } catch (error) {
    console.error('[markNoShow]', error);
    return { success: false, msg: "Internal Server Error" };
  }
}

/**
 * Reinstate a no-show appointment (patient arrives late, same day only)
 */
export async function reinstateAppointment(appointmentId: number) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, msg: "Unauthorized" };
    }

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: { id: true, first_name: true, last_name: true },
        },
        doctor: {
          select: { id: true, user_id: true, name: true },
        },
      },
    });

    if (!appointment) {
      return { success: false, msg: "Appointment not found" };
    }

    // Check if appointment is NO_SHOW
    if (appointment.status !== AppointmentStatus.NO_SHOW) {
      return { success: false, msg: "Only no-show appointments can be reinstated" };
    }

    // Check if same day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDay = new Date(appointment.appointment_date);
    appointmentDay.setHours(0, 0, 0, 0);

    if (appointmentDay.getTime() !== today.getTime()) {
      return { success: false, msg: "Can only reinstate same-day appointments" };
    }

    // Get full user for name
    const fullUser = await getCurrentUserFull();

    // Update back to CONFIRMED
    const updated = await db.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.CONFIRMED,
        no_show: false,
        no_show_at: null,
        marked_no_show_at: null,
        no_show_reason: null,
        no_show_notes: `Reinstated by ${fullUser?.first_name || 'Staff'} ${fullUser?.last_name || ''} on ${new Date().toISOString()}`,
        status_changed_at: new Date(),
        status_changed_by: user.userId,
      },
    });

    // Send reinstatement notifications
    const { sendReinstatementNotification } = await import('@/domain/utils/notification-helpers');
    await sendReinstatementNotification({
      appointmentId: appointment.id,
      patientName: `${appointment.patient.first_name} ${appointment.patient.last_name}`,
      patientId: appointment.patient.id,
      doctorUserId: appointment.doctor.user_id,
      doctorName: appointment.doctor.name,
      appointmentTime: appointment.time,
    });

    return { success: true, msg: "Appointment reinstated", appointment: updated };
  } catch (error) {
    console.error('[reinstateAppointment]', error);
    return { success: false, msg: "Internal Server Error" };
  }
}

export async function assignPatientToQueue(data: {
  patientId: string;
  doctorId: string;
  appointmentId?: number;
  notes?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, msg: "Unauthorized" };
    }

    if (user.role !== 'FRONTDESK' && user.role !== 'ADMIN') {
      return { success: false, msg: "Only frontdesk staff can assign patients to queue" };
    }

    const { patientId, doctorId, appointmentId, notes } = data;

    if (!patientId || !doctorId) {
      return { success: false, msg: "Patient ID and Doctor ID are required" };
    }

    // Check if patient exists
    const patient = await db.patient.findUnique({
      where: { id: patientId },
      select: { id: true, first_name: true, last_name: true },
    });

    if (!patient) {
      return { success: false, msg: "Patient not found" };
    }

    // Check if doctor exists
    const doctor = await db.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, user_id: true, name: true },
    });

    if (!doctor) {
      return { success: false, msg: "Doctor not found" };
    }

    // Check for existing active queue entry
    if (appointmentId) {
      const existingQueue = await db.patientQueue.findFirst({
        where: {
          appointment_id: appointmentId,
          status: { in: ['WAITING', 'IN_CONSULTATION'] },
        },
      });

      if (existingQueue) {
        return { success: false, msg: "Patient is already in a queue for this appointment" };
      }
    } else {
      // For walk-ins, check if patient already has an active queue entry
      const existingWalkInQueue = await db.patientQueue.findFirst({
        where: {
          patient_id: patientId,
          status: { in: ['WAITING', 'IN_CONSULTATION'] },
          appointment_id: null,
        },
      });

      if (existingWalkInQueue) {
        return { success: false, msg: "Patient already has an active queue entry" };
      }
    }

    // For walk-ins (no appointment), create a placeholder appointment
    // This ensures the consultation room can work with walk-ins
    // Use CHECKED_IN status so the patient appears for triage (vitals recording)
    // before being ready for consultation
    let finalAppointmentId = appointmentId;
    
    if (!appointmentId) {
      const walkInAppointment = await db.appointment.create({
        data: {
          patient_id: patientId,
          doctor_id: doctorId,
          appointment_date: new Date(),
          time: new Date().toTimeString().slice(0, 5),
          type: 'Walk-in',
          status: AppointmentStatus.CHECKED_IN, // Start with CHECKED_IN for triage
          source: 'FRONTDESK_SCHEDULED',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      finalAppointmentId = walkInAppointment.id;
    } else {
      // For existing appointments, ensure they have CHECKED_IN status for triage
      // If already READY_FOR_CONSULTATION, keep as is (already triaged)
      const existingAppointment = await db.appointment.findUnique({
        where: { id: appointmentId },
        select: { status: true },
      });
      if (existingAppointment && existingAppointment.status === AppointmentStatus.CONFIRMED) {
        await db.appointment.update({
          where: { id: appointmentId },
          data: { status: AppointmentStatus.CHECKED_IN },
        });
      }
    }

    // Create queue entry
    const queueEntry = await db.patientQueue.create({
      data: {
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_id: finalAppointmentId,
        status: 'WAITING',
        added_by: user.userId,
        notes,
      },
      include: {
        patient: { select: { id: true, first_name: true, last_name: true, file_number: true } },
        doctor: { select: { id: true, name: true, user_id: true } },
        appointment: { select: { id: true, time: true, appointment_date: true } },
      },
    });

    // DO NOT update appointment status here
    // Status transition should happen via nurse's vitals recording (CHECKED_IN → READY_FOR_CONSULTATION)
    // This ensures patients go through triage before being ready for doctor consultation
    // The RecordVitalSignsUseCase handles the status transition when nurse records vitals

    // Send notification to doctor
    const { sendPatientQueuedNotification } = await import('@/domain/utils/notification-helpers');
    await sendPatientQueuedNotification({
      patientName: `${patient.first_name} ${patient.last_name}`,
      patientId: patient.id,
      doctorUserId: doctor.user_id,
      doctorName: doctor.name,
      appointmentTime: (appointmentId && queueEntry.appointment?.time) ? queueEntry.appointment.time : 'Walk-in',
    });

    // Invalidate doctor dashboard cache so queue updates instantly
    await revalidateDoctorDashboard(doctorId);
    // Invalidate frontdesk dashboard cache so live queue board updates
    await revalidateFrontdeskDashboard();
    // Invalidate nurse dashboard cache so clinical queue updates
    await revalidateNurseDashboard();
    // Revalidate nurse patients page path to ensure fresh data
    revalidatePath('/nurse/patients', 'page');

    return { success: true, msg: "Patient added to queue", queueEntry };
  } catch (error) {
    console.error('[assignPatientToQueue]', error);
    return { success: false, msg: "Internal Server Error" };
  }
}

export async function removeFromQueue(queueId: number, reason?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, msg: "Unauthorized" };
    }

    if (user.role !== 'FRONTDESK' && user.role !== 'ADMIN') {
      return { success: false, msg: "Only frontdesk staff can remove patients from queue" };
    }

    const queueEntry = await db.patientQueue.findUnique({
      where: { id: queueId },
      include: {
        patient: { select: { id: true, first_name: true, last_name: true } },
        doctor: { select: { id: true, name: true, user_id: true } },
        appointment: { select: { id: true } },
      },
    });

    if (!queueEntry) {
      return { success: false, msg: "Queue entry not found" };
    }

    if (queueEntry.status === 'REMOVED') {
      return { success: false, msg: "Patient already removed from queue" };
    }

    // Update queue entry
    const updated = await db.patientQueue.update({
      where: { id: queueId },
      data: {
        status: 'REMOVED',
        removed_at: new Date(),
        removed_by: user.userId,
        removal_reason: reason,
      },
    });

    // Update appointment status back to CHECKED_IN
    if (queueEntry.appointment) {
      await db.appointment.update({
        where: { id: queueEntry.appointment.id },
        data: {
          status: AppointmentStatus.CHECKED_IN,
          status_changed_at: new Date(),
          status_changed_by: user.userId,
        },
      });
    }

    // Send notification to doctor
    const { sendPatientRemovedFromQueueNotification } = await import('@/domain/utils/notification-helpers');
    await sendPatientRemovedFromQueueNotification({
      patientName: `${queueEntry.patient.first_name} ${queueEntry.patient.last_name}`,
      doctorUserId: queueEntry.doctor.user_id,
      doctorName: queueEntry.doctor.name,
      reason,
    });

    // Invalidate doctor dashboard cache so queue updates instantly
    await revalidateDoctorDashboard(queueEntry.doctor.id);
    // Invalidate frontdesk dashboard cache so live queue board updates
    await revalidateFrontdeskDashboard();

    return { success: true, msg: "Patient removed from queue", queueEntry: updated };
  } catch (error) {
    console.error('[removeFromQueue]', error);
    return { success: false, msg: "Internal Server Error" };
  }
}

export async function reassignQueue(queueId: number, newDoctorId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, msg: "Unauthorized" };
    }

    if (user.role !== 'FRONTDESK' && user.role !== 'ADMIN') {
      return { success: false, msg: "Only frontdesk staff can reassign patients" };
    }

    const queueEntry = await db.patientQueue.findUnique({
      where: { id: queueId },
      include: {
        patient: { select: { id: true, first_name: true, last_name: true } },
        doctor: { select: { id: true, name: true, user_id: true } },
        appointment: { select: { id: true, doctor_id: true } },
      },
    });

    if (!queueEntry) {
      return { success: false, msg: "Queue entry not found" };
    }

    if (queueEntry.status !== 'WAITING') {
      return { success: false, msg: "Can only reassign patients who are waiting" };
    }

    // Check if new doctor exists
    const newDoctor = await db.doctor.findUnique({
      where: { id: newDoctorId },
      select: { id: true, user_id: true, name: true },
    });

    if (!newDoctor) {
      return { success: false, msg: "New doctor not found" };
    }

    if (newDoctorId === queueEntry.doctor_id) {
      return { success: false, msg: "Patient is already assigned to this doctor" };
    }

    const oldDoctor = queueEntry.doctor;

    // Update queue entry with new doctor
    const updated = await db.patientQueue.update({
      where: { id: queueId },
      data: {
        doctor_id: newDoctorId,
      },
      include: {
        patient: { select: { id: true, first_name: true, last_name: true } },
        doctor: { select: { id: true, name: true, user_id: true } },
      },
    });

    // Update appointment's assigned doctor if applicable
    if (queueEntry.appointment) {
      await db.appointment.update({
        where: { id: queueEntry.appointment.id },
        data: {
          doctor_id: newDoctorId,
          status_changed_at: new Date(),
          status_changed_by: user.userId,
        },
      });
    }

    // Notify new doctor
    const { sendPatientQueuedNotification } = await import('@/domain/utils/notification-helpers');
    await sendPatientQueuedNotification({
      patientName: `${queueEntry.patient.first_name} ${queueEntry.patient.last_name}`,
      patientId: queueEntry.patient.id,
      doctorUserId: newDoctor.user_id,
      doctorName: newDoctor.name,
      appointmentTime: queueEntry.appointment?.id ? 'Reassigned' : 'Walk-in',
    });

    // Notify old doctor
    const { sendPatientReassignedNotification } = await import('@/domain/utils/notification-helpers');
    await sendPatientReassignedNotification({
      patientName: `${queueEntry.patient.first_name} ${queueEntry.patient.last_name}`,
      oldDoctorUserId: oldDoctor.user_id,
      oldDoctorName: oldDoctor.name,
      newDoctorName: newDoctor.name,
    });

    // Invalidate dashboard caches for BOTH old and new doctor
    await Promise.all([
      revalidateDoctorDashboard(oldDoctor.id),
      revalidateDoctorDashboard(newDoctorId)
    ]);
    // Invalidate frontdesk dashboard cache so live queue board updates
    await revalidateFrontdeskDashboard();

    return { success: true, msg: "Patient reassigned successfully", queueEntry: updated };
  } catch (error) {
    console.error('[reassignQueue]', error);
    return { success: false, msg: "Internal Server Error" };
  }
}

export async function walkInCheckIn(patientId: string, notes?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, msg: "Unauthorized" };
    }

    if (user.role !== 'FRONTDESK' && user.role !== 'ADMIN') {
      return { success: false, msg: "Only frontdesk staff can check in walk-in patients" };
    }

    if (!patientId) {
      return { success: false, msg: "Patient ID is required" };
    }

    // Check if patient exists
    const patient = await db.patient.findUnique({
      where: { id: patientId },
      select: { id: true, first_name: true, last_name: true, file_number: true },
    });

    if (!patient) {
      return { success: false, msg: "Patient not found. Please register the patient first." };
    }

    // Check if patient already has an active check-in (has a CHECKED_IN appointment for today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingCheckIn = await db.appointment.findFirst({
      where: {
        patient_id: patientId,
        status: AppointmentStatus.CHECKED_IN,
        appointment_date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (existingCheckIn) {
      return { 
        success: false, 
        msg: "Patient already checked in today. They may be in the waiting area or with a doctor.",
        checkedInAppointment: existingCheckIn,
      };
    }

    // Check if patient already has an active queue entry (WAITING or IN_CONSULTATION)
    const existingQueue = await db.patientQueue.findFirst({
      where: {
        patient_id: patientId,
        status: { in: ['WAITING', 'IN_CONSULTATION'] },
      },
      include: {
        doctor: { select: { name: true } },
      },
    });

    if (existingQueue) {
      return { 
        success: false, 
        msg: `Patient is already in ${existingQueue.doctor.name}'s queue`,
        queueEntry: existingQueue,
      };
    }

    // Walk-in doesn't create an appointment - they're just checked in as a walk-in
    // The appointment_id will be null in the patient_queue table for walk-ins
    // The patient will appear in "Checked In - Awaiting Assignment" panel

    return {
      success: true,
      msg: "Walk-in patient checked in successfully",
      patient,
      requiresQueueAssignment: true,
    };
  } catch (error) {
    console.error('[walkInCheckIn]', error);
    return { success: false, msg: "Internal Server Error" };
  }
}
