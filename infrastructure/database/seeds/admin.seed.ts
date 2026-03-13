import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../modules/auth/entities/user.entity';
import { Role } from '../../common/enums';

const SEED_USERS = [
  {
    firstName: 'System',
    lastName: 'Admin',
    email: 'admin@nairobisculpt.co.ke',
    password: 'Admin@Sculpt2024!',
    role: Role.ADMIN,
  },
  {
    firstName: 'Dr. James',
    lastName: 'Mwangi',
    email: 'doctor@nairobisculpt.co.ke',
    password: 'Doctor@Sculpt2024!',
    role: Role.DOCTOR,
  },
  {
    firstName: 'Grace',
    lastName: 'Wanjiku',
    email: 'nurse@nairobisculpt.co.ke',
    password: 'Nurse@Sculpt2024!',
    role: Role.NURSE,
  },
  {
    firstName: 'Mary',
    lastName: 'Achieng',
    email: 'reception@nairobisculpt.co.ke',
    password: 'Reception@Sculpt2024!',
    role: Role.FRONT_DESK,
  },
  {
    firstName: 'Peter',
    lastName: 'Otieno',
    email: 'theater@nairobisculpt.co.ke',
    password: 'Theater@Sculpt2024!',
    role: Role.THEATER_TECH,
  },
];

export async function seedAdmin(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(User);

  for (const seedUser of SEED_USERS) {
    const existing = await userRepo.findOne({
      where: { email: seedUser.email },
    });

    if (existing) {
      console.log(`✅ ${seedUser.role} user already exists — skipping`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(seedUser.password, 12);

    await userRepo.save(
      userRepo.create({
        ...seedUser,
        password: hashedPassword,
        isActive: true,
      }),
    );

    console.log(`✅ Seeded: ${seedUser.email} (${seedUser.role})`);
  }
}
