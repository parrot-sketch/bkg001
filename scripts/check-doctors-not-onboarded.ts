import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

type DoctorRow = {
  id: string;
  user_id: string;
  email: string;
  name: string;
  onboarding_status: string | null;
};

async function main() {
  const prisma = new PrismaClient();
  try {
    const doctors = (await prisma.doctor.findMany({
      select: {
        id: true,
        user_id: true,
        email: true,
        name: true,
        onboarding_status: true,
      },
      orderBy: { created_at: 'asc' },
    })) as unknown as DoctorRow[];

    const byStatus = new Map<string, number>();
    for (const d of doctors) {
      const k = d.onboarding_status ?? 'NULL';
      byStatus.set(k, (byStatus.get(k) ?? 0) + 1);
    }

    console.log(`Doctors: ${doctors.length}`);
    console.log(
      `By onboarding_status: ${Array.from(byStatus.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}`,
    );

    const active = doctors.filter(d => d.onboarding_status === 'ACTIVE');
    if (active.length > 0) {
      console.log('\nDoctors that ARE already ACTIVE (onboarded):');
      for (const d of active) {
        console.log(`- ${d.name} <${d.email}> id=${d.id} user_id=${d.user_id}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log('\nOK: No doctors have onboarding_status=ACTIVE.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 2;
});
