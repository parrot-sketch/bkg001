/**
 * Use Case: InviteDoctorUseCase
 * 
 * Orchestrates the invitation of a doctor to the healthcare system.
 * 
 * Business Purpose:
 * - Creates a doctor invitation with secure token
 * - Creates User and Doctor records with INVITED status
 * - Generates secure, time-limited activation token
 * - Records audit event for invitation
 * 
 * Security Considerations:
 * - Tokens are cryptographically secure random strings
 * - Tokens expire after configurable period (default: 7 days)
 * - Only one active invite per email
 * - All invitations are audited
 * 
 * Workflow:
 * 1. Validate email format and check if doctor already exists
 * 2. Create User record with temporary password (must be reset on activation)
 * 3. Create Doctor record with INVITED onboarding status
 * 4. Generate secure invitation token
 * 5. Store invite token with expiration
 * 6. Record audit event
 * 7. Return invite token and activation URL
 */

import { PrismaClient } from '@prisma/client';
import { IAuthService } from '../../domain/interfaces/services/IAuthService';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { Email } from '../../domain/value-objects/Email';
import { DomainException } from '../../domain/exceptions/DomainException';
import { InviteDoctorDto, InviteDoctorResponseDto } from '../dtos/InviteDoctorDto';
import { DoctorOnboardingStatus } from '../../domain/enums/DoctorOnboardingStatus';
import { Role } from '../../domain/enums/Role';
import { Status } from '../../domain/enums/Status';
import * as crypto from 'crypto';

export class InviteDoctorUseCase {
  private readonly prisma: PrismaClient;
  private readonly tokenExpirationDays = 7; // Invite tokens expire after 7 days

  constructor(
    prisma: PrismaClient,
    private readonly authService: IAuthService,
    private readonly auditService: IAuditService,
    private readonly notificationService: INotificationService,
  ) {
    this.prisma = prisma;
  }

  /**
   * Executes the doctor invitation use case
   * 
   * @param dto - InviteDoctorDto with doctor information
   * @param invitedByUserId - ID of the admin/frontdesk user creating the invite
   * @param baseUrl - Base URL for constructing activation link (e.g., "https://clinic.example.com")
   * @returns Promise resolving to InviteDoctorResponseDto with invite token and URL
   * @throws DomainException if invitation fails (email already exists, invalid data, etc.)
   */
  async execute(
    dto: InviteDoctorDto,
    invitedByUserId: string,
    baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ): Promise<InviteDoctorResponseDto> {
    // 1. Validate email format
    const email = Email.create(dto.email);

    // 2. Check if user with this email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: email.getValue() },
    });

    if (existingUser) {
      throw new DomainException('A user with this email already exists', {
        email: email.getValue(),
      });
    }

    // 3. Check if there's already an active invite for this email
    const existingInvite = await this.prisma.doctorInviteToken.findUnique({
      where: { email: email.getValue() },
    });

    if (existingInvite && !existingInvite.used_at && !existingInvite.invalidated_at) {
      const now = new Date();
      if (existingInvite.expires_at > now) {
        throw new DomainException('An active invitation already exists for this email', {
          email: email.getValue(),
          existingInviteId: existingInvite.id,
        });
      }
    }

    // Start transaction to create User, Doctor, and InviteToken atomically
    return await this.prisma.$transaction(async (tx) => {
      // 4. Generate temporary password (doctor will set their own during activation)
      const temporaryPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await this.authService.hashPassword(temporaryPassword);

      // 5. Create User record
      const user = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          email: email.getValue(),
          password_hash: passwordHash, // Temporary - must be reset on activation
          role: Role.DOCTOR,
          status: Status.ACTIVE, // User is active, but onboarding prevents login
          first_name: dto.firstName,
          last_name: dto.lastName,
          phone: dto.phone,
        },
      });

      // 6. Create Doctor record with INVITED status
      const doctor = await tx.doctor.create({
        data: {
          id: crypto.randomUUID(),
          user_id: user.id,
          email: email.getValue(),
          first_name: dto.firstName,
          last_name: dto.lastName,
          title: dto.title,
          name: `${dto.firstName} ${dto.lastName}`,
          specialization: dto.specialization,
          license_number: dto.licenseNumber,
          phone: dto.phone,
          address: dto.address || '',
          clinic_location: dto.clinicLocation,
          department: dto.department,
          onboarding_status: DoctorOnboardingStatus.INVITED,
          invited_at: new Date(),
          invited_by: invitedByUserId,
        },
      });

      // 7. Generate secure invitation token
      const inviteToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.tokenExpirationDays);

      // 8. Store invite token
      const inviteTokenRecord = await tx.doctorInviteToken.create({
        data: {
          id: crypto.randomUUID(),
          doctor_id: doctor.id,
          email: email.getValue(),
          token: inviteToken,
          invited_by: invitedByUserId,
          expires_at: expiresAt,
        },
      });

      // 9. Construct activation URL
      const activationUrl = `${baseUrl}/doctor/activate?token=${inviteToken}`;

      // 10. Record audit event
      await this.auditService.recordEvent({
        userId: invitedByUserId,
        recordId: doctor.id,
        action: 'CREATE',
        model: 'DoctorInvite',
        details: `Doctor ${dto.email} invited by ${invitedByUserId}`,
      });

      // 11. Send invitation email (async, don't await - fire and forget)
      this.sendInvitationEmail(email.getValue(), dto.firstName, activationUrl).catch((error) => {
        console.error('Failed to send invitation email:', error);
        // Don't throw - invitation was created successfully, email is best-effort
      });

      // 12. Return response
      return {
        inviteTokenId: inviteTokenRecord.id,
        email: email.getValue(),
        inviteToken: inviteToken,
        expiresAt: expiresAt,
        invitationUrl: activationUrl,
      };
    });
  }

  /**
   * Sends invitation email to doctor
   * 
   * @private
   */
  private async sendInvitationEmail(email: string, firstName: string, activationUrl: string): Promise<void> {
    const subject = 'Welcome to Nairobi Sculpt Surgical Aesthetic Clinic - Account Activation';
    const body = `
Dear ${firstName},

You have been invited to join the Nairobi Sculpt Surgical Aesthetic Clinic Management System.

To activate your account and set your password, please click the link below:

${activationUrl}

This link will expire in 7 days.

If you did not expect this invitation, please contact the clinic administrator.

Best regards,
Nairobi Sculpt Surgical Aesthetic Clinic
    `.trim();

    const emailVo = Email.create(email);
    await this.notificationService.sendEmail(emailVo, subject, body);
  }
}
