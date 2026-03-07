import { PrismaClient, SurgicalCaseStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Workflow Verification ---');
  
  // 1. Find all cases
  const allCases = await prisma.surgicalCase.findMany({
    select: { id: true, status: true, patient: { select: { first_name: true } } }
  });
  
  console.log(`Total Cases: ${allCases.length}`);
  console.log(allCases);

  // 2. Identify a PLANNING case to test mark-ready (simulate Doctor action)
  const planningCase = allCases.find(c => c.status === SurgicalCaseStatus.PLANNING);
  if (planningCase) {
    console.log(`\nFound PLANNING case: ${planningCase.id}. In a real flow, doctor clicks 'Mark Ready'.`);
    // Simulate doctor completing the plan
    const readyCase = await prisma.surgicalCase.update({
        where: { id: planningCase.id },
        data: { status: SurgicalCaseStatus.READY_FOR_SCHEDULING }
    });
    console.log(`Simulated Transition -> READY_FOR_SCHEDULING! (Case ${readyCase.id})`);
  } else {
    console.log('\nNo PLANNING cases found to simulate Doctor.');
  }

  // 3. Find READY_FOR_SCHEDULING cases (simulate Frontdesk queue)
  const queueCases = await prisma.surgicalCase.findMany({
      where: { status: SurgicalCaseStatus.READY_FOR_SCHEDULING },
      select: { id: true, status: true }
  });
  console.log(`\nCases waiting in Frontdesk Queue (READY_FOR_SCHEDULING): ${queueCases.length}`);

  if (queueCases.length > 0) {
      const qCase = queueCases[0];
      console.log(`Simulating Frontdesk Booking for Case ${qCase.id}...`);
      // Simulate Frontdesk Confirming a Booking
      const scheduledCase = await prisma.surgicalCase.update({
          where: { id: qCase.id },
          data: { status: SurgicalCaseStatus.SCHEDULED }
      });
      console.log(`Transition -> SCHEDULED! (Case ${scheduledCase.id})`);
  }

  // 4. Find SCHEDULED cases (simulate Nurse Ward Prep queue)
  const wardCases = await prisma.surgicalCase.findMany({
      where: { status: SurgicalCaseStatus.SCHEDULED },
      select: { id: true, status: true }
  });
  console.log(`\nCases waiting in Ward Prep Queue (SCHEDULED): ${wardCases.length}`);

  if (wardCases.length > 0) {
      const wCase = wardCases[0];
      console.log(`Simulating Nurse Completing Pre-Op Checklist for Case ${wCase.id}...`);
      // Simulate Nurse finalizing checklist
      const preppedCase = await prisma.surgicalCase.update({
          where: { id: wCase.id },
          data: { status: SurgicalCaseStatus.READY_FOR_THEATER_BOOKING } // Or IN_PREP depending on exact hospital policy
      });
      console.log(`Transition -> READY_FOR_THEATER_BOOKING (Ready for physically rolling into theater)! (Case ${preppedCase.id})`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
