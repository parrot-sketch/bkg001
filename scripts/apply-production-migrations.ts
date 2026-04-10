#!/usr/bin/env tsx
/**
 * Production Migration Runner
 * 
 * Run this script after deploying to apply database schema changes.
 * Usage: npx tsx scripts/apply-production-migrations.ts
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const productionEnv = readFileSync('.env.production', 'utf-8');
const dbMatch = productionEnv.match(/DATABASE_URL="([^"]+)"/);
if (!dbMatch) {
  console.error('❌ Could not find DATABASE_URL in .env.production');
  process.exit(1);
}

const databaseUrl = dbMatch[1];
console.log('🔗 Connecting to production database...');

try {
  process.env.DATABASE_URL = databaseUrl;
  process.env.DIRECT_URL = databaseUrl;
  process.env.SKIP_MIGRATION = '';
  
  console.log('📦 Generating Prisma client...');
  execSync('pnpm prisma generate', { stdio: 'inherit' });
  
  console.log('🚀 Applying migrations...');
  execSync('pnpm prisma migrate deploy', { stdio: 'inherit' });
  
  console.log('✅ Migrations applied successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}