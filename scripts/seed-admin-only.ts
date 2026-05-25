#!/usr/bin/env node
/**
 * Seed Admin Only
 *
 * Creates/updates ONLY the admin user for local/dev environments.
 * This is useful for testing user-management flows without seeding the full dataset.
 *
 * Admin credentials:
 * - Email: admin@nairobisculpt.com
 * - Password: admin123
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@nairobisculpt.com';
  const password = 'admin123';
  const now = new Date();

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    create: {
      id: crypto.randomUUID(),
      email,
      password_hash: passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      first_name: 'System',
      last_name: 'Administrator',
      created_at: now,
      updated_at: now,
      failed_login_attempts: 0,
      token_version: 1,
      mfa_enabled: false,
    },
    update: {
      password_hash: passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      first_name: 'System',
      last_name: 'Administrator',
      updated_at: now,
      failed_login_attempts: 0,
      locked_until: null,
    },
  });

  console.log(`✅ Seeded admin user: ${email} (password: ${password})`);
}

main()
  .catch((err) => {
    console.error('❌ Failed to seed admin user:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

