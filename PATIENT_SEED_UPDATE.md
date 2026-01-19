# Patient Seed File Update - Summary

## ✅ What's Been Done

1. **Updated seed file** (`prisma/seed.ts`) to:
   - Create **User accounts** for each patient (with `Role.PATIENT`)
   - Link Patient records to User accounts via `user_id`
   - Use phone number as default password (like existing workflow)
   - Map doctor names to doctor IDs for patient assignment
   - Handle missing data gracefully

2. **Added helper functions** for:
   - Parsing dates from various formats (DD/MM/YYYY, year only, age calculation)
   - Normalizing phone numbers to +254 format
   - Generating emails if missing
   - Guessing gender from first name
   - Mapping doctor names to IDs

3. **Added sample patient data** (NS001, NS002, NS003) from your actual data to demonstrate the structure

4. **Created processing scripts**:
   - `scripts/process-patient-csv.ts` - For processing CSV files
   - `scripts/generate-patient-seed.ts` - Helper utilities

## 📋 Next Steps

### Option 1: Manual Entry (Recommended for now)

Add the remaining ~697 patients to the `patientData` array in `prisma/seed.ts` following this structure:

```typescript
{
  fileNumber: 'NS004',
  firstName: 'Shamia',
  lastName: 'Nalugo',
  email: 'shamia.nalugo.ns004@patient.nairobisculpt.com', // or actual email if provided
  phone: '+254774569871',
  whatsappPhone: '+254774569871', // optional
  dob: parsePatientDate('34'), // or date string like '8/6/2002'
  gender: Gender.FEMALE, // or Gender.MALE
  address: 'Uganda', // or 'Nairobi, Kenya' if missing
  occupation: 'Business Woman', // optional
  emergencyContact: { 
    name: 'Sylvia', 
    number: '+254774117974', 
    relation: 'Sister' 
  },
  allergies: undefined, // or 'SULPHUR' if provided (not 'N/A' or 'NONE')
  assignedDoctorName: 'Dr. Mukami Gathariki', // or null if not assigned
},
```

### Option 2: CSV Processing (For bulk import)

1. Convert your patient data to a CSV file with these columns:
   - FILE NO, CLIENT NAME, AGE, D.O.B, EMAIL, TEL, TEL WHATSAPP, OCCUPATION, DRUG ALLERGIES, RESIDENCE, NEXT OF KIN, RELATIONSHIP, TEL (emergency), DR.INCHARGE, SERVICE OFFERED

2. Run the processing script:
   ```bash
   tsx scripts/process-patient-csv.ts patient-data.csv
   ```

3. This will generate `scripts/patient-seed-data.ts`

4. Import it in `prisma/seed.ts`:
   ```typescript
   import { getPatientSeedData } from '../scripts/patient-seed-data';
   const patientData = getPatientSeedData();
   ```

## 🔑 Key Features

- **User Accounts**: Each patient gets a User account they can use to log in
- **Default Password**: Phone number (without +) - patients can change this
- **Doctor Assignment**: Patients are automatically assigned to their doctor if specified
- **File Numbers**: Uses the actual file numbers from your data (NS001, NS002, etc.)
- **Missing Data Handling**: Gracefully handles missing emails, dates, addresses, etc.

## 🧪 Testing

To test with the current sample data:

```bash
export DATABASE_URL="your-aiven-connection-string"
npm run db:seed
```

This will create:
- 1 Admin user
- 5 Doctor users (with doctor records)
- 3 Nurse users
- 2 Frontdesk users
- Sample patients (currently 3 from your data + 5 original samples = 8 total)

## 📝 Notes

- **Email Generation**: If email is missing, it's generated as `firstname.lastname.fileno@patient.nairobisculpt.com`
- **Date Parsing**: Handles formats like "8/6/2002", "1941" (year only), or calculates from age
- **Phone Normalization**: Converts to +254 format automatically
- **Gender Detection**: Basic heuristic based on first name (can be overridden)
- **Allergies**: "N/A", "NONE", or missing values are treated as no allergies

## 🚀 Ready to Seed

Once you've added all patient data (or at least a good sample), run:

```bash
export DATABASE_URL="postgres://avnadmin:YOUR_AIVEN_PASSWORD@pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com:22630/defaultdb?sslmode=require"
npm run db:seed
```

The seed will:
1. Clear existing data
2. Create all users (admin, doctors, nurses, frontdesk, patients)
3. Create patient records linked to user accounts
4. Create appointments, consultations, etc.

All patients will be able to log in using their email and phone number (as password)!
