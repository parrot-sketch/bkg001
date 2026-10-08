import { z } from "zod";

export const PatientFormSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .max(30, "First name can't be more than 50 characters"),
  last_name: z
    .string()
    .trim()
    .min(2, "dLast name must be at least 2 characters")
    .max(30, "First name can't be more than 50 characters"),
  date_of_birth: z.coerce.date(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { message: "Gender is required" }),

  phone: z.string().min(10, "Enter phone number").max(10, "Enter phone number"),
  email: z.string().email("Invalid email address.").optional(),
  address: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(500, "Address must be at most 500 characters"),
  marital_status: z.enum(
    ["married", "single", "divorced", "widowed", "separated"],
    { message: "Marital status is required." }
  ).optional(),
  emergency_contact_name: z
    .string()
    .min(2, "Emergency contact name is required.")
    .max(50, "Emergency contact must be at most 50 characters"),
  emergency_contact_number: z
    .string()
    .min(10, "Enter phone number")
    .max(10, "Enter phone number"),
  relation: z.enum(["mother", "father", "husband", "wife", "other"], {
    message: "Relations with contact person required",
  }),
  blood_group: z.string().optional(),
  allergies: z.string().optional(),
  medical_conditions: z.string().optional(),
  medical_history: z.string().optional(),
  insurance_provider: z.string().optional(),
  insurance_number: z.string().optional(),
  privacy_consent: z
    .boolean()
    .default(false)
    .refine((val) => val === true, {
      message: "You must agree to the privacy policy.",
    }),
  service_consent: z
    .boolean()
    .default(false)
    .refine((val) => val === true, {
      message: "You must agree to the terms of service.",
    }),
  medical_consent: z
    .boolean()
    .default(false)
    .refine((val) => val === true, {
      message: "You must agree to the medical treatment terms.",
    }),
  occupation: z.string().optional(),
  referral_source: z.string().optional(),
  img: z.string().optional(),
});

export const AppointmentSchema = z.object({
  doctor_id: z.string().min(1, "Select physician"),
  type: z.string().min(1, "Select type of appointment"),
  appointment_date: z.string().min(1, "Select appointment date"),
  time: z.string().min(1, "Select appointment time"),
  note: z.string().optional(),
});

export const DoctorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),
  phone: z.string().min(10, "Enter phone number").max(10, "Enter phone number"),
  email: z.string().email("Invalid email address.").optional(),
  address: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(500, "Address must be at most 500 characters"),
  specialization: z.string().min(2, "Specialization is required."),
  license_number: z.string().min(2, "License number is required"),
  type: z.enum(["FULL", "PART"], { message: "Type is required." }),
  department: z.string().min(2, "Department is required."),
  img: z.string().optional(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
});

export const workingDaySchema = z.object({
  day: z.enum([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]),
  start_time: z.string(),
  close_time: z.string(),
});
export const WorkingDaysSchema = z.array(workingDaySchema).optional();

export const StaffSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),
  role: z.enum(["NURSE", "LAB_TECHNICIAN"], { message: "Role is required." }),
  phone: z
    .string()
    .min(10, "Contact must be 10-digits")
    .max(10, "Contact must be 10-digits"),
  email: z.string().email("Invalid email address.").optional(),
  address: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(500, "Address must be at most 500 characters"),
  license_number: z.string().optional(),
  department: z.string().optional(),
  img: z.string().optional(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .optional()
    .or(z.literal("")),
});

export const VitalSignsSchema = z.object({
  patient_id: z.string(),
  medical_id: z.string(),
  body_temperature: z.coerce.number({
    message: "Enter recorded body temperature",
  }),
  heartRate: z.string({ message: "Enter recorded heartbeat rate" }),
  systolic: z.coerce.number({
    message: "Enter recorded systolic blood pressure",
  }),
  diastolic: z.coerce.number({
    message: "Enter recorded diastolic blood pressure",
  }),
  respiratory_rate: z.coerce.number().optional(),
  oxygen_saturation: z.coerce.number().optional(),
  weight: z.coerce.number({ message: "Enter recorded weight (Kg)" }),
  height: z.coerce.number({ message: "Enter recorded height (Cm)" }),
});

