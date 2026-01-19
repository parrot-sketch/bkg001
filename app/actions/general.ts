"use server";

import {
  ReviewFormValues,
  reviewSchema,
} from "@/components/dialogs/review-form";
import db from "@/lib/db";

export async function deleteDataById(
  id: string,

  deleteType: "doctor" | "staff" | "patient" | "payment" | "bill"
) {
  try {
    switch (deleteType) {
      case "doctor":
        await db.doctor.delete({ where: { id: id } });
        // Also delete associated user if exists
        await db.user.delete({ where: { id: id } }).catch(() => {
          // User might not exist, ignore error
        });
        break;
      case "staff":
        // Staff members are Users with roles (NURSE, LAB_TECHNICIAN, CASHIER, FRONTDESK)
        // No separate Staff model exists - just delete the User
        await db.user.delete({ where: { id: id } }).catch(() => {
          // User might not exist, ignore error
        });
        break;
      case "patient":
        await db.patient.delete({ where: { id: id } });
        // Also delete associated user if exists
        await db.user.delete({ where: { id: id } }).catch(() => {
          // User might not exist, ignore error
        });
        break;
      case "payment":
        await db.payment.delete({ where: { id: Number(id) } });
        break;
    }

    return {
      success: true,
      message: "Data deleted successfully",
      status: 200,
    };
  } catch (error) {
    console.log(error);

    return {
      success: false,
      message: "Internal Server Error",
      status: 500,
    };
  }
}

export async function createReview(values: ReviewFormValues) {
  try {
    const validatedFields = reviewSchema.parse(values);

    await db.rating.create({
      data: {
        doctor_id: validatedFields.staff_id, // Rating model uses doctor_id, map staff_id to it
        patient_id: validatedFields.patient_id,
        rating: validatedFields.rating,
        comment: validatedFields.comment,
      },
    });

    return {
      success: true,
      message: "Review created successfully",
      status: 200,
    };
  } catch (error) {
    console.log(error);

    return {
      success: false,
      message: "Internal Server Error",
      status: 500,
    };
  }
}
