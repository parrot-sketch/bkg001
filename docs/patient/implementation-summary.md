# Patient Intake Implementation Summary

## ✅ Completed

### 1. Schema Updates

**Added Fields:**
- `file_number` (String, unique, required) - System-generated: NS001, NS002, NS003, etc.
- `whatsapp_phone` (String, optional) - WhatsApp contact number
- `occupation` (String, optional) - Patient's occupation

**Schema Status:** ✅ Complete - All Excel columns now mapped

### 2. File Number Generation

**Implementation:**
- `PatientFileNumberGenerator` service - Generates sequential file numbers
- `IPatientFileNumberRepository` interface - For querying highest file number
- `PrismaPatientRepository` implements both interfaces
- `CreatePatientUseCase` automatically generates file number before creating patient

**Format:** NS001, NS002, NS003, etc. (NS prefix + sequential number)

**Features:**
- ✅ Thread-safe (database unique constraint)
- ✅ Sequential (always increments)
- ✅ Format validated (NS + digits)
- ✅ Auto-generated (not from client)

### 3. Domain Layer Updates

**Patient Entity:**
- Added `fileNumber` field (required, validated format)
- Added `whatsappPhone` field (optional)
- Added `occupation` field (optional)
- Added getters: `getFileNumber()`, `getWhatsappPhone()`, `getOccupation()`

**Validation:**
- File number format: `/^NS\d+$/` (NS followed by digits)
- All required fields validated
- Optional fields handled correctly

### 4. Application Layer Updates

**CreatePatientUseCase:**
- Generates file number before creating patient
- Uses `PatientFileNumberGenerator` service
- File number generation is automatic and transparent

**DTOs:**
- `CreatePatientDto` - Added `whatsappPhone?` and `occupation?`
- `PatientResponseDto` - Added `fileNumber`, `whatsappPhone?`, `occupation?`

**Mappers:**
- `PatientMapper` (application) - Handles file number generation
- `PatientMapper` (infrastructure) - Maps file number to/from Prisma

### 5. Infrastructure Layer Updates

**PrismaPatientRepository:**
- Implements `IPatientFileNumberRepository`
- `findHighestFileNumber()` method queries database for highest file number
- Handles file number extraction and comparison

**Prisma Mappers:**
- Maps `file_number` to/from database
- Maps `whatsapp_phone` and `occupation` fields

## 📋 Next Steps

### 1. Create Database Migration

```bash
npx prisma migrate dev --name add_patient_file_number_and_fields
```

This will:
- Add `file_number` column (String, unique, required)
- Add `whatsapp_phone` column (String, optional)
- Add `occupation` column (String, optional)
- Create index on `file_number`

### 2. Update Existing Patients (If Any)

If you have existing patients in the database, you'll need to:
1. Generate file numbers for them (NS001, NS002, etc.)
2. Update their records with file numbers

**Migration Script Needed:**
```sql
-- Example: Update existing patients with file numbers
-- This should be done carefully to maintain sequential order
```

### 3. Patient Intake Workflow

**Where Intake Begins:** `/portal/consultation/start`

**Progressive Flow:**
1. Basic Identity (name, email, phone, DOB, gender)
2. Service Selection (service/concern, preferred doctor)
3. Contact Details (address, WhatsApp, emergency contact)
4. Medical Basics (occupation, allergies, conditions)
5. Appointment Scheduling (date, time, notes)
6. Consent (privacy, service, medical)
7. Confirmation (review and submit)

**Result:**
- Creates `Patient` record with generated file number
- Creates `Appointment` with PENDING status
- User becomes "Patient" → Redirects to `/patient/dashboard`

## 🎯 Architecture Confirmation

### Data Flow

```
User Books Consultation
  ↓
CreatePatientUseCase.execute()
  ↓
PatientFileNumberGenerator.generateNext()
  ↓ (queries database for highest file number)
  ↓ (increments: NS001 → NS002)
  ↓
Patient.create({ fileNumber: "NS002", ... })
  ↓
PatientRepository.save(patient)
  ↓
Patient record created with file_number = "NS002"
```

### File Number Generation Logic

1. Query database: `SELECT file_number FROM patient ORDER BY created_at DESC`
2. Extract highest number: "NS042" → 42
3. Increment: 42 + 1 = 43
4. Format: "NS" + "043" = "NS043"
5. Validate format: `/^NS\d+$/`
6. Save with unique constraint (prevents duplicates)

## ✅ Verification Checklist

- [x] Schema updated with `file_number`, `whatsapp_phone`, `occupation`
- [x] Patient entity includes file number field
- [x] File number generator service created
- [x] CreatePatientUseCase generates file number
- [x] DTOs updated with new fields
- [x] Mappers handle file number
- [x] Repository implements file number queries
- [ ] **Migration created** (next step)
- [ ] **Tests updated** (recommended)
- [ ] **UI forms updated** (for intake workflow)

## 📝 Notes

- File number is **system-generated only** - never from client
- Format is **immutable** - NS001, NS002, etc.
- **Unique constraint** prevents duplicates
- **Sequential** - always increments
- **Thread-safe** - database constraint handles concurrency