export const DiagnosisSchema = z.object({
  patient_id: z.string(),
  medical_id: z.string(),
  doctor_id: z.string(),
  symptoms: z.string({ message: "Symptoms required" }),
  diagnosis: z.string({ message: "Diagnosis required" }),
  notes: z.string().optional(),
  prescribed_medications: z.string().optional(),
  follow_up_plan: z.string().optional(),
});

export const PaymentSchema = z.object({
  id: z.string(),
  // patient_id: z.string(),
  // appointment_id: z.string(),
  bill_date: z.coerce.date(),
  // payment_date: z.string(),
  discount: z.string({ message: "discount" }),
  total_amount: z.string(),
  // amount_paid: z.string(),
});

export const PatientBillSchema = z.object({
  bill_id: z.string(),
  service_id: z.string(),
  service_date: z.string(),
  appointment_id: z.string(),
  quantity: z.string({ message: "Quantity is required" }),
  unit_cost: z.string({ message: "Unit cost is required" }),
  total_cost: z.string({ message: "Total cost is required" }),
});

export const ServicesSchema = z.object({
  service_name: z.string({ message: "Service name is required" }),
  price: z.string({ message: "Service price is required" }),
  description: z.string({ message: "Service description is required" }),
});

// ============================================================================
// PATIENT INTAKE FORM SCHEMA
// ============================================================================

const PHONE_REGEX = /^(?=.{10,15}$)\+?[0-9]+$/;

export const PatientIntakeFormSchema = z.object({
  // Personal Information
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be at most 50 characters"),

  lastName: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be at most 50 characters"),

  // No age minimum — clinic accepts young patients
  dateOfBirth: z
    .string()
    .pipe(z.coerce.date())
    .refine((date) => date <= new Date(), {
      message: "Date of birth cannot be in the future",
    }),

  gender: z.enum(["MALE", "FEMALE", "OTHER"], {
    errorMap: () => ({ message: "Please select a valid gender" }),
  }),

  // Contact Information
  email: z
    .string()
    .email("Invalid email address")
    .toLowerCase()
    .optional()
    .or(z.literal("")),

  // International phone: optional + prefix; 10-15 chars total to match the PhoneNumber value object
  phone: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      // Accept common user formatting (spaces, hyphens, parentheses) and normalize
      // to a bare +/digits string for validation.
      const cleaned = value.replace(/[^\d+]/g, "");
      if (!cleaned || cleaned === '+') return undefined;
      return cleaned;
    },
    z
      .string()
      .regex(PHONE_REGEX, "Enter a valid phone number (e.g. +254712345678 or 0712345678)")
      .optional(),
  ),

  whatsappPhone: z
    .preprocess((value) => {
      if (typeof value !== "string") return value;
      return value.replace(/[^\d+]/g, "");
    }, z.string().regex(PHONE_REGEX, "Enter a valid WhatsApp number"))
    .optional()
    .or(z.literal("")),

  // Address — optional
  address: z
    .string()
    .trim()
    .max(500, "Address must be at most 500 characters")
    .optional()
    .or(z.literal("")),

  // Marital status — optional
  maritalStatus: z
    .enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"])
    .optional()
    .or(z.literal("")),

  occupation: z
    .string()
    .trim()
    .max(100, "Occupation must be at most 100 characters")
    .optional()
    .or(z.literal("")),

  // Emergency Contact — all fields optional
  emergencyContactName: z
    .string()
    .trim()
    .max(50, "Emergency contact name must be at most 50 characters")
    .optional()
    .or(z.literal("")),

  emergencyContactNumber: z
    .preprocess((value) => {
      if (typeof value !== "string") return value;
      return value.replace(/[^\d+]/g, "");
    }, z.string().regex(PHONE_REGEX, "Enter a valid phone number"))
    .optional()
    .or(z.literal("")),

  emergencyContactRelation: z
    .enum(["SPOUSE", "PARENT", "CHILD", "SIBLING", "FRIEND", "OTHER"])
    .optional()
    .or(z.literal("")),

  // Medical Information — all optional
  bloodGroup: z
    .enum(["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"])
    .optional()
    .or(z.literal("")),

  allergies: z
    .string()
    .trim()
    .max(500, "Allergies description must be at most 500 characters")
    .optional()
    .or(z.literal("")),

  medicalConditions: z
    .string()
    .trim()
    .max(500, "Medical conditions must be at most 500 characters")
    .optional()
    .or(z.literal("")),

  // Consent — auto-set true; no dedicated consent step
  privacyConsent: z.boolean().default(true),
  serviceConsent: z.boolean().default(true),
  medicalConsent: z.boolean().default(true),
});

