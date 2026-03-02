/**
 * Factory for GoodsReceiptService singleton
 */

import db from '@/lib/db';
import { GoodsReceiptService } from '@/application/services/GoodsReceiptService';

let goodsReceiptService: GoodsReceiptService;

function initialize() {
  if (goodsReceiptService) return;
  goodsReceiptService = new GoodsReceiptService(db);
}

export function getGoodsReceiptService(): GoodsReceiptService {
  initialize();
  return goodsReceiptService;
}
