/**
 * Process patient CSV data and generate seed data
 * 
 * This script processes the patient data CSV and generates a TypeScript file
 * that can be imported into the seed script.
 * 
 * Usage:
 * 1. Save your patient data as a CSV file (patient-data.csv)
 * 2. Run: tsx scripts/process-patient-csv.ts
 * 3. This will generate scripts/patient-seed-data.ts
 * 4. Import that file into prisma/seed.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface RawPatientRow {
  fileNo: string;
  clientName: string;
  age?: string;
  dob?: string;
  email?: string;
  tel?: string;
  telWhatsapp?: string;
  occupation?: string;
  drugAllergies?: string;
  residence?: string;
  nextOfKin?: string;
  relationship?: string;
  emergencyTel?: string;
  drIncharge?: string;
  serviceOffered?: string;
}

interface ProcessedPatient {
  fileNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsappPhone?: string;
  dob: string; // ISO date string
  gender: 'MALE' | 'FEMALE';
  address: string;
  occupation?: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  relation: string;
  allergies?: string;
  assignedDoctorName?: string;
}

function parseDate(dateStr?: string, ageStr?: string): Date {
  if (dateStr && dateStr !== 'A' && dateStr !== '___' && dateStr.trim() !== '') {
    const clean = dateStr.trim();
    if (/^\d{4}$/.test(clean)) {
      return new Date(parseInt(clean), 0, 1);
    }
    const parts = clean.split(/[\/\-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      if (!isNaN(year) && year > 1900 && year < 2100) {
        return new Date(year, month, day || 1);
      }
    }
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  if (ageStr && !isNaN(parseFloat(ageStr))) {
    const age = parseFloat(ageStr);
    const today = new Date();
    return new Date(today.getFullYear() - Math.floor(age), 0, 1);
  }
  return new Date(new Date().getFullYear() - 30, 0, 1);
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(p => p);
  if (parts.length === 0) return { firstName: 'Unknown', lastName: 'Patient' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function normalizePhone(phone?: string): string {
  if (!phone || phone === '___' || phone.trim() === '') return '+254700000000';
  let cleaned = phone.trim().replace(/\s+/g, '');
  cleaned = cleaned.replace(/^\+/, '').replace(/^254/, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (/^\d{9}$/.test(cleaned)) return `+254${cleaned}`;
  if (/^\d{10,}$/.test(cleaned)) return `+${cleaned}`;
  return cleaned.length > 5 ? `+${cleaned}` : '+254700000000';
}

function generateEmail(firstName: string, lastName: string, fileNo: string): string {
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}`;
  return `${base}.${fileNo.toLowerCase()}@patient.nairobisculpt.com`;
}

function guessGender(firstName: string): 'MALE' | 'FEMALE' {
  const lower = firstName.toLowerCase();
  const maleNames = ['james', 'peter', 'joseph', 'amos', 'edward', 'simon', 'stephen', 'brian', 'david', 'michael', 'paul', 'richard', 'timothy', 'wilson', 'abraham', 'charles', 'sam', 'sammy', 'samwel', 'abdirisak', 'abdirisaq', 'abdirrahman', 'abdirahman', 'ahmed', 'ali', 'mohamed', 'mohammed', 'mohamud', 'osman', 'yusuf', 'ibrahim', 'mohammad', 'muhammad', 'ken', 'kennedy', 'denis', 'dennis', 'evans', 'mathew', 'matthew', 'chris', 'eric', 'francis', 'george', 'henry', 'isaac', 'jack', 'john', 'kevin', 'leonard', 'mark', 'martin', 'nicholas', 'patrick', 'robert', 'ronald', 'samuel', 'thomas', 'victor', 'william'];
  return maleNames.includes(lower) ? 'MALE' : 'FEMALE';
}

const DOCTOR_NAME_MAP: Record<string, string> = {
  'DR.MUKAMI': 'Dr. Mukami Gathariki',
  'DR.KEN': 'Dr. Ken Aluora',
  'DR.JP': 'Dr. John Paul Ogalo',
  'DR.JP OGOLA': 'Dr. John Paul Ogalo',
  'DR.ANGELA': 'Dr. Angela Muoki',
  'DR.MUOKI A': 'Dr. Angela Muoki',
  'DR.MUOKI': 'Dr. Angela Muoki',
  'DR.DORSI': 'Dr. Dorsi Jowi',
  'DR.JOWI': 'Dr. Dorsi Jowi',
  'DR.OMONDI': 'Dr. Dorsi Jowi',
  'DR.ODIRA': 'Dr. Dorsi Jowi',
  'DR.OMONDI ODIRA': 'Dr. Dorsi Jowi',
  'DR.KEN ALUORA': 'Dr. Ken Aluora',
  'DR.AREEB': 'Dr. Ken Aluora',
  'DR.ROBERT MUGO': 'Dr. Ken Aluora',
  'DR.JOYCE AWUOR': 'Dr. Angela Muoki',
};

function processRow(row: RawPatientRow): ProcessedPatient {
  const { firstName, lastName } = parseName(row.clientName);
  const dob = parseDate(row.dob, row.age);
  const phone = normalizePhone(row.tel);
  const whatsappPhone = normalizePhone(row.telWhatsapp);
  const email = row.email && row.email !== '___' && row.email.trim() !== ''
    ? row.email.trim().toLowerCase()
    : generateEmail(firstName, lastName, row.fileNo);
  
  const assignedDoctorName = row.drIncharge 
    ? DOCTOR_NAME_MAP[row.drIncharge.toUpperCase()] || row.drIncharge
    : undefined;

  return {
    fileNumber: row.fileNo,
    firstName,
    lastName,
    email,
    phone,
    whatsappPhone: whatsappPhone !== phone ? whatsappPhone : undefined,
    dob: dob.toISOString(),
    gender: guessGender(firstName),
    address: row.residence || 'Nairobi, Kenya',
    occupation: row.occupation || undefined,
    emergencyContactName: row.nextOfKin || 'Not Provided',
    emergencyContactNumber: normalizePhone(row.emergencyTel) || phone,
    relation: row.relationship || 'Not Specified',
    allergies: row.drugAllergies && 
      row.drugAllergies !== 'N/A' && 
      row.drugAllergies !== 'NONE' && 
      row.drugAllergies !== '___' &&
      row.drugAllergies.trim() !== ''
      ? row.drugAllergies
      : undefined,
    assignedDoctorName,
  };
}

// Main processing function
function processCSV(csvPath: string): ProcessedPatient[] {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Skip header row
  const dataLines = lines.slice(1);
  
  const patients: ProcessedPatient[] = [];
  
  for (const line of dataLines) {
    // Parse tab-separated or comma-separated values
    const values = line.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
    
    if (values.length < 2) continue; // Skip invalid rows
    
    const row: RawPatientRow = {
      fileNo: values[0] || '',
      clientName: values[1] || '',
      age: values[2],
      dob: values[3],
      email: values[4],
      tel: values[5],
      telWhatsapp: values[6],
      occupation: values[7],
      drugAllergies: values[8],
      residence: values[9],
      nextOfKin: values[10],
      relationship: values[11],
      emergencyTel: values[12],
      drIncharge: values[13],
      serviceOffered: values[14],
    };
    
    if (!row.fileNo || !row.clientName) continue; // Skip rows without essential data
    
    try {
      patients.push(processRow(row));
    } catch (error) {
      console.error(`Error processing row ${row.fileNo}:`, error);
    }
  }
  
  return patients;
}

// Generate TypeScript file
function generateSeedDataFile(patients: ProcessedPatient[], outputPath: string) {
  const content = `/**
 * Auto-generated patient seed data
 * Generated from patient CSV data
 * 
 * DO NOT EDIT MANUALLY - Regenerate using scripts/process-patient-csv.ts
 */

