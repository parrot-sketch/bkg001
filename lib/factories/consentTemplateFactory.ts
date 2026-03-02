/**
 * Factory for ConsentTemplateService singleton
 */

import prisma from '@/lib/db';
import { ConsentTemplateService } from '@/application/services/ConsentTemplateService';

let consentTemplateService: ConsentTemplateService;

export function getConsentTemplateService(): ConsentTemplateService {
    if (!consentTemplateService) {
        consentTemplateService = new ConsentTemplateService(prisma);
    }
    return consentTemplateService;
}
