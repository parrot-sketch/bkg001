import { IUserRepository } from '../../domain/interfaces/repositories/IUserRepository';
import { IAuditService } from '../../domain/interfaces/services/IAuditService';
import { UpdateEmailDto } from '../dtos/UpdateEmailDto';
import { DomainException } from '../../domain/exceptions/DomainException';
import { Email } from '../../domain/value-objects/Email';
import bcrypt from 'bcrypt';

/**
 * Use Case: UpdateEmailUseCase
 * 
 * Handles secure email updates with password verification and audit logging.
 */
export class UpdateEmailUseCase {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly auditService: IAuditService
    ) {
        if (!userRepository || !auditService) {
            throw new Error('UserRepository and AuditService are required');
        }
    }

    async execute(dto: UpdateEmailDto): Promise<void> {
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

        // Step 3: Check if new email is already in use
        const newEmailObj = Email.create(dto.newEmail);
        const existingUser = await this.userRepository.findByEmail(newEmailObj);

        if (existingUser && existingUser.getId() !== dto.userId) {
            throw new DomainException('Email address is already in use', {
                email: dto.newEmail,
            });
        }

        // Step 4: Update email
        await this.userRepository.updateEmail(dto.userId, dto.newEmail);

        // Step 5: Record audit event
        await this.auditService.recordEvent({
            userId: dto.userId,
            recordId: dto.userId,
            action: 'EMAIL_UPDATED',
            model: 'User',
            details: JSON.stringify({
                oldEmail: user.getEmail().getValue(),
                newEmail: dto.newEmail,
            }),
        });
    }
}
