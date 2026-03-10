import { PrismaClient } from '@prisma/client';
import db from '../lib/db';
import { PrismaInventoryRepository } from '../infrastructure/database/repositories/PrismaInventoryRepository';
import { InventoryService } from '../application/services/InventoryService';
import { GoodsReceiptService } from '../application/services/GoodsReceiptService';
import { StockAdjustmentService } from '../application/services/StockAdjustmentService';

/**
 * Centralized Dependency Injection container for Inventory-related services.
 */
class InventoryContainer {
  private static instance: InventoryContainer;
  private readonly _inventoryRepository: PrismaInventoryRepository;
  private readonly _inventoryService: InventoryService;
  private readonly _goodsReceiptService: GoodsReceiptService;
  private readonly _stockAdjustmentService: StockAdjustmentService;

  private constructor(db: PrismaClient) {
    this._inventoryRepository = new PrismaInventoryRepository(db);
    this._inventoryService = new InventoryService(this._inventoryRepository);
    this._goodsReceiptService = new GoodsReceiptService(db);
    this._stockAdjustmentService = new StockAdjustmentService(db);
  }

  public static getInstance(db: PrismaClient): InventoryContainer {
    if (!InventoryContainer.instance) {
      InventoryContainer.instance = new InventoryContainer(db);
    }
    return InventoryContainer.instance;
  }

  get inventoryRepository() { return this._inventoryRepository; }
  get inventoryService() { return this._inventoryService; }
  get goodsReceiptService() { return this._goodsReceiptService; }
  get stockAdjustmentService() { return this._stockAdjustmentService; }
}

export const inventoryModule = InventoryContainer.getInstance(db);
