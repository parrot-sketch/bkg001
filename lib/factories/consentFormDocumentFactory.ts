/**
 * Factory for ConsentFormDocumentService singleton
 */

import prisma from '@/lib/db';
import { ConsentFormDocumentService } from '@/application/services/ConsentFormDocumentService';

let consentFormDocumentService: ConsentFormDocumentService;

export function getConsentFormDocumentService(): ConsentFormDocumentService {
    if (!consentFormDocumentService) {
        consentFormDocumentService = new ConsentFormDocumentService(prisma);
    }
    return consentFormDocumentService;
}
