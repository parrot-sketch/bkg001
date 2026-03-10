import db from '../lib/db';
import { inventoryModule } from '../application/inventory-module';
import { StockMovementType } from '../domain/interfaces/repositories/IInventoryRepository';

async function verifyInventory() {
  console.log('--- Starting Inventory Verification ---');

  // 1. Pick a product
  const product = await db.inventoryItem.findFirst({ where: { is_active: true } });
  if (!product) {
    console.log('No active products found to test.');
    return;
  }
  console.log(`Testing Product: ${product.name} (ID: ${product.id})`);

  // 2. Clear existing transactions for this product for clean test (optional, but safer for verification)
  // await db.inventoryTransaction.deleteMany({ where: { inventory_item_id: product.id } });

  const initialBalance = await inventoryModule.inventoryService.getItemBalance(product.id);
  console.log(`Initial Balance: ${initialBalance}`);

  // 3. Record Stock In
  console.log('Recording Stock In: 50 units');
  await inventoryModule.inventoryService.recordStockIn({
    inventoryItemId: product.id,
    quantity: 50,
    unitPrice: 10,
    reference: 'TEST-IN-001',
    notes: 'Verification test'
  });

  const afterInBalance = await inventoryModule.inventoryService.getItemBalance(product.id);
  console.log(`Balance after Stock In: ${afterInBalance}`);

  if (afterInBalance !== initialBalance + 50) {
    throw new Error(`Balance mismatch after Stock In. Expected ${initialBalance + 50}, got ${afterInBalance}`);
  }

  // 4. Record Stock Out
  console.log('Recording Stock Out: 10 units');
  await inventoryModule.inventoryService.recordStockOut({
    inventoryItemId: product.id,
    quantity: 10,
    reference: 'TEST-OUT-001',
    notes: 'Verification test'
  });

  const afterOutBalance = await inventoryModule.inventoryService.getItemBalance(product.id);
  console.log(`Balance after Stock Out: ${afterOutBalance}`);

  if (afterOutBalance !== afterInBalance - 10) {
    throw new Error(`Balance mismatch after Stock Out. Expected ${afterInBalance - 10}, got ${afterOutBalance}`);
  }

  // 5. Verify Summary
  const summary = await inventoryModule.inventoryService.getDashboardSummary();
  const productSummary = summary.find(s => s.itemId === product.id);
  console.log(`Summary Balance for Product: ${productSummary?.currentBalance}`);

  if (productSummary?.currentBalance !== afterOutBalance) {
    throw new Error(`Summary balance mismatch. Expected ${afterOutBalance}, got ${productSummary?.currentBalance}`);
  }

  console.log('--- Verification Successful! ---');
}

verifyInventory()
  .catch(console.error)
  .finally(() => db.$disconnect());