export interface PatientSeedData {
  fileNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsappPhone?: string;
  dob: Date;
  gender: 'MALE' | 'FEMALE';
  address: string;
  occupation?: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  relation: string;
  allergies?: string;
  assignedDoctorName?: string;
}

export const patientSeedData: PatientSeedData[] = ${JSON.stringify(
    patients.map(p => ({
      ...p,
      dob: new Date(p.dob).toISOString(),
    })),
    null,
    2
  ).replace(/"dob": "([^"]+)"/g, '"dob": new Date("$1")')};

// Convert to format expected by seed.ts
export function getPatientSeedData(): Array<{
  fileNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsappPhone?: string;
  dob: Date;
  gender: 'MALE' | 'FEMALE';
  address: string;
  occupation?: string;
  emergencyContact: { name: string; number: string; relation: string };
  allergies?: string;
  assignedDoctorName?: string;
}> {
  return patientSeedData.map(p => ({
    fileNumber: p.fileNumber,
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    phone: p.phone,
    whatsappPhone: p.whatsappPhone,
    dob: new Date(p.dob),
    gender: p.gender,
    address: p.address,
    occupation: p.occupation,
    emergencyContact: {
      name: p.emergencyContactName,
      number: p.emergencyContactNumber,
      relation: p.relation,
    },
    allergies: p.allergies,
    assignedDoctorName: p.assignedDoctorName,
  }));
}
`;

  fs.writeFileSync(outputPath, content, 'utf-8');
  console.log(`✅ Generated ${outputPath} with ${patients.length} patients`);
}

// Main execution
if (require.main === module) {
  const csvPath = process.argv[2] || path.join(__dirname, '../patient-data.csv');
  const outputPath = process.argv[3] || path.join(__dirname, '../scripts/patient-seed-data.ts');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    console.log('Usage: tsx scripts/process-patient-csv.ts [csv-file] [output-file]');
    process.exit(1);
  }
  
  console.log(`📖 Reading CSV from: ${csvPath}`);
  const patients = processCSV(csvPath);
  console.log(`✅ Processed ${patients.length} patients`);
  
  console.log(`📝 Generating seed data file: ${outputPath}`);
  generateSeedDataFile(patients, outputPath);
  
  console.log('\n✅ Done! Next steps:');
  console.log('1. Import patientSeedData from scripts/patient-seed-data.ts in prisma/seed.ts');
  console.log('2. Replace the patientData array with the imported data');
  console.log('3. Run: npm run db:seed');
}

export { processCSV, processRow, generateSeedDataFile };
