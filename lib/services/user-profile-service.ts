/**
 * User Profile Service
 * 
 * Service layer for creating staff users and their associated profiles.
 * Follows clean architecture principles by encapsulating business logic.
 * 
 * Database Schema Understanding:
 * - User: Central authentication entity (id: UUID)
 * - Doctor: Has user_id linking to User, and its own id (UUID)
 * - Patients are records created through the intake workflow, not login Users.
 * - Staff: Legacy model (may not have user_id, needs investigation)
 * 
 * Workflow:
 * 1. Create User first (with role, email, password_hash)
 * 2. Create the associated staff profile with user_id linking to User
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

}
