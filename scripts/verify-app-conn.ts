import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Mimic Next.js .env.local loading
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

async function main() {
  const url = process.env.DATABASE_URL;
  console.log('🔍 DATABASE_URL from .env.local:', url ? (url.includes('@') ? 'Configured ✓' : 'Partial') : 'MISSING');
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url
      }
    }
  });

  try {
    console.log('⏳ Attempting connection...');
    const result = await prisma.$queryRaw`SELECT current_user, current_database();`;
    console.log('✅ Connection Success!', result);
    
    const user = await prisma.user.findFirst({
        where: { email: 'reception@nairobisculpt.com' }
    });
    console.log('👤 User Lookup (reception):', user ? 'FOUND' : 'NOT FOUND');
  } catch (e: any) {
    console.error('❌ Connection Failed:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
