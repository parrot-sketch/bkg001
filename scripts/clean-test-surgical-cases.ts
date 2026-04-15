import db from '@/lib/db';

async function cleanTestSurgicalCases() {
  console.log('🧹 Cleaning surgical cases for TEST005 and TEST006...\n');

  // Find the patient IDs
  const test005 = await db.patient.findUnique({
    where: { file_number: 'TEST005' }
  });
  const test006 = await db.patient.findUnique({
    where: { file_number: 'TEST006' }
  });

  if (!test005 || !test006) {
    console.log('Could not find test patients');
    return;
  }

  console.log('TEST005 (Alice Wanjiru):', test005.id);
  console.log('TEST006 (Bob Ochieng):', test006.id);

  // Find surgical cases for these patients
  const testCases = await db.surgicalCase.findMany({
    where: { 
      patient_id: { in: [test005.id, test006.id] }
    },
    select: { id: true }
  });

  console.log('Surgical cases to delete:', testCases.length);

  // Delete the surgical cases
  for (const tc of testCases) {
    await db.surgicalCase.delete({
      where: { id: tc.id }
    });
    console.log('Deleted surgical case:', tc.id);
  }

  console.log('\n✅ Cleanup complete!');
}

cleanTestSurgicalCases()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });