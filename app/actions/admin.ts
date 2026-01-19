"use server";

import db from "@/lib/db";
import {
  DoctorSchema,
  ServicesSchema,
  WorkingDaysSchema,
} from "@/lib/schema";
import { checkRole } from "@/lib/utils/roles";
import { getCurrentUser } from "@/lib/auth/server-auth";
import { Role } from "@/domain/enums/Role";
import { UserProfileService } from "@/lib/services/user-profile-service";

/**
 * Note: Staff model doesn't exist in the current schema.
 * Staff members are Users with roles (NURSE, LAB_TECHNICIAN, CASHIER, FRONTDESK).
 * This function is kept for backward compatibility but creates a User only.
 */
export async function createNewStaff(data: any) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, msg: "Unauthorized" };
    }

    const isAdmin = await checkRole(Role.ADMIN);

    if (!isAdmin) {
      return { success: false, msg: "Unauthorized" };
    }

    // For now, staff creation is just User creation with appropriate role
    // The Staff model doesn't exist in the current schema
    // Staff members are Users with roles: NURSE, LAB_TECHNICIAN, CASHIER, FRONTDESK
    
    return {
      success: false,
      message: "Staff creation not yet implemented. Use User creation with appropriate role.",
      error: true,
    };
  } catch (error) {
    console.log(error);
    return { error: true, success: false, message: "Something went wrong" };
  }
}
export async function createNewDoctor(data: any) {
  try {
    // Authorization check
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, msg: "Unauthorized" };
    }

    const isAdmin = await checkRole(Role.ADMIN);
    if (!isAdmin) {
      return { success: false, msg: "Unauthorized" };
    }

    // Validate input
    const values = DoctorSchema.safeParse(data);
    const workingDaysValues = WorkingDaysSchema.safeParse(data?.work_schedule);

    if (!values.success || !workingDaysValues.success) {
      return {
        success: false,
        errors: true,
        message: "Please provide all required info",
      };
    }

    const validatedValues = values.data;
    const workingDayData = workingDaysValues.data!;

    // Parse name into first and last name
    const nameParts = validatedValues.name.split(" ");
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(" ") || '';

    // Ensure password is provided (required for user creation)
    if (!validatedValues.password || validatedValues.password.trim() === '') {
      return {
        success: false,
        errors: true,
        message: "Password is required",
      };
    }

    // Use service layer to create user and doctor profile
    const userProfileService = new UserProfileService(db);
    const { user: newUser, doctor } = await userProfileService.createUserWithDoctor({
      email: validatedValues.email,
      password: validatedValues.password,
      firstName,
      lastName,
      phone: validatedValues.phone,
      name: validatedValues.name,
      specialization: validatedValues.specialization,
      licenseNumber: validatedValues.license_number,
      address: validatedValues.address,
      department: validatedValues.department,
      clinicLocation: (data as any).clinic_location,
      profileImage: (data as any).profile_image,
      bio: (data as any).bio,
      education: (data as any).education,
      focusAreas: (data as any).focus_areas,
      professionalAffiliations: (data as any).professional_affiliations,
      workingDays: workingDayData?.map((wd: any) => ({
        day: wd.day,
        startTime: wd.start_time,
        endTime: wd.end_time,
        isAvailable: wd.is_available,
      })),
    });

    return {
      success: true,
      message: "Doctor added successfully",
      error: false,
    };
  } catch (error: any) {
    console.error('Error creating doctor:', error);
    return {
      error: true,
      success: false,
      message: error?.message || "Something went wrong",
    };
  }
}

export async function addNewService(data: any) {
  try {
    const isValidData = ServicesSchema.safeParse(data);

    const validatedData = isValidData.data;

    await db.service.create({
      data: { ...validatedData!, price: Number(data.price!) },
    });

    return {
      success: true,
      error: false,
      msg: `Service added successfully`,
    };
  } catch (error) {
    console.log(error);
    return { success: false, msg: "Internal Server Error" };
  }
}
