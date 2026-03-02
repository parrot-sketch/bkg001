/**
 * Factory for ClinicalInventoryIntegrationService singleton
 */

import db from '@/lib/db';
import { ClinicalInventoryIntegrationService } from '@/application/services/ClinicalInventoryIntegrationService';

let clinicalInventoryIntegrationService: ClinicalInventoryIntegrationService;

function initialize() {
  if (clinicalInventoryIntegrationService) return;
  clinicalInventoryIntegrationService = new ClinicalInventoryIntegrationService(db);
}

export function getClinicalInventoryIntegrationService(): ClinicalInventoryIntegrationService {
  initialize();
  return clinicalInventoryIntegrationService;
}
