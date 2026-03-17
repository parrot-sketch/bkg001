import { PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';
import { TheaterRepository } from '../repositories/TheaterRepository';
import { TheaterBillingService } from '../services/TheaterBillingService';
import { TheaterNotificationService } from '../services/TheaterNotificationService';
import { TheaterAuditService } from '../services/TheaterAuditService';
import { TheaterSchedulingUseCase } from '../services/TheaterSchedulingUseCase';

/**
 * Factory for creating Theater Scheduling infrastructure
 * Provides dependency injection and singleton instances
 */
export class TheaterSchedulingFactory {
    private static instance: TheaterSchedulingUseCase | null = null;

    /**
     * Create all theater scheduling dependencies (for testing)
     */
    static create(prisma: PrismaClient = db) {
        const theaterRepository = new TheaterRepository(prisma);
        const billingService = new TheaterBillingService(prisma);
        const notificationService = new TheaterNotificationService();
        const auditService = new TheaterAuditService(prisma);

        return new TheaterSchedulingUseCase(
            theaterRepository,
            billingService,
            notificationService,
            auditService
        );
    }

    /**
     * Get singleton instance of TheaterSchedulingUseCase
     */
    static getInstance(): TheaterSchedulingUseCase {
        if (!TheaterSchedulingFactory.instance) {
            TheaterSchedulingFactory.instance = TheaterSchedulingFactory.create();
        }
        return TheaterSchedulingFactory.instance;
    }
}

export const theaterSchedulingUseCase = TheaterSchedulingFactory.getInstance();
