/**
 * Production-Safe Patient Import Script
 * 
 * Imports patients from CSV file into the production database.
 * 
 * Features:
 * - Upserts patients by file_number (no duplicates)
 * - Creates User records for patients
 * - Maps doctor names to doctor IDs
 * - Handles missing/invalid data gracefully
 * - Logs progress and errors
 * 
 * Usage:
 *   DATABASE_URL="your-production-db-url" npx tsx scripts/import-patients-from-csv.ts
 * 
 * Or with npm script:
 *   npm run import:patients:production
 */

import { PrismaClient, Role, Status, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

// Doctor name mapping (CSV format -> Database name)
const DOCTOR_NAME_MAP: Record<string, string> = {
  'DR.MUKAMI': 'Dr. Mukami Gathariki',
  'DR.KEN': 'Dr. Ken Aluora',
  'DR.KEN ALUORA': 'Dr. Ken Aluora',
  'DR.JP': 'Dr. John Paul Ogalo',
  'DR.ANGELA': 'Dr. Angela Muoki',
  'DR.JOWI': 'Dr. Dorsi Jowi',
  'DR.MUOKI A': 'Dr. Angela Muoki',
  'DR.MUOKI': 'Dr. Angela Muoki',
  'DR.DORSI': 'Dr. Dorsi Jowi',
  'DR.ODIRA': 'Dr. Omondi Odir', // May need to adjust based on actual doctor
  'DR.OMONDI': 'Dr. Omondi Odir',
  'DR.OMONDI ODIRA': 'Dr. Omondi Odir',
  'DR.OCHALA': 'Dr. Ochala', // May need to adjust
  'DR.AREEB': 'Dr. Areeb', // May need to adjust
  'DR.ROBERT MUGO': 'Dr. Robert Mugo', // May need to adjust
  'DR.DANIEL': 'Dr. Daniel', // May need to adjust
  'DR. JOWI': 'Dr. Dorsi Jowi',
  'DR, MUKAMI': 'Dr. Mukami Gathariki',
  'DR. KEN': 'Dr. Ken Aluora',
  'DR. JP': 'Dr. John Paul Ogalo',
  'DR. MUKAMI': 'Dr. Mukami Gathariki',
  'DR MUKAMI': 'Dr. Mukami Gathariki',
  'DR KEN': 'Dr. Ken Aluora',
  'DR JP': 'Dr. John Paul Ogalo',
};

interface CSVRow {
  'FILE NO': string;
  'CLIENT NAME': string;
  'AGE': string;
  'D.O.B': string;
  'EMAIL': string;
  'TEL': string; // Patient phone
  'TEL WHATSAPP': string;
  'OCCUPATION': string;
  'DRUG ALLERGIES': string;
  'RESIDENCE': string;
  'NEXT OF KIN': string;
  'RELATIONSHIP': string;
  [key: string]: string | undefined; // For duplicate TEL column (emergency contact)
  'DR.INCHARGE': string;
  'SERVICE OFFERED': string;
}

interface ImportStats {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorsList: Array<{ fileNumber: string; error: string }>;
}

// Helper function to hash password
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Helper function to convert null to undefined for Prisma
function toUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

// Helper function to normalize phone number

function normalizePhone(phone: string | undefined): string | null {
  if (!phone || phone.trim() === '' || phone === '___' || phone === '____') {
    return null;
  }
  
  // Remove spaces, dashes, and other characters
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Handle scientific notation (e.g., 9.71509E+11)
  if (cleaned.includes('E+') || cleaned.includes('e+')) {
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      cleaned = Math.floor(num).toString();
    }
  }
  
  // Remove leading zeros if present
  cleaned = cleaned.replace(/^0+/, '');
  
  // Add country code if missing
  if (cleaned.length === 9 && !cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  
  // Add + prefix
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

// Helper function to normalize email
function normalizeEmail(email: string | undefined): string | null {
  if (!email || email.trim() === '' || email === '___' || email === '____' || email === '______') {
    return null;
  }
  return email.trim().toLowerCase();
}

// Helper function to parse date
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr || dateStr.trim() === '' || dateStr === '___' || dateStr === 'A') {
    return null;
  }
  
  // Handle year-only dates (e.g., "1941", "1939")
  if (/^\d{4}$/.test(dateStr.trim())) {
    const year = parseInt(dateStr.trim());
    if (year >= 1900 && year <= new Date().getFullYear()) {
      return new Date(year, 0, 1); // January 1st of that year
    }
  }
  
  // Handle DD/MM/YYYY or D/M/YYYY formats
  const datePatterns = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    /^(\d{1,2})\-(\d{1,2})\-(\d{4})$/,
  ];
  
  for (const pattern of datePatterns) {
    const match = dateStr.match(pattern);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]) - 1; // Month is 0-indexed
      const year = parseInt(match[3]);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return null;
}

