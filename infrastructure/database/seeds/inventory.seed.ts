import { DataSource } from 'typeorm';
import { CATEGORIES, ITEMS, CategorySeedData, ItemSeedData } from './data/inventory.catalogue';
import { InventoryCategory } from '../../modules/inventory/entities/inventory-category.entity';
import { InventoryItem } from '../../modules/inventory/entities/inventory-item.entity';
import { ItemType, ItemStatus } from '../../common/enums';

export class InventorySeed {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    const start = Date.now();
    console.log('[SEED] Starting inventory seed...');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let catsCreated = 0;
      let catsSkipped = 0;
      const categoryMap = new Map<string, string>();

      for (const cat of CATEGORIES) {
        const existing = await queryRunner.manager.findOne(InventoryCategory, {
          where: { code: cat.code },
        });
        if (existing) {
          categoryMap.set(cat.code, existing.id);
          catsSkipped++;
        } else {
          const created = await queryRunner.manager.save(InventoryCategory, {
            name: cat.name,
            code: cat.code,
            description: cat.description,
            isActive: true,
            displayOrder: CATEGORIES.indexOf(cat),
          });
          categoryMap.set(cat.code, created.id);
          catsCreated++;
        }
      }

      console.log(`[SEED] Categories: ${catsCreated} created, ${catsSkipped} skipped`);

      let itemsCreated = 0;
      let itemsSkipped = 0;

      for (const item of ITEMS) {
        const existing = await queryRunner.manager.findOne(InventoryItem, {
          where: { itemCode: item.itemCode },
        });
        if (existing) {
          itemsSkipped++;
          continue;
        }

        const categoryId = categoryMap.get(item.categoryCode);
        if (!categoryId) {
          console.warn(`[SEED] WARNING: Category ${item.categoryCode} not found for item ${item.itemCode}`);
          continue;
        }

        await queryRunner.manager.save(InventoryItem, {
          itemCode: item.itemCode,
          name: item.name,
          categoryId,
          itemType: ItemType[item.itemType as keyof typeof ItemType],
          unit: item.unit,
          sellingPrice: item.sellingPrice,
          requiresExpiryDate: item.requiresExpiryDate,
          isControlledSubstance: item.isControlledSubstance,
          minimumStock: item.minimumStock,
          reorderPoint: item.reorderPoint,
          reorderQuantity: item.reorderQuantity,
          storageLocation: item.storageLocation,
          currentStock: 0,
          reservedStock: 0,
          status: ItemStatus.ACTIVE,
          isActive: true,
        });
        itemsCreated++;
      }

      console.log(`[SEED] Items: ${itemsCreated} created, ${itemsSkipped} skipped`);

      await queryRunner.commitTransaction();

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[SEED] Seed completed in ${elapsed}s`);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('[SEED] Seed FAILED — transaction rolled back');
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
