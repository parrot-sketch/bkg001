import { IUserRepository } from '../../domain/interfaces/repositories/IUserRepository';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { UpdatePasswordDto } from '../dtos/UpdatePasswordDto';
import { DomainException } from '../../domain/exceptions/DomainException';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

/**
 * Use Case: UpdatePasswordUseCase
 *
 * Handles secure password updates with current password verification and audit logging.
 *
 * Security (P0-2): On success, ALL existing refresh tokens are revoked and
 * token_version is incremented so that stolen tokens cannot be replayed after
 * a password change. Without this, an attacker who obtained a refresh token
 * before the password change could retain access for up to 7 days.
 */
export class UpdatePasswordUseCase {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly auditService: IAuditService,
        private readonly prisma: PrismaClient,
    ) {
        if (!userRepository || !auditService) {
            throw new Error('UserRepository and AuditService are required');
        }
    }

    async execute(dto: UpdatePasswordDto): Promise<void> {
        // Step 1: Verify user exists
        const user = await this.userRepository.findById(dto.userId);

        if (!user) {
            throw new DomainException(`User with ID ${dto.userId} not found`, {
                userId: dto.userId,
            });
        }

        // Step 2: Verify current password
        const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.getPasswordHash());

        if (!isPasswordValid) {
            throw new DomainException('Current password is incorrect', {
                userId: dto.userId,
            });
        }

        // Step 3: Validate new password strength
        if (dto.newPassword.length < 8) {
            throw new DomainException('New password must be at least 8 characters long', {
                userId: dto.userId,
            });
        }

        // Step 4: Hash new password
        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

        // Step 5: Update password + revoke all sessions + bump token_version in parallel.
        // Revoking sessions ensures stolen refresh tokens cannot be replayed after a
        // password change (P0-2 fix: session fixation post-compromise).
        await Promise.all([
            this.userRepository.updatePassword(dto.userId, hashedPassword),
            this.prisma.refreshToken.updateMany({
                where: { user_id: dto.userId, revoked: false },
                data:  { revoked: true, revoked_at: new Date() },
            }),
            this.prisma.user.update({
                where: { id: dto.userId },
                data:  { token_version: { increment: 1 } },
            }),
        ]);

        // Step 6: Record audit event
        await this.auditService.recordEvent({
            userId: dto.userId,
            recordId: dto.userId,
            action: 'PASSWORD_UPDATED',
            model: 'User',
            details: JSON.stringify({
                timestamp: new Date().toISOString(),
                sessions_revoked: true,
            }),
        });
    }
}