// Helper function to determine gender from name (heuristic)
function inferGender(name: string): Gender {
  const nameLower = name.toLowerCase();
  const femaleIndicators = ['wanjiku', 'atieno', 'nyakiongora', 'nalugo', 'solopian', 'momanyi', 'ngugi', 'nafula', 'omae', 'christine', 'chuwa', 'molu', 'wangari', 'kipkemoi', 'ombayi', 'kemboi', 'margaret', 'kamau', 'kimani', 'ogonda', 'madelene', 'mohamed', 'onjira', 'okeyo', 'saitoti', 'wambui', 'nyaga', 'kibe', 'mwau', 'mogoruza', 'kaunga', 'gathoni', 'ali', 'gathigia', 'chege', 'mwanza', 'yusuf', 'mugo', 'ndila', 'bachie', 'mbira', 'kanyaa', 'cherono', 'mwangi', 'nyamokami', 'githeo', 'kahindi', 'umuhoza', 'omollo', 'richards', 'mabruki', 'kariara', 'too', 'omar', 'mufu', 'macharia', 'mitoko', 'thuo', 'mdivo', 'mungai', 'gachuri', 'kajuju', 'wairimu', 'nyamokami', 'muthoni', 'karani', 'migichi', 'njai', 'achieng', 'ali', 'gathigia', 'omari', 'w', 'simiyu', 'wanderi', 'biraano', 'jimal', 'nzisa', 'muriuki', 'mutua', 'muturi', 'nayanja', 'ndegwa', 'leed', 'walunya', 'karung\'o', 'mwangi', 'bo', 'kamau'];
  
  for (const indicator of femaleIndicators) {
    if (nameLower.includes(indicator)) {
      return Gender.FEMALE;
    }
  }
  
  // Default to FEMALE for this clinic (most patients are female)
  return Gender.FEMALE;
}

// Helper function to get doctor's user ID by name
async function getDoctorUserIdByName(doctorName: string | undefined): Promise<string | null> {
  if (!doctorName || doctorName.trim() === '') {
    return null;
  }
  
  // Normalize doctor name
  const normalized = doctorName.trim().toUpperCase();
  const mappedName = DOCTOR_NAME_MAP[normalized];
  
  if (!mappedName) {
    console.warn(`  ⚠️  Unknown doctor name: ${doctorName}`);
    return null;
  }
  
  const doctor = await prisma.doctor.findFirst({
    where: {
      name: {
        equals: mappedName,
        mode: 'insensitive',
      },
    },
  });
  
  if (!doctor) {
    console.warn(`  ⚠️  Doctor not found in database: ${mappedName} (from CSV: ${doctorName})`);
    return null;
  }
  
  // Return the doctor's user_id (not doctor.id) since assigned_to_user_id references User table
  return doctor.user_id;
}

// Helper function to generate email from file number and name
function generateEmail(fileNumber: string, name: string): string {
  const sanitizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.')
    .substring(0, 30);
  
  return `${sanitizedName}.${fileNumber.toLowerCase()}@patient.nairobisculpt.com`;
}

