import { IUserRepository } from '../../domain/interfaces/repositories/IUserRepository';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { UpdatePasswordDto } from '../dtos/UpdatePasswordDto';
import { DomainException } from '../../domain/exceptions/DomainException';
import bcrypt from 'bcrypt';

/**
 * Use Case: UpdatePasswordUseCase
 * 
 * Handles secure password updates with current password verification and audit logging.
 */
export class UpdatePasswordUseCase {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly auditService: IAuditService
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

        // Step 5: Update password
        await this.userRepository.updatePassword(dto.userId, hashedPassword);

        // Step 6: Record audit event
        await this.auditService.recordEvent({
            userId: dto.userId,
            recordId: dto.userId,
            action: 'PASSWORD_UPDATED',
            model: 'User',
            details: JSON.stringify({
                timestamp: new Date().toISOString(),
            }),
        });

        // TODO: Invalidate all sessions except current one
        // This would require session management implementation
    }
}
