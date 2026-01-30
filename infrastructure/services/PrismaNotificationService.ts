import { INotificationService } from '../../domain/interfaces/services/INotificationService';
import { Email } from '../../domain/value-objects/Email';
import { PhoneNumber } from '../../domain/value-objects/PhoneNumber';
import { PrismaClient, NotificationType } from '@prisma/client';

export class PrismaNotificationService implements INotificationService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly emailService?: INotificationService
    ) { }

    async sendEmail(to: Email, subject: string, body: string): Promise<void> {
        if (this.emailService) {
            return this.emailService.sendEmail(to, subject, body);
        }
        // In a real implementation, this would call SendGrid/AWS SES
        // For now, we just log it or maybe store a record that an email WAS sent (if we tracked that separately)
        console.log(`[PrismaNotificationService] Simulating Email to ${to.getValue()}: ${subject}`);
    }

    async sendSMS(to: PhoneNumber, message: string): Promise<void> {
        if (this.emailService) {
            return this.emailService.sendSMS(to, message);
        }
        // In a real implementation, this would call Twilio
        console.log(`[PrismaNotificationService] Simulating SMS to ${to.getValue()}: ${message}`);
    }

    async sendInApp(userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error', metadata?: Record<string, any>): Promise<void> {
        try {
            // Combine type info with provided metadata
            const finalMetadata = {
                level: type,
                ...metadata
            };

            await this.prisma.notification.create({
                data: {
                    user_id: userId,
                    type: 'IN_APP', // Enum value from schema
                    status: 'PENDING',
                    subject: title,
                    message: message,
                    metadata: JSON.stringify(finalMetadata),
                    sent_at: new Date(),
                },
            });

            console.log(`[PrismaNotificationService] Persisted In-App notification for user ${userId}`);
        } catch (error) {
            console.error('Failed to persist in-app notification:', error);
            // We don't throw here to avoid breaking the main transaction flow if notification fails
        }
    }
}
