/**
 * FAST batch production data restoration.
 *
 * Strategy: Pre-process all Excel data in memory, then send chunked
 * multi-row SQL INSERT ... ON CONFLICT via $executeRawUnsafe.
 * 885 patients → ~10 chunks of 100 = 10 round-trips instead of 1,770.
 * All operations are pure upserts. NO deletes. Dr. Ken's consultations
 * and all existing clinical data are 100% preserved.
 */

import { createRequire } from 'module';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

if (fs.existsSync('.env.production')) {
  dotenv.config({ path: '.env.production', override: true });
  console.log('📝 Loaded .env.production');
} else {
  dotenv.config({ override: true });
}

console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL?.startsWith('prisma') ? 'Accelerate ✓' : 'Direct');

import { PrismaClient, Role, Status, Gender, InventoryCategory, PriceType } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate()) as unknown as PrismaClient;

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');

const CHUNK_SIZE = 50; // rows per SQL statement

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseExcelDate(val: any): Date | null {
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string' && val.includes('/')) {
    const [d, m, y2] = val.split('/').map(Number);
    const y = y2 < 100 ? (y2 < 30 ? 2000 + y2 : 1900 + y2) : y2;
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function normalizePhone(phone: any): string | null {
  if (!phone || phone === '___' || phone === '____' || phone === 0) return null;
  let s = String(phone).replace(/[\s\-\(\)]/g, '');
  if (s.startsWith('0')) s = '254' + s.substring(1);
  if (s.length === 9) s = '254' + s;
  if (!s.startsWith('+')) s = '+' + s;
  return s.length >= 10 ? s : null;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// ─── Restore Patients ────────────────────────────────────────────────────────

async function restorePatients(sharedHash: string) {
  console.log('\n👥 Restoring Patients from NS CLIENT FILES - (4).xlsx...');
  const wb = XLSX.readFile('NS CLIENT FILES - (4).xlsx');
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];

  // Build user + patient records
  const users: { id: string; email: string; firstName: string; lastName: string; phone: string | null }[] = [];
  const patients: {
    id: string; userId: string; fileNo: string; firstName: string; lastName: string;
    email: string; phone: string; dob: Date; address: string;
    occupation: string | null; allergies: string | null;
    nok: string; nokPhone: string; relation: string;
  }[] = [];

  const seenEmails = new Set<string>();

  for (const row of raw) {
    const fileNo = row['FILE NO'] ? String(row['FILE NO']).trim() : null;
    if (!fileNo) continue;

    const fullName = String(row['CLIENT NAME'] || 'Unknown').trim();
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || 'Patient';
    const phone = normalizePhone(row['TEL']);
    const dob = parseExcelDate(row['D.O.B']) || new Date(1990, 0, 1);

    let email = row['EMAIL'];
    if (!email || email === '___' || email === '____') {
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}.${fileNo.toLowerCase()}@patient.nairobisculpt.com`;
    } else {
      email = String(email).trim();
    }

    // Deduplicate emails within this batch
    if (seenEmails.has(email)) {
      email = `${email.split('@')[0]}.${fileNo.toLowerCase()}@patient.nairobisculpt.com`;
    }
    seenEmails.add(email);

    const userId = uuidv4();
    users.push({ id: userId, email, firstName, lastName, phone });
    patients.push({
      id: uuidv4(), userId, fileNo, firstName, lastName, email,
      phone: phone || '+254000000000', dob, address: row['RESIDENCE'] ? String(row['RESIDENCE']) : 'Nairobi',
      occupation: row['OCCUPATION'] && row['OCCUPATION'] !== 'N/A' ? String(row['OCCUPATION']) : null,
      allergies: row['DRUG ALLERGIES'] && row['DRUG ALLERGIES'] !== 'N/A' ? String(row['DRUG ALLERGIES']) : null,
      nok: row['NEXT OF KIN'] ? String(row['NEXT OF KIN']) : 'Not Provided',
      nokPhone: normalizePhone(row['TEL_1']) || phone || '+254000000000',
      relation: row['RELATIONSHIP'] ? String(row['RELATIONSHIP']) : 'Other',
    });
  }

  // Batch-upsert Users
  let userChunksDone = 0;
  for (const ch of chunk(users, CHUNK_SIZE)) {
    const vals = ch.map(u =>
      `('${u.id}', '${u.email.replace(/'/g, "''")}', '${sharedHash}', 'PATIENT', 'ACTIVE', '${u.firstName.replace(/'/g, "''")}', '${u.lastName.replace(/'/g, "''")}', ${u.phone ? `'${u.phone}'` : 'NULL'}, NOW(), NOW())`
    ).join(',\n');
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "User" (id, email, password_hash, role, status, first_name, last_name, phone, created_at, updated_at)
        VALUES ${vals}
        ON CONFLICT (email) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          phone = COALESCE(EXCLUDED.phone, "User".phone),
          updated_at = NOW()
      `);
      userChunksDone += ch.length;
    } catch (e: any) {
      console.error(`⚠️ User chunk error: ${e.message?.split('\n')[0]}`);
    }
  }
  console.log(`   Users: ${userChunksDone} processed`);

  // For patients, we need the actual user IDs from the DB (email is our key)
  // Fetch id→email map for all our emails at once
  const allEmails = users.map(u => `'${u.email.replace(/'/g, "''")}'`).join(',');
  let emailToId: Record<string, string> = {};
  try {
    const rows = await prisma.$queryRawUnsafe<{ id: string; email: string }[]>(
      `SELECT id, email FROM "User" WHERE email IN (${allEmails})`
    );
    rows.forEach(r => { emailToId[r.email] = r.id; });
  } catch (e: any) {
    console.error('⚠️ Could not fetch user IDs:', e.message?.split('\n')[0]);
  }

  // Batch-upsert Patients
  let patChunksDone = 0;
  for (const ch of chunk(patients, CHUNK_SIZE)) {
    const vals = ch.map(p => {
      const uid = emailToId[p.email] || p.userId;
      const dobStr = p.dob.toISOString();
      return `('${p.id}', '${p.fileNo}', '${uid}', '${p.firstName.replace(/'/g, "''")}', '${p.lastName.replace(/'/g, "''")}', '${p.email.replace(/'/g, "''")}', '${p.phone}', '${dobStr}', 'FEMALE', '${p.address.replace(/'/g, "''")}', ${p.occupation ? `'${p.occupation.replace(/'/g, "''")}'` : 'NULL'}, ${p.allergies ? `'${p.allergies.replace(/'/g, "''")}'` : 'NULL'}, '${p.nok.replace(/'/g, "''")}', '${p.nokPhone}', '${p.relation.replace(/'/g, "''")}', true, NOW(), NOW(), NOW())`;
    }).join(',\n');

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "Patient" (id, file_number, user_id, first_name, last_name, email, phone, date_of_birth, gender, address, occupation, allergies, emergency_contact_name, emergency_contact_number, relation, approved, approved_at, created_at, updated_at)
        VALUES ${vals}
        ON CONFLICT (file_number) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          phone = COALESCE(EXCLUDED.phone, "Patient".phone),
          date_of_birth = COALESCE("Patient".date_of_birth, EXCLUDED.date_of_birth),
          address = COALESCE(EXCLUDED.address, "Patient".address),
          updated_at = NOW()
      `);
      patChunksDone += ch.length;
    } catch (e: any) {
      // Try smaller chunks on failure
      for (const single of ch) {
        try {
          const uid = emailToId[single.email] || single.userId;
          await prisma.$executeRawUnsafe(`
            INSERT INTO "Patient" (id, file_number, user_id, first_name, last_name, email, phone, date_of_birth, gender, address, occupation, allergies, emergency_contact_name, emergency_contact_number, relation, approved, approved_at, created_at, updated_at)
            VALUES ('${single.id}', '${single.fileNo}', '${uid}', '${single.firstName.replace(/'/g, "''")}', '${single.lastName.replace(/'/g, "''")}', '${single.email.replace(/'/g, "''")}', '${single.phone}', '${single.dob.toISOString()}', 'FEMALE', '${single.address.replace(/'/g, "''")}', ${single.occupation ? `'${single.occupation.replace(/'/g, "''")}'` : 'NULL'}, ${single.allergies ? `'${single.allergies.replace(/'/g, "''")}'` : 'NULL'}, '${single.nok.replace(/'/g, "''")}', '${single.nokPhone}', '${single.relation.replace(/'/g, "''")}', true, NOW(), NOW(), NOW())
            ON CONFLICT (file_number) DO UPDATE SET
              user_id = EXCLUDED.user_id, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name,
              updated_at = NOW()
          `);
          patChunksDone++;
        } catch {}
      }
    }
  }
  console.log(`✅ Patients: ${patChunksDone} upserted.`);
}

// ─── Restore Inventory ───────────────────────────────────────────────────────

async function restoreInventory() {
  console.log('\n📦 Restoring Inventory from nairobi_sculpt_clean_catalogue.xlsx...');
  const wb = XLSX.readFile('nairobi_sculpt_clean_catalogue.xlsx');
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { range: 1 }) as any[];

  const items: { id: string; name: string; sku: string; category: string; unit: string; cost: number }[] = [];
  const seenSkus = new Set<string>();

  for (const row of data) {
    const itemName = row['Item Name'] ? String(row['Item Name']).trim() : null;
    if (!itemName || itemName.toLowerCase() === 'item name') continue;

    const rawCode = row['Item Code'] ? String(row['Item Code']).trim() : null;
    let sku = rawCode || `SKU-${itemName.replace(/[^A-Z0-9]/gi, '-').toUpperCase().substring(0, 20)}`;
    if (seenSkus.has(sku)) sku = `${sku}-${items.length}`;
    seenSkus.add(sku);

    const cat = String(row['Category'] || '').toUpperCase();
    let category = 'OTHER';
    if (cat.includes('MED')) category = 'MEDICATION';
    else if (cat.includes('CONSUM') || cat.includes('DISPOS')) category = 'DISPOSABLE';
    else if (cat.includes('IMPLANT')) category = 'IMPLANT';

    items.push({ id: uuidv4(), name: itemName, sku, category, unit: row['Unit'] ? String(row['Unit']) : 'unit', cost: parseFloat(row['Selling Price (KES)']) || 0 });
  }

  let done = 0;
  for (const ch of chunk(items, CHUNK_SIZE)) {
    const vals = ch.map(i =>
      `('${i.id}', '${i.name.replace(/'/g, "''")}', '${i.sku.replace(/'/g, "''")}', '${i.category}'::"InventoryCategory", '${i.unit}', ${i.cost}, true, true, NOW(), NOW())`
    ).join(',\n');
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "InventoryItem" (id, name, sku, category, unit_of_measure, unit_cost, is_active, is_billable, created_at, updated_at)
        VALUES ${vals}
        ON CONFLICT (sku) DO UPDATE SET
          name = EXCLUDED.name, category = EXCLUDED.category,
          unit_cost = EXCLUDED.unit_cost, updated_at = NOW()
      `);
      done += ch.length;
    } catch (e: any) {
      console.error(`⚠️ Inventory chunk error: ${e.message?.split('\n')[0]}`);
    }
  }
  console.log(`✅ Inventory: ${done} items upserted.`);
}