// Main import function
async function importPatients() {
  console.log('🚀 Starting patient import from CSV...\n');
  
  const csvPath = path.join(process.cwd(), 'NS CLIENT FILES - (1)(Sheet1).csv');
  
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }
  
  console.log(`📄 Reading CSV file: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  // Parse CSV (skip header row)
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as CSVRow[];
  
  console.log(`📊 Found ${records.length} records in CSV\n`);
  
  const stats: ImportStats = {
    total: records.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorsList: [],
  };
  
  // Process each record
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const fileNumber = row['FILE NO']?.trim();
    
    // Skip empty rows
    if (!fileNumber || fileNumber === '' || fileNumber.startsWith('NS7')) {
      stats.skipped++;
      continue;
    }
    
    try {
      console.log(`[${i + 1}/${records.length}] Processing ${fileNumber}...`);
      
      // Extract patient data
      const clientName = row['CLIENT NAME']?.trim() || '';
      if (!clientName) {
        stats.skipped++;
        console.log(`  ⏭️  Skipped: No client name\n`);
        continue;
      }
      
      // Parse name (assume "FIRST LAST" or "FIRST MIDDLE LAST")
      const nameParts = clientName.split(/\s+/).filter(p => p.length > 0);
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'Unknown';
      
      // Get email (use provided or generate)
      const email = normalizeEmail(row['EMAIL']) || generateEmail(fileNumber, clientName);
      
      // Check if patient already exists
      const existingPatient = await prisma.patient.findUnique({
        where: { file_number: fileNumber },
        include: { user: true },
      });
      
      // Get phone numbers
      // Note: CSV has duplicate TEL columns - first is patient phone, second (after RELATIONSHIP) is emergency contact
      const phone = normalizePhone(row['TEL']);
      const whatsappPhone = normalizePhone(row['TEL WHATSAPP']);
      
      // Parse date of birth
      const dateOfBirth = parseDate(row['D.O.B']);
      
      // Get other fields
      const occupation = row['OCCUPATION']?.trim() || null;
      const allergies = row['DRUG ALLERGIES']?.trim() || null;
      const address = row['RESIDENCE']?.trim() || null;
      const emergencyContactName = row['NEXT OF KIN']?.trim() || null;
      
      // Get emergency contact number from the duplicate TEL column (after RELATIONSHIP)
      // The CSV parser may name it differently, so we'll check multiple possibilities
      let emergencyContactNumber: string | null = null;
      const rowKeys = Object.keys(row);
      const relationshipIndex = rowKeys.indexOf('RELATIONSHIP');
      if (relationshipIndex >= 0 && relationshipIndex + 1 < rowKeys.length) {
        // The column after RELATIONSHIP should be the emergency contact TEL
        const emergencyTelKey = rowKeys[relationshipIndex + 1];
        emergencyContactNumber = normalizePhone(row[emergencyTelKey]);
      }
      // Fallback: if we can't find it, use the patient's phone
      if (!emergencyContactNumber) {
        emergencyContactNumber = phone;
      }
      
      const relation = row['RELATIONSHIP']?.trim() || null;
      const serviceOffered = row['SERVICE OFFERED']?.trim() || null;
      
      // Get assigned doctor's user ID
      const doctorName = row['DR.INCHARGE']?.trim();
      const assignedDoctorUserId = doctorName ? await getDoctorUserIdByName(doctorName) : null;
      
      // Determine gender
      const gender = inferGender(clientName);
      
      if (existingPatient) {
        // Update existing patient
        console.log(`  🔄 Updating existing patient...`);
        
        // Update patient record
        await prisma.patient.update({
          where: { file_number: fileNumber },
          data: {
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: toUndefined(phone),
            whatsapp_phone: toUndefined(whatsappPhone),
            date_of_birth: toUndefined(dateOfBirth),
            gender: gender,
            address: address || undefined,
            occupation: occupation || undefined,
            allergies: allergies && allergies !== 'NONE' && allergies !== 'N/A' ? allergies : undefined,
            emergency_contact_name: toUndefined(emergencyContactName),
            emergency_contact_number: toUndefined(emergencyContactNumber),
            relation: toUndefined(relation),
            assigned_to_user_id: assignedDoctorUserId || undefined,
          },
        });
        
        // Update user if exists
        if (existingPatient.user) {
          await prisma.user.update({
            where: { id: existingPatient.user_id! },
            data: {
              email: email,
              first_name: firstName,
              last_name: lastName,
              phone: phone,
            },
          });
        }
        
        stats.updated++;
        console.log(`  ✅ Updated patient ${fileNumber}\n`);
      } else {
        // Create new patient
        console.log(`  ➕ Creating new patient...`);
        
        // Check if patient with this email already exists
        const existingPatientByEmail = await prisma.patient.findUnique({
          where: { email: email },
        });
        
        if (existingPatientByEmail) {
          console.log(`  ⚠️  Patient with email ${email} already exists (file_number: ${existingPatientByEmail.file_number}), skipping...`);
          stats.skipped++;
          continue;
        }
        
        // Check if user with this email already exists
        let user = await prisma.user.findUnique({
          where: { email: email },
        });
        
        if (!user) {
          // Create user first
          const defaultPassword = phone?.replace('+', '') || 'defaultPassword123';
          const passwordHash = await hashPassword(defaultPassword);
          
          user = await prisma.user.create({
            data: {
              email: email,
              password_hash: passwordHash,
              role: Role.PATIENT,
              status: Status.ACTIVE,
              first_name: firstName,
              last_name: lastName,
              phone: phone,
            },
          });
        } else {
          console.log(`  ℹ️  User already exists with email: ${email}, reusing...`);
        }
        
        // Create patient record
        await prisma.patient.create({
          data: {
            file_number: fileNumber,
            user_id: user.id,
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone ?? '+254000000000', // Default phone if missing
            whatsapp_phone: whatsappPhone ?? undefined,
            date_of_birth: dateOfBirth ?? new Date(1990, 0, 1), // Default DOB if missing
            gender: gender,
            address: address || 'Nairobi, Kenya',
            occupation: occupation || undefined,
            allergies: allergies && allergies !== 'NONE' && allergies !== 'N/A' ? allergies : undefined,
            emergency_contact_name: emergencyContactName || 'Not Provided',
            emergency_contact_number: emergencyContactNumber ?? phone ?? '+254000000000',
            relation: relation || 'Not Specified',
            marital_status: 'Not Specified', // Not in CSV, default value
            assigned_to_user_id: assignedDoctorUserId || undefined,
            privacy_consent: true,
            service_consent: true,
            medical_consent: true,
            approved: true, // Auto-approve imported patients
            approved_at: new Date(),
          },
        });
        
        stats.created++;
        console.log(`  ✅ Created patient ${fileNumber} (${email})\n`);
      }
    } catch (error: any) {
      stats.errors++;
      const errorMsg = error.message || String(error);
      stats.errorsList.push({ fileNumber: fileNumber || 'UNKNOWN', error: errorMsg });
      console.error(`  ❌ Error processing ${fileNumber}: ${errorMsg}\n`);
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total records:     ${stats.total}`);
  console.log(`Created:           ${stats.created}`);
  console.log(`Updated:           ${stats.updated}`);
  console.log(`Skipped:           ${stats.skipped}`);
  console.log(`Errors:            ${stats.errors}`);
  console.log('='.repeat(60));
  
  if (stats.errorsList.length > 0) {
    console.log('\n❌ ERRORS:');
    stats.errorsList.forEach(({ fileNumber, error }) => {
      console.log(`  - ${fileNumber}: ${error}`);
    });
  }
  
  console.log('\n✅ Import completed!\n');
}

// Run import
importPatients()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('❌ Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });