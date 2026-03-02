/**
 * Factory for StockAdjustmentService singleton
 */

import db from '@/lib/db';
import { StockAdjustmentService } from '@/application/services/StockAdjustmentService';

let stockAdjustmentService: StockAdjustmentService;

function initialize() {
  if (stockAdjustmentService) return;
  stockAdjustmentService = new StockAdjustmentService(db);
}

export function getStockAdjustmentService(): StockAdjustmentService {
  initialize();
  return stockAdjustmentService;
}
