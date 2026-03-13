import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const db = new PrismaClient();

const USERS = [
  { email: 'admin@nairobisculpt.com', password: 'admin123', role: Role.ADMIN, firstName: 'System', lastName: 'Admin' },
  { email: 'angela@nairobisculpt.com', password: 'doctor123', role: Role.DOCTOR, firstName: 'Angela', lastName: 'Muoki' },
  { email: 'mukami@nairobisculpt.com', password: 'doctor123', role: Role.DOCTOR, firstName: 'Mukami', lastName: 'Gathariki' },
  { email: 'dorsi@nairobisculpt.com', password: 'doctor123', role: Role.DOCTOR, firstName: 'Dorsi', lastName: 'Jowi' },
  { email: 'ken@nairobisculpt.com', password: 'doctor123', role: Role.DOCTOR, firstName: 'Ken', lastName: 'Aluora' },
  { email: 'ogalo@nairobisculpt.com', password: 'doctor123', role: Role.DOCTOR, firstName: 'John Paul', lastName: 'Ogalo' },
  { email: 'jane@nairobisculpt.com', password: 'nurse123', role: Role.NURSE, firstName: 'Jane', lastName: 'Wambui' },
  { email: 'lucy@nairobisculpt.com', password: 'nurse123', role: Role.NURSE, firstName: 'Lucy', lastName: 'Akinyi' },
  { email: 'reception@nairobisculpt.com', password: 'frontdesk123', role: Role.FRONTDESK, firstName: 'David', lastName: 'Omondi' },
  { email: 'theater@nairobisculpt.com', password: 'theatertech123', role: Role.THEATER_TECHNICIAN, firstName: 'Samuel', lastName: 'Kariuki' },
  { email: 'stores@nairobisculpt.com', password: 'stores123', role: Role.STORES, firstName: 'Inventory', lastName: 'Manager' },
];

async function seedUsers() {
  console.log('Seeding users...\n');

  for (const user of USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    
    const existing = await db.user.findUnique({ where: { email: user.email } });
    
    if (existing) {
      await db.user.update({
        where: { email: user.email },
        data: { 
          password_hash: passwordHash,
          role: user.role,
          first_name: user.firstName,
          last_name: user.lastName,
          status: 'ACTIVE',
        }
      });
      console.log(`  ✓ Updated: ${user.email} (${user.role})`);
    } else {
      await db.user.create({
        data: {
          email: user.email,
          password_hash: passwordHash,
          role: user.role,
          first_name: user.firstName,
          last_name: user.lastName,
          status: 'ACTIVE',
        }
      });
      console.log(`  ✓ Created: ${user.email} (${user.role})`);
    }
  }

  console.log('\n✅ Done! Users seeded successfully.');
  await db.$disconnect();
}

seedUsers().catch(console.error);
