/**
 * Use Case: ActivateDoctorInviteUseCase
 * 
 * Orchestrates the activation of a doctor invitation via secure token.
 * 
 * Business Purpose:
 * - Validates invitation token
 * - Allows doctor to set their password
 * - Transitions onboarding status from INVITED → ACTIVATED
 * - Provides JWT tokens for immediate authentication
 * 
 * Security Considerations:
 * - Tokens must be valid, unexpired, and unused
 * - Tokens are single-use (marked as used after activation)
 * - Passwords are hashed securely
 * - All activations are audited
 * 
 * Workflow:
 * 1. Validate token (exists, not expired, not used)
 * 2. Find associated doctor and user
 * 3. Update password hash with new password
 * 4. Transition onboarding status: INVITED → ACTIVATED
 * 5. Mark token as used
 * 6. Generate JWT tokens
 * 7. Record audit event
 * 8. Return tokens and user info
 */

import { PrismaClient } from '@prisma/client';
import { IAuthService } from '../../domain/interfaces/services/IAuthService';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { IUserRepository } from '../../domain/interfaces/repositories/IUserRepository';
import { Email } from '../../domain/value-objects/Email';
import { DomainException } from '../../domain/exceptions/DomainException';
import { ActivateDoctorInviteDto, ActivateDoctorInviteResponseDto } from '../dtos/InviteDoctorDto';
import { DoctorOnboardingStatus } from '../../domain/enums/DoctorOnboardingStatus';
import { transitionDoctorOnboardingStatus as transitionStatus } from '../../domain/services/DoctorOnboardingStateMachine';

export class ActivateDoctorInviteUseCase {
  private readonly prisma: PrismaClient;

  constructor(
    prisma: PrismaClient,
    private readonly authService: IAuthService,
    private readonly userRepository: IUserRepository,
    private readonly auditService: IAuditService,
  ) {
    this.prisma = prisma;
  }

  /**
   * Executes the doctor invite activation use case
   * 
   * @param dto - ActivateDoctorInviteDto with token and password
   * @returns Promise resolving to ActivateDoctorInviteResponseDto with tokens and user info
   * @throws DomainException if activation fails (invalid token, expired, etc.)
   */
  async execute(dto: ActivateDoctorInviteDto): Promise<ActivateDoctorInviteResponseDto> {
    const now = new Date();

    // 1. Validate token - find invite token
    const inviteToken = await this.prisma.doctorInviteToken.findUnique({
      where: { token: dto.token },
    });

    if (!inviteToken) {
      throw new DomainException('Invalid or expired invitation token', {
        token: dto.token.substring(0, 8) + '...', // Partial token for logging
      });
    }

    // 2. Check if token has already been used
    if (inviteToken.used_at) {
      throw new DomainException('This invitation has already been activated', {
        tokenId: inviteToken.id,
        usedAt: inviteToken.used_at,
      });
    }

    // 3. Check if token has been invalidated
    if (inviteToken.invalidated_at) {
      throw new DomainException('This invitation has been cancelled', {
        tokenId: inviteToken.id,
        invalidatedAt: inviteToken.invalidated_at,
      });
    }

    // 4. Check if token has expired
    if (inviteToken.expires_at < now) {
      throw new DomainException('This invitation has expired. Please request a new invitation.', {
        tokenId: inviteToken.id,
        expiresAt: inviteToken.expires_at,
      });
    }

    // 5. Find doctor and user associated with this invite
    if (!inviteToken.doctor_id) {
      throw new DomainException('Invalid invitation: Doctor record not found', {
        tokenId: inviteToken.id,
      });
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: inviteToken.doctor_id },
      include: { user: true },
    });

    if (!doctor || !doctor.user) {
      throw new DomainException('Invalid invitation: Doctor or user record not found', {
        tokenId: inviteToken.id,
        doctorId: inviteToken.doctor_id,
      });
    }

    // 6. Validate current onboarding status is INVITED
    const currentStatus = doctor.onboarding_status as DoctorOnboardingStatus;
    if (currentStatus !== DoctorOnboardingStatus.INVITED) {
      throw new DomainException(
        `Cannot activate invitation: Doctor onboarding status is ${currentStatus}, expected INVITED`,
        {
          tokenId: inviteToken.id,
          doctorId: doctor.id,
          currentStatus,
        }
      );
    }

    // Start transaction to update password, onboarding status, and token atomically
    return await this.prisma.$transaction(async (tx) => {
      // 7. Hash new password
      const passwordHash = await this.authService.hashPassword(dto.password);

      // 8. Update user password
      await tx.user.update({
        where: { id: doctor.user_id },
        data: {
          password_hash: passwordHash,
          // Optionally update name if provided
          first_name: dto.firstName || doctor.user.first_name,
          last_name: dto.lastName || doctor.user.last_name,
        },
      });

      // 9. Validate and transition onboarding status: INVITED → ACTIVATED
      const newStatus = transitionStatus(currentStatus, DoctorOnboardingStatus.ACTIVATED);

      // 10. Update doctor onboarding status and activated_at timestamp
      await tx.doctor.update({
        where: { id: doctor.id },
        data: {
          onboarding_status: newStatus,
          activated_at: now,
        },
      });

      // 11. Mark invite token as used
      await tx.doctorInviteToken.update({
        where: { id: inviteToken.id },
        data: {
          used_at: now,
        },
      });

      // 12. Get updated user for token generation
      const updatedUser = await tx.user.findUnique({
        where: { id: doctor.user_id },
      });

      if (!updatedUser) {
        throw new DomainException('User not found after activation', {
          userId: doctor.user_id,
        });
      }

      // 13. Get User entity for token generation
      const userEmail = Email.create(updatedUser.email);
      const user = await this.userRepository.findByEmail(userEmail);

      if (!user) {
        throw new DomainException('User not found after activation', {
          userId: updatedUser.id,
        });
      }

      // 14. Generate JWT tokens using the new password (via login)
      // Since password was just set, we can use the password from DTO to generate tokens
      // Note: This is a bit of a workaround - ideally authService would have a generateTokensForUser method
      // For now, we'll use login which validates password and generates tokens
      const tokens = await this.authService.login(userEmail, dto.password);

      // 15. Record audit event
      await this.auditService.recordEvent({
        userId: updatedUser.id,
        recordId: doctor.id,
        action: 'UPDATE',
        model: 'DoctorOnboarding',
        details: `Doctor ${updatedUser.email} activated invitation and transitioned to ACTIVATED status`,
      });

      // 16. Return response
      return {
        userId: updatedUser.id,
        doctorId: doctor.id,
        email: updatedUser.email,
        onboardingStatus: newStatus,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      };
    });
  }
}
