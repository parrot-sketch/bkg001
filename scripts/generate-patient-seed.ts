/**
 * Generate patient seed data from CSV
 * This script processes the patient data and generates seed code
 */

// This is a helper script - the actual patient data will be processed
// and integrated into the main seed.ts file

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

// Doctor name mapping
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

function parseDate(dateStr?: string, ageStr?: string): Date {
  if (dateStr && dateStr !== 'A' && dateStr !== '___' && dateStr.trim() !== '') {
    const clean = dateStr.trim();
    
    // Just year (e.g., "1941")
    if (/^\d{4}$/.test(clean)) {
      return new Date(parseInt(clean), 0, 1);
    }
    
    // DD/MM/YYYY or MM/DD/YYYY
    const parts = clean.split(/[\/\-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      if (!isNaN(year) && year > 1900 && year < 2100) {
        return new Date(year, month, day || 1);
      }
    }
    
    // Try standard date parsing
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  // Calculate from age
  if (ageStr && !isNaN(parseFloat(ageStr))) {
    const age = parseFloat(ageStr);
    const today = new Date();
    return new Date(today.getFullYear() - Math.floor(age), 0, 1);
  }
  
  // Default: 30 years ago
  const today = new Date();
  return new Date(today.getFullYear() - 30, 0, 1);
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(p => p);
  if (parts.length === 0) return { firstName: 'Unknown', lastName: 'Patient' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function normalizePhone(phone?: string): string | null {
  if (!phone || phone === '___' || phone.trim() === '') return null;
  let cleaned = phone.trim().replace(/\s+/g, '');
  cleaned = cleaned.replace(/^\+/, '').replace(/^254/, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (/^\d{9}$/.test(cleaned)) return `+254${cleaned}`;
  if (/^\d{10,}$/.test(cleaned)) return `+${cleaned}`;
  return cleaned.length > 5 ? `+${cleaned}` : null;
}

function generateEmail(firstName: string, lastName: string, fileNo: string): string {
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}`;
  return `${base}.${fileNo.toLowerCase()}@patient.nairobisculpt.com`;
}

function guessGender(firstName: string): 'MALE' | 'FEMALE' {
  // Basic heuristic - most patients in the list appear to be female
  // You can enhance this with a more comprehensive list
  const lower = firstName.toLowerCase();
  const maleIndicators = ['james', 'peter', 'joseph', 'amos', 'edward', 'simon', 'stephen', 'brian', 'david', 'michael', 'paul', 'richard', 'timothy', 'wilson', 'abraham', 'charles', 'ken', 'kennedy', 'sam', 'sammy', 'samwel', 'abdirisak', 'abdirisaq', 'abdirrahman', 'abdirahman', 'ahmed', 'ali', 'mohamed', 'mohammed', 'mohamud', 'osman', 'yusuf', 'ibrahim', 'mohammad', 'muhammad'];
  return maleIndicators.includes(lower) ? 'MALE' : 'FEMALE';
}

// This will be populated with the actual patient data
// For now, it's a placeholder structure
export const PATIENT_RAW_DATA: Array<{
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
}> = [];

export function processPatientData(rawData: typeof PATIENT_RAW_DATA): PatientSeedData[] {
  return rawData.map(row => {
    const { firstName, lastName } = parseName(row.clientName);
    const dob = parseDate(row.dob, row.age);
    const phone = normalizePhone(row.tel) || '+254700000000';
    const whatsappPhone = normalizePhone(row.telWhatsapp);
    const email = row.email && row.email !== '___' && row.email.trim() !== ''
      ? row.email.trim().toLowerCase()
      : generateEmail(firstName, lastName, row.fileNo);
    
    return {
      fileNumber: row.fileNo,
      firstName,
      lastName,
      email,
      phone,
      whatsappPhone: whatsappPhone || undefined,
      dob,
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
      assignedDoctorName: row.drIncharge ? DOCTOR_NAME_MAP[row.drIncharge.toUpperCase()] || row.drIncharge : undefined,
    };
  });
}