export type PatientIntakeFormData = z.infer<typeof PatientIntakeFormSchema>;

// ============================================================================
// PUBLIC (QR) INTAKE SUBMISSION SCHEMA
// Shared by the patient-facing form and POST /api/patient/intake so client and
// server enforce identical rules.
// ============================================================================

export const MIN_BIRTH_YEAR = 1900;

function isRealCalendarDate(value: string): boolean {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Same values as the front desk registration dialog, so reports group consistently. */
export const REFERRAL_SOURCES = [
  "SOCIAL_MEDIA",
  "GOOGLE_SEARCH",
  "FRIEND_FAMILY",
  "DOCTOR_REFERRAL",
  "WALK_IN",
  "WEBSITE",
  "ADVERTISEMENT",
  "OTHER",
] as const;

export const PublicIntakeSubmissionSchema = PatientIntakeFormSchema.extend({
  dateOfBirth: z
    .string({ required_error: "Enter your date of birth" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your full date of birth")
    .refine(isRealCalendarDate, "That date doesn't exist. Check the day and month")
    .transform((value) => new Date(`${value}T00:00:00.000Z`))
    .refine((date) => date.getUTCFullYear() >= MIN_BIRTH_YEAR, "Check the year of birth")
    .refine((date) => date <= new Date(), "Date of birth cannot be in the future"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], {
    errorMap: () => ({ message: "Please select an option" }),
  }),
  referralSource: z.enum(REFERRAL_SOURCES).optional().or(z.literal("")),
  // Checked in superRefine: a field-level failure here would stop zod from
  // running the cross-field rules below while the patient is on earlier steps.
  privacyConsent: z.boolean().default(false),
  serviceConsent: z.boolean().default(false),
  medicalConsent: z.boolean().default(false),
}).superRefine((data, ctx) => {
  for (const consent of ["privacyConsent", "serviceConsent", "medicalConsent"] as const) {
    if (data[consent] !== true) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [consent], message: "Please confirm to continue" });
    }
  }

  const require = (path: keyof typeof data, message: string) => {
    const value = data[path];
    if (typeof value !== "string" || value.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    }
  };

  if (data.emergencyContactName && data.emergencyContactName.trim().length === 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["emergencyContactName"],
      message: "Name must be at least 2 characters",
    });
  }

  // Zod skips the transform when an earlier date check failed, so the value may still be a string.
  const dob: unknown = data.dateOfBirth;
  if (!(dob instanceof Date) || Number.isNaN(dob.getTime())) return;

  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < dob.getUTCDate())) age--;

  if (age >= 18) {
    require("phone", "Phone number is required");
    require("email", "Email is required");
    require("address", "Home address is required");
  } else if (!data.phone && !data.emergencyContactNumber) {
    // A minor needs at least one number someone can be reached on.
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["emergencyContactNumber"],
      message: "Add a parent or guardian's phone number so we can reach you",
    });
  }
});

export type PublicIntakeSubmissionData = z.infer<typeof PublicIntakeSubmissionSchema>;
