/**
 * Factory: Inventory Consumption Billing Service Factory
 *
 * Provides a singleton-scoped PrismaInventoryConsumptionBillingService instance.
 *
 * Used by API routes to avoid re-instantiating on every request.
 */

import db from '@/lib/db';
import { PrismaInventoryConsumptionBillingService } from '@/application/services/InventoryConsumptionBillingService';

// Lazy singleton instance
let consumptionBillingService: PrismaInventoryConsumptionBillingService;

function initialize() {
  if (consumptionBillingService) return;

  consumptionBillingService = new PrismaInventoryConsumptionBillingService(db);
}

export function getInventoryConsumptionBillingService(): PrismaInventoryConsumptionBillingService {
  initialize();
  return consumptionBillingService;
}
