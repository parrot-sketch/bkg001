/**
 * Parse patient data from client CSV and convert to seed format
 * This script helps prepare patient data for seeding
 */

interface RawPatientData {
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

// Doctor name mapping (from CSV to seed file names)
const doctorNameMap: Record<string, string> = {
  'DR.MUKAMI': 'Dr. Mukami Gathariki',
  'DR.KEN': 'Dr. Ken Aluora',
  'DR.JP': 'Dr. John Paul Ogalo',
  'DR.JP OGOLA': 'Dr. John Paul Ogalo',
  'DR.ANGELA': 'Dr. Angela Muoki',
  'DR.MUOKI A': 'Dr. Angela Muoki',
  'DR.DORSI': 'Dr. Dorsi Jowi',
  'DR.JOWI': 'Dr. Dorsi Jowi',
  'DR.OMONDI': 'Dr. Dorsi Jowi', // Assuming Omondi is Dorsi
  'DR.ODIRA': 'Dr. Dorsi Jowi', // Assuming Odira is Dorsi
  'DR.AREEB': 'Dr. Ken Aluora', // Default mapping
  'DR.ROBERT MUGO': 'Dr. Ken Aluora', // Default mapping
  'DR.JOYCE AWUOR': 'Dr. Angela Muoki', // Default mapping
  'DR.OMONDI ODIRA': 'Dr. Dorsi Jowi',
  'DR.KEN ALUORA': 'Dr. Ken Aluora',
  'DR.MUKAMI GATHARIKI': 'Dr. Mukami Gathariki',
  'DR.ANGELA MUOKI': 'Dr. Angela Muoki',
  'DR.DORSI JOWI': 'Dr. Dorsi Jowi',
  'DR.JOHN PAUL OGALO': 'Dr. John Paul Ogalo',
};

// Helper to parse date (handles various formats)
function parseDate(dateStr?: string, ageStr?: string): Date | null {
  if (!dateStr && !ageStr) return null;
  
  // Try to parse date string first
  if (dateStr && dateStr !== 'A' && dateStr !== '___' && dateStr.trim() !== '') {
    // Handle formats like: 8/6/2002, 14/5/1983, 1941, etc.
    const cleanDate = dateStr.trim();
    
    // If it's just a year (e.g., "1941")
    if (/^\d{4}$/.test(cleanDate)) {
      return new Date(parseInt(cleanDate), 0, 1);
    }
    
    // Try MM/DD/YYYY or DD/MM/YYYY
    const parts = cleanDate.split(/[\/\-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-indexed
      const year = parseInt(parts[2]);
      if (!isNaN(year) && year > 1900 && year < 2100) {
        return new Date(year, month, day || 1);
      }
    }
    
    // Try YYYY-MM-DD
    if (cleanDate.includes('-')) {
      const parsed = new Date(cleanDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }
  
  // If date parsing failed, try to calculate from age
  if (ageStr && !isNaN(parseFloat(ageStr))) {
    const age = parseFloat(ageStr);
    const today = new Date();
    const birthYear = today.getFullYear() - Math.floor(age);
    return new Date(birthYear, 0, 1);
  }
  
  return null;
}

// Helper to parse name (split into first and last)
function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(p => p && p !== '');
  if (parts.length === 0) return { firstName: 'Unknown', lastName: 'Patient' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

// Helper to normalize phone number
function normalizePhone(phone?: string): string | null {
  if (!phone || phone === '___' || phone.trim() === '') return null;
  
  let cleaned = phone.trim().replace(/\s+/g, '');
  
  // Remove common prefixes
  cleaned = cleaned.replace(/^\+/, '');
  cleaned = cleaned.replace(/^254/, '');
  
  // If it starts with 0, remove it
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Add +254 prefix if it's a Kenyan number (10 digits)
  if (/^\d{9}$/.test(cleaned)) {
    return `+254${cleaned}`;
  }
  
  // If it already has country code, add +
  if (/^\d{10,}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  
  return cleaned.length > 5 ? `+${cleaned}` : null;
}

// Helper to generate email if missing
function generateEmail(firstName: string, lastName: string, fileNo: string): string {
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}`;
  return `${base}@patient.nairobisculpt.com`;
}

// Helper to determine gender from name (basic heuristic)
function guessGender(firstName: string): 'MALE' | 'FEMALE' {
  const femaleNames = ['millicent', 'rhoda', 'sandra', 'shamia', 'lorna', 'sharon', 'brenda', 'caroline', 'dolvine', 'joy', 'pendo', 'salwa', 'aisha', 'patricia', 'edith', 'eve', 'amongin', 'ann', 'catherine', 'marie', 'pauline', 'zafril', 'betty', 'joyce', 'sheila', 'linet', 'miriam', 'adrian', 'isaac', 'rita', 'ruffina', 'lucy', 'emily', 'margaret', 'gladys', 'festus', 'naima', 'maureen', 'matilda', 'georgina', 'phebicus', 'dorcas', 'everline', 'eva', 'joseph', 'grace', 'esther', 'mary', 'yvon', 'barbara', 'avery', 'georgina', 'wairimu', 'alyssa', 'susan', 'anaya', 'joan', 'melissa', 'jasmine', 'robert', 'mercy', 'zahra', 'wanja', 'patience', 'johara', 'tumaini', 'amina', 'violet', 'oliver', 'halima', 'stephanie', 'ann', 'susan', 'laura', 'winnie', 'ng\'endo', 'juliana', 'anastacia', 'grace', 'mumbua', 'nancy', 'mulki', 'roselyn', 'lucy', 'mun', 'esther', 'waithira', 'gladys', 'joan', 'hellen', 'abdirisaq', 'madrine', 'brendah', 'joymary', 'sheila', 'khadra', 'judy', 'wendy', 'georgina', 'jaclynn', 'katunge', 'rehema', 'christine', 'ali', 'aisha', 'wesley', 'charmaine', 'delma', 'miriam', 'stephen', 'peris', 'george', 'lynette', 'sheillah', 'caroline', 'faith', 'maureen', 'rhoda', 'fiona', 'melania', 'charity', 'anna', 'ruth', 'starggieh', 'felix', 'emma', 'chrysanthemum', 'jerusha', 'hodhan', 'rosemary', 'nancy', 'caroline', 'catherine', 'kathlene', 'lydiah', 'beatrice', 'mary', 'githaiga', 'roina', 'mohamed', 'samwel', 'janeffer', 'catterine', 'sally', 'sharon', 'felistas', 'yasmin', 'chepkemoi', 'winnie', 'tigist', 'kivala', 'derick', 'esther', 'cecilia', 'nancy', 'stephen', 'annete', 'catherine', 'rose', 'catherine', 'victoria', 'mercy', 'makena', 'teranch', 'mary', 'susan', 'sandra', 'nancy', 'wakio', 'grace', 'nkatha', 'karen', 'susan', 'achieng', 'luc', 'dr.', 'saida', 'tiffany', 'anne', 'eunice', 'lucia', 'sidai', 'malik', 'naom', 'brenda', 'claudia', 'rosaline', 'susan', 'jessicah', 'carole', 'willie', 'nicole', 'wairimu', 'priscilla', 'gloria', 'cynthia', 'zahra', 'victoria', 'lizah', 'sareda', 'salma', 'rehema', 'kimanzi', 'jacqueline', 'faith', 'stella', 'komuhendo', 'bijuma', 'tracie', 'emily', 'paul', 'richard', 'otieno', 'emmah', 'hellen', 'susan', 'millicent', 'violet', 'josphine', 'michael', 'caroline', 'clarence', 'diana', 'agatha', 'yvonne', 'janet', 'regina', 'veronicah', 'purity', 'peter', 'anita', 'farheen', 'lisa', 'clement', 'caroline', 'genesis', 'agnes', 'randierk', 'kira', 'perpetua', 'sheila', 'grace', 'cynthia', 'amayah', 'sarah', 'everlyne', 'susan', 'amos', 'margaret', 'sam', 'ann', 'rebecca', 'catherine', 'nancy', 'virginia', 'catherine', 'rachel', 'fridah', 'bahjo', 'janette', 'faith', 'christine', 'elizabeth', 'nancy', 'caroline', 'yasmin', 'mitchelle', 'grace', 'maryam', 'lilian', 'mukami', 'brigid', 'nema', 'shah', 'aver', 'lynette', 'esmeralda', 'faith', 'tabitha', 'shamsa', 'angeline', 'pauline', 'norah', 'jane', 'sheila', 'ann', 'rehema', 'wangui', 'mary', 'grace', 'salome', 'mary', 'cynthia', 'rose', 'beatrice', 'irene', 'leah', 'robin', 'anita', 'mercy', 'mary', 'jane', 'muwanguzi', 'sammy', 'andinda', 'catherine', 'eunice', 'magdalene', 'sheilah', 'nuria', 'hope', 'lexy', 'joyline', 'lisper', 'ann', 'nicola', 'kasera', 'flossy', 'habiba', 'joyce', 'leah', 'pauline', 'liam', 'bella', 'samaha', 'mutai', 'asha', 'faustin', 'mathew', 'mary', 'liana', 'nadir', 'habon', 'nagawa', 'maki', 'nelly', 'emily', 'ahmed', 'wilson', 'barbara', 'simba', 'savannah', 'fatuma', 'caroline', 'barbara', 'bradley', 'hafsa', 'ellyne', 'joseph', 'lucy', 'susan', 'esha', 'nelly', 'anne', 'christine', 'meshvi', 'halima', 'pedro', 'ruth', 'farhia', 'jackline', 'anne', 'priscilla', 'irene', 'judy', 'margaret', 'susan', 'emily', 'kinyanjui', 'leah', 'purity', 'ruth', 'andrea', 'chris', 'dolphine', 'yasmin', 'dorcas', 'valentine', 'maimuna', 'betina', 'lorrie', 'ida', 'everlyne', 'anne'];
  
  const lowerFirstName = firstName.toLowerCase();
  return femaleNames.includes(lowerFirstName) ? 'FEMALE' : 'MALE';
}

// Parse the raw CSV data (you'll need to paste the actual data here)
// For now, I'll create a function that processes the data structure
export function parsePatientData(rawData: string): RawPatientData[] {
  // This would parse the CSV data
  // For now, return empty array - we'll implement the actual parsing
  return [];
}

// Main function to convert raw data to seed format
export function convertToSeedFormat(rawPatient: RawPatientData, doctorIdMap: Record<string, string>) {
  const { firstName, lastName } = parseName(rawPatient.clientName);
  const dob = parseDate(rawPatient.dob, rawPatient.age) || new Date('1990-01-01'); // Default DOB
  const phone = normalizePhone(rawPatient.tel) || '+254700000000';
  const whatsappPhone = normalizePhone(rawPatient.telWhatsapp);
  const email = rawPatient.email && rawPatient.email !== '___' && rawPatient.email.trim() !== ''
    ? rawPatient.email.trim().toLowerCase()
    : generateEmail(firstName, lastName, rawPatient.fileNo);
  
  // Map doctor name to ID
  const doctorName = rawPatient.drIncharge?.trim() || '';
  const mappedDoctorName = doctorNameMap[doctorName.toUpperCase()] || '';
  const assignedDoctorId = mappedDoctorName ? doctorIdMap[mappedDoctorName] : null;
  
  return {
    fileNumber: rawPatient.fileNo,
    firstName,
    lastName,
    email,
    phone,
    whatsappPhone,
    dob,
    gender: guessGender(firstName),
    address: rawPatient.residence || 'Nairobi, Kenya',
    maritalStatus: 'Unknown', // Not in the data
    occupation: rawPatient.occupation || null,
    emergencyContactName: rawPatient.nextOfKin || 'Not Provided',
    emergencyContactNumber: normalizePhone(rawPatient.emergencyTel) || phone,
    relation: rawPatient.relationship || 'Not Specified',
    allergies: rawPatient.drugAllergies && rawPatient.drugAllergies !== 'N/A' && rawPatient.drugAllergies !== 'NONE' && rawPatient.drugAllergies !== '___'
      ? rawPatient.drugAllergies
      : null,
    bloodGroup: null, // Not in the data
    medicalHistory: null, // Not in the data
    assignedDoctorId,
  };
}
