"use server";

import db from "@/lib/db";
import { PatientFormSchema } from "@/lib/schema";
import { Role } from "@/domain/enums/Role";
import { UserProfileService } from "@/lib/services/user-profile-service";
import type { UpdatePatientRequest, CreatePatientRequest } from '@/types/api-requests';

export async function updatePatient(data: UpdatePatientRequest, pid: string) {
  try {
    const validateData = PatientFormSchema.safeParse(data);

    if (!validateData.success) {
      return {
        success: false,
        error: true,
        msg: "Provide all required fields",
      };
    }

    const patientData = validateData.data;

    // Update user in database
    await db.user.update({
      where: { id: pid },
      data: {
        first_name: patientData.first_name,
        last_name: patientData.last_name,
        email: patientData.email,
      },
    });

    await db.patient.update({
      data: {
        ...patientData,
      },
      where: { id: pid },
    });

    return {
      success: true,
      error: false,
      msg: "Patient info updated successfully",
    };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: true, msg: error?.message };
  }
}
export async function createNewPatient(data: CreatePatientRequest, pid: string) {
  try {
    const validateData = PatientFormSchema.safeParse(data);

    if (!validateData.success) {
      return {
        success: false,
        error: true,
        msg: "Provide all required fields",
      };
    }

    const patientData = validateData.data;

    if (pid === "new-patient") {
      // Create new user and patient profile
      const userProfileService = new UserProfileService(db);
      
      // Use phone as default password if no password provided
      // Password is not in PatientFormSchema, so get it from raw data
      const password = (data as any).password || patientData.phone || 'defaultPassword123';

      const { user, patient } = await userProfileService.createUserWithPatient({
        email: patientData.email,
        password,
        firstName: patientData.first_name,
        lastName: patientData.last_name,
        phone: patientData.phone,
        dateOfBirth: new Date(patientData.date_of_birth || (data as any).dob),
        gender: patientData.gender || 'FEMALE',
        address: patientData.address,
        maritalStatus: patientData.marital_status,
        emergencyContactName: patientData.emergency_contact_name,
        emergencyContactNumber: patientData.emergency_contact_number,
        relation: patientData.relation,
        occupation: (data as any).occupation,
        whatsappPhone: (data as any).whatsapp_phone,
        bloodGroup: patientData.blood_group,
        allergies: patientData.allergies,
        medicalHistory: patientData.medical_history,
        medicalConditions: patientData.medical_conditions,
        insuranceProvider: patientData.insurance_provider,
        insuranceNumber: patientData.insurance_number,
        privacyConsent: patientData.privacy_consent,
        serviceConsent: patientData.service_consent,
        medicalConsent: patientData.medical_consent,
      });

      return { success: true, error: false, msg: "Patient created successfully" };
    } else {
      // Update existing patient (pid is patient ID, not user ID)
      // First, check if patient exists and has a user_id
      const existingPatient = await db.patient.findUnique({
        where: { id: pid },
        select: { user_id: true },
      });

      if (existingPatient?.user_id) {
        // Update user
        await db.user.update({
          where: { id: existingPatient.user_id },
          data: {
            first_name: patientData.first_name,
            last_name: patientData.last_name,
            email: patientData.email,
            phone: patientData.phone,
            role: Role.PATIENT, // Ensure role is PATIENT
          },
        });
      }

      // Update patient
      await db.patient.update({
        where: { id: pid },
        data: patientData,
      });

      return { success: true, error: false, msg: "Patient updated successfully" };
    }
  } catch (error: any) {
    console.error('Error creating/updating patient:', error);
    return { success: false, error: true, msg: error?.message || "Internal server error" };
  }
}
