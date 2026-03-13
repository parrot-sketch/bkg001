import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { CATEGORIES, ITEMS } from './data/inventory.catalogue';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nairobi_sculpt',
  synchronize: false,
  logging: false,
});

async function runSeed(): Promise<void> {
  const start = Date.now();
  console.log('[SEED] Starting inventory seed...');

  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.startTransaction();

    // Insert categories
    let catsCreated = 0;
    let catsSkipped = 0;
    const categoryMap = new Map<string, string>();

    for (const cat of CATEGORIES) {
      const existing = await queryRunner.query(
        'SELECT id FROM inventory_categories WHERE code = $1',
        [cat.code]
      );

      if (existing.length > 0) {
        categoryMap.set(cat.code, existing[0].id);
        catsSkipped++;
      } else {
        const result = await queryRunner.query(
          `INSERT INTO inventory_categories (name, code, description, is_active, display_order, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING id`,
          [cat.name, cat.code, cat.description, true, CATEGORIES.indexOf(cat)]
        );
        categoryMap.set(cat.code, result[0].id);
        catsCreated++;
      }
    }

    console.log(`[SEED] Categories: ${catsCreated} created, ${catsSkipped} skipped`);

    // Insert items
    let itemsCreated = 0;
    let itemsSkipped = 0;

    for (const item of ITEMS) {
      const existing = await queryRunner.query(
        'SELECT id FROM inventory_items WHERE item_code = $1',
        [item.itemCode]
      );

      if (existing.length > 0) {
        itemsSkipped++;
        continue;
      }

      const categoryId = categoryMap.get(item.categoryCode);
      if (!categoryId) {
        console.warn(`[SEED] WARNING: Category ${item.categoryCode} not found for item ${item.itemCode}`);
        continue;
      }

      await queryRunner.query(
        `INSERT INTO inventory_items (
          item_code, name, category_id, item_type, unit, selling_price,
          requires_expiry_date, is_controlled_substance, minimum_stock,
          reorder_point, reorder_quantity, storage_location,
          current_stock, reserved_stock, status, is_active,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())`,
        [
          item.itemCode,
          item.name,
          categoryId,
          item.itemType,
          item.unit,
          item.sellingPrice,
          item.requiresExpiryDate,
          item.isControlledSubstance,
          item.minimumStock,
          item.reorderPoint,
          item.reorderQuantity,
          item.storageLocation,
          0,
          0,
          'ACTIVE',
          true,
        ]
      );
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
    await dataSource.destroy();
  }
}

runSeed()
  .then(() => {
    console.log('[SEED] Done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[SEED] Fatal error:', err);
    process.exit(1);
  });
