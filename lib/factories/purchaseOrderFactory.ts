/**
 * Factory for PurchaseOrderService singleton
 */

import db from '@/lib/db';
import { PurchaseOrderService } from '@/application/services/PurchaseOrderService';

let purchaseOrderService: PurchaseOrderService;

function initialize() {
  if (purchaseOrderService) return;
  purchaseOrderService = new PurchaseOrderService(db);
}

export function getPurchaseOrderService(): PurchaseOrderService {
  initialize();
  return purchaseOrderService;
}
