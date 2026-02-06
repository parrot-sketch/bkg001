/**
 * User Profile Service
 * 
 * Service layer for creating users and their associated profiles (Patient, Doctor, Staff).
 * Follows clean architecture principles by encapsulating business logic.
 * 
 * Database Schema Understanding:
 * - User: Central authentication entity (id: UUID)
 * - Doctor: Has user_id linking to User, and its own id (UUID)
 * - Patient: Has user_id (optional) linking to User, and its own id (UUID) with file_number
 * - Staff: Legacy model (may not have user_id, needs investigation)
 * 
 * Workflow:
 * 1. Create User first (with role, email, password_hash)
 * 2. Create profile (Doctor/Patient) with user_id linking to User
 * 3. Handle transactions to ensure data consistency
 */

import { PrismaClient } from '@prisma/client';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { Role } from '@/domain/enums/Role';
import { Status } from '@/domain/enums/Status';
import { randomUUID } from 'crypto';

interface CreateUserWithDoctorParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  // Doctor-specific fields
  name: string;
  specialization: string;
  licenseNumber: string;
  address: string;
  department?: string;
  clinicLocation?: string;
  profileImage?: string;
  bio?: string;
  education?: string;
  focusAreas?: string;
  professionalAffiliations?: string;
  workingDays?: Array<{
    day: string;
    startTime: string;
    endTime: string;
    isAvailable?: boolean;
  }>;
}

interface CreateUserWithPatientParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  // Patient-specific fields
  dateOfBirth: Date;
  gender: 'MALE' | 'FEMALE';
  address: string;
  maritalStatus: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  relation: string;
  occupation?: string;
  whatsappPhone?: string;
  bloodGroup?: string;
  allergies?: string;
  medicalHistory?: string;
  medicalConditions?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  privacyConsent?: boolean;
  serviceConsent?: boolean;
  medicalConsent?: boolean;
}

export class UserProfileService {
  private authService: JwtAuthService;
  private userRepository: PrismaUserRepository;

  constructor(private db: PrismaClient) {
    this.userRepository = new PrismaUserRepository(db);
    const authConfig = {
      jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
      accessTokenExpiresIn: 15 * 60,
      refreshTokenExpiresIn: 7 * 24 * 60 * 60,
      saltRounds: 10,
    };
    this.authService = new JwtAuthService(this.userRepository, db, authConfig);
  }

  /**
   * Creates a User and associated Doctor profile
   * 
   * Database Schema:
   * - User.id (UUID) - Primary key for User
   * - Doctor.id (UUID) - Primary key for Doctor (separate from User.id)
   * - Doctor.user_id (UUID) - Foreign key linking to User.id
   */
  async createUserWithDoctor(params: CreateUserWithDoctorParams) {
    // Hash password
    const passwordHash = await this.authService.hashPassword(params.password);

    // Generate IDs
    const userId = randomUUID();
    const doctorId = randomUUID();

    // Use transaction to ensure atomicity
    return await this.db.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          id: userId,
          email: params.email,
          password_hash: passwordHash,
          first_name: params.firstName,
          last_name: params.lastName,
          phone: params.phone,
          role: Role.DOCTOR,
          status: Status.ACTIVE,
        },
      });

      // 2. Create Doctor profile with user_id linking to User
      const doctor = await tx.doctor.create({
        data: {
          id: doctorId,
          user_id: userId, // Link to User
          email: params.email,
          first_name: params.firstName,
          last_name: params.lastName,
          name: params.name,
          specialization: params.specialization,
          license_number: params.licenseNumber,
          phone: params.phone || '',
          address: params.address,
          department: params.department,
          clinic_location: params.clinicLocation,
          profile_image: params.profileImage,
          bio: params.bio,
          education: params.education,
          focus_areas: params.focusAreas,
          professional_affiliations: params.professionalAffiliations,
          availability_status: 'AVAILABLE',
          type: 'FULL',
          onboarding_status: 'ACTIVATED', // Admin-created doctors are immediately activated
          activated_at: new Date(),
        },
      });

      // 3. Create availability template and slots if provided
      if (params.workingDays && params.workingDays.length > 0) {
        // Create standard template
        const template = await tx.availabilityTemplate.create({
          data: {
            doctor_id: doctorId,
            name: 'Standard',
            is_active: true
          }
        });

        const daysMap: Record<string, number> = {
          'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
        };

        const slotsData = params.workingDays.map((wd) => ({
          template_id: template.id,
          day_of_week: daysMap[wd.day] ?? 1,
          start_time: wd.startTime,
          end_time: wd.endTime,
          slot_type: 'CLINIC'
        }));

        await tx.availabilitySlot.createMany({
          data: slotsData,
        });
      }

      return { user, doctor };
    });
  }

  /**
   * Creates a User and associated Patient profile
   * 
   * Database Schema:
   * - User.id (UUID) - Primary key for User
   * - Patient.id (UUID) - Primary key for Patient (separate from User.id)
   * - Patient.user_id (UUID, optional) - Foreign key linking to User.id
   * - Patient.file_number (String, unique) - System-generated file number (NS001, etc.)
   */
  async createUserWithPatient(params: CreateUserWithPatientParams) {
    // Hash password
    const passwordHash = await this.authService.hashPassword(params.password);

    // Generate IDs
    const userId = randomUUID();
    const patientId = randomUUID();

    // Generate file number (NS001, NS002, etc.)
    // Get the highest existing file number
    const lastPatient = await this.db.patient.findFirst({
      orderBy: { file_number: 'desc' },
      select: { file_number: true },
    });

    let fileNumber = 'NS001';
    if (lastPatient?.file_number) {
      const lastNumber = parseInt(lastPatient.file_number.replace('NS', ''));
      fileNumber = `NS${String(lastNumber + 1).padStart(3, '0')}`;
    }

    // Use transaction to ensure atomicity
    return await this.db.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          id: userId,
          email: params.email,
          password_hash: passwordHash,
          first_name: params.firstName,
          last_name: params.lastName,
          phone: params.phone,
          role: Role.PATIENT,
          status: Status.ACTIVE,
        },
      });

      // 2. Create Patient profile with user_id linking to User
      const patient = await tx.patient.create({
        data: {
          id: patientId,
          user_id: userId, // Link to User
          file_number: fileNumber,
          first_name: params.firstName,
          last_name: params.lastName,
          email: params.email,
          phone: params.phone,
          whatsapp_phone: params.whatsappPhone,
          date_of_birth: params.dateOfBirth,
          gender: params.gender,
          address: params.address,
          marital_status: params.maritalStatus,
          occupation: params.occupation,
          emergency_contact_name: params.emergencyContactName,
          emergency_contact_number: params.emergencyContactNumber,
          relation: params.relation,
          blood_group: params.bloodGroup,
          allergies: params.allergies,
          medical_conditions: params.medicalConditions,
          medical_history: params.medicalHistory,
          insurance_provider: params.insuranceProvider,
          insurance_number: params.insuranceNumber,
          privacy_consent: params.privacyConsent ?? false,
          service_consent: params.serviceConsent ?? false,
          medical_consent: params.medicalConsent ?? false,
          approved: false, // Requires admin approval
        },
      });

      return { user, patient };
    });
  }

  /**
   * Updates User and Patient profiles
   */
  async updateUserWithPatient(
    userId: string,
    patientId: string,
    userData: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    },
    patientData: any
  ) {
    return await this.db.$transaction(async (tx) => {
      // Update User if userData provided
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userData,
        });
      }

      // Update Patient
      await tx.patient.update({
        where: { id: patientId },
        data: patientData,
      });
    });
  }
}
