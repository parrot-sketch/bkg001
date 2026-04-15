import db from '@/lib/db';

async function cleanBillingData() {
  console.log('🧹 Starting billing data cleanup...\n');

  // Step 1: Delete all bill items first (child records)
  const billItemCount = await db.patientBill.count();
  console.log(`Found ${billItemCount} bill items to delete...`);
  
  await db.patientBill.deleteMany({});
  console.log('✓ Deleted all bill items\n');

  // Step 2: Delete all payments
  const paymentCount = await db.payment.count();
  console.log(`Found ${paymentCount} payments to delete...`);
  
  await db.payment.deleteMany({});
  console.log('✓ Deleted all payments\n');

  // Verify cleanup
  const remainingPayments = await db.payment.count();
  const remainingBillItems = await db.patientBill.count();
  
  console.log('=== CLEANUP COMPLETE ===');
  console.log(`Payments remaining: ${remainingPayments}`);
  console.log(`Bill items remaining: ${remainingBillItems}`);
  console.log('\n✅ All billing data has been cleaned!');
}

cleanBillingData()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });