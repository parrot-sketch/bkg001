import db from '@/lib/db';

async function main() {
  const consultations = await db.consultation.findMany({
    where: { 
      doctor_id: 'f0270dbb-3bb9-4cf2-bbea-2d8aba525501', 
      completed_at: { not: null } 
    },
    select: { id: true, completed_at: true },
    orderBy: { completed_at: 'desc' }
  });
  
  console.log('Doctor Ken consultations:', JSON.stringify(consultations, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });