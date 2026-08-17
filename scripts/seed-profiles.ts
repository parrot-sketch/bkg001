import { PrismaClient, Role } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('Seeding missing doctor profiles...\n');

  const doctorUsers = await db.user.findMany({
    where: { role: Role.DOCTOR },
    select: { id: true, email: true, first_name: true, last_name: true },
  });

  for (const user of doctorUsers) {
    const existing = await db.doctor.findUnique({
      where: { user_id: user.id },
      select: { id: true },
    });

    if (!existing) {
      await db.doctor.create({
        data: {
          user: { connect: { id: user.id } },
          email: user.email,
          name: `Dr. ${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Dr. Unknown',
          first_name: user.first_name || 'Unknown',
          last_name: user.last_name || 'Unknown',
          title: 'Dr.',
          specialization: 'Plastic, Reconstructive & Aesthetic Surgery',
          slug: user.email.split('@')[0],
          license_number: `TEMP-${user.id.slice(0, 8).toUpperCase()}`,
          phone: '+254700000000',
          address: 'Nairobi, Kenya',
          clinic_location: 'Nairobi Sculpt Aesthetic Centre',
          colorCode: '#1E3A5F',
          bio: 'Doctor profile seeded for authentication.',
          education: '',
          focus_areas: '',
          professional_affiliations: '',
          years_of_experience: 0,
          availability_status: 'AVAILABLE',
          onboarding_status: 'ACTIVE',
        },
      });
      console.log(`  ✓ Created doctor profile: ${user.email}`);
    } else {
      console.log(`  - Doctor profile exists: ${user.email}`);
    }
  }

  console.log('\n✅ Done!');
  await db.$disconnect();
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exitCode = 1;
});
