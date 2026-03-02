/**
 * Factory for InventoryAuditService singleton
 */

import db from '@/lib/db';
import { InventoryAuditService } from '@/application/services/InventoryAuditService';

let inventoryAuditService: InventoryAuditService;

function initialize() {
  if (inventoryAuditService) return;
  inventoryAuditService = new InventoryAuditService(db);
}

export function getInventoryAuditService(): InventoryAuditService {
  initialize();
  return inventoryAuditService;
}