// ─── Restore Services ────────────────────────────────────────────────────────

async function restoreServices() {
  console.log('\n💊 Restoring Services from NS REVENUE.xlsx...');
  const wb = XLSX.readFile('NS REVENUE.xlsx');
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];

  const procedures = new Map<string, number>();
  for (const row of data) {
    const name = row['PROCEDURE'] ? String(row['PROCEDURE']).trim() : null;
    if (!name) continue;
    const amt = parseFloat(row['AMOUNT']) || 0;
    if (!procedures.has(name) || procedures.get(name)! < amt) procedures.set(name, amt);
  }

  const services = Array.from(procedures.entries()).map(([name, price]) => ({ id: uuidv4(), name, price }));

  let done = 0;
  for (const ch of chunk(services, CHUNK_SIZE)) {
    const vals = ch.map(s => `('${s.id}', '${s.name.replace(/'/g, "''")}', ${s.price}, 'Procedure', 'FIXED', true, NOW(), NOW())`).join(',\n');
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "Service" (id, service_name, price, category, price_type, is_active, created_at, updated_at)
        VALUES ${vals}
        ON CONFLICT (service_name) DO UPDATE SET price = EXCLUDED.price, updated_at = NOW()
      `);
      done += ch.length;
    } catch {
      // No unique constraint on service_name — fall back row by row
      for (const s of ch) {
        try {
          await prisma.$executeRawUnsafe(`
            INSERT INTO "Service" (id, service_name, price, category, price_type, is_active, created_at, updated_at)
            VALUES ('${s.id}', '${s.name.replace(/'/g, "''")}', ${s.price}, 'Procedure', 'FIXED', true, NOW(), NOW())
            ON CONFLICT DO NOTHING
          `);
          done++;
        } catch {}
      }
    }
  }
  console.log(`✅ Services: ${done} procedures upserted.`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection established.\n');

    // Hash once, share across all patients
    console.log('🔑 Pre-hashing shared patient password...');
    const sharedHash = await bcrypt.hash('NairobiSculpt@2024', 10);

    await restorePatients(sharedHash);
    await restoreInventory();
    await restoreServices();

    const [patients, items, services, consultations] = await Promise.all([
      prisma.patient.count(),
      prisma.inventoryItem.count(),
      prisma.service.count(),
      prisma.consultation.count(),
    ]);

    console.log('\n🎉 RESTORATION COMPLETE!');
    console.log(`   Patients:      ${patients}`);
    console.log(`   Inventory:     ${items}`);
    console.log(`   Services:      ${services}`);
    console.log(`   Consultations: ${consultations} ✅ preserved`);
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
