# Patient File Number Implementation

## ✅ Implementation Complete

### File Number Format
- **Format:** `NS001`, `NS002`, `NS003`, etc.
- **Prefix:** `NS` (Nairobi Sculpt)
- **Number:** Sequential, zero-padded (minimum 3 digits)
- **System-Generated:** Automatically generated when patient is created
- **Unique:** Database constraint ensures uniqueness

### Schema Changes

**Added to Patient model:**
```prisma
file_number String @unique // System-generated: NS001, NS002, etc.
whatsapp_phone String? // WhatsApp contact number (optional)
occupation String? // Patient's occupation (optional)
```

### Architecture

**Domain Layer:**
- `PatientFileNumberGenerator` service - Generates sequential file numbers
- `IPatientFileNumberRepository` interface - For querying highest file number
- `Patient` entity - Now includes `fileNumber` field with validation

**Infrastructure Layer:**
- `PrismaPatientFileNumberRepository` - Implements file number queries
- `PrismaPatientRepository` - Implements both `IPatientRepository` and `IPatientFileNumberRepository`

**Application Layer:**
- `CreatePatientUseCase` - Generates file number before creating patient
- `PatientMapper` - Handles file number in DTOs

### Workflow

1. User books consultation → `CreatePatientUseCase.execute()` called
2. Use case generates file number via `PatientFileNumberGenerator`
3. File number generated: Queries database for highest existing number, increments
4. Patient entity created with generated file number
5. Patient saved to database with `file_number` field

### Example

**First Patient:**
- File Number: `NS001`

**Second Patient:**
- File Number: `NS002`

**100th Patient:**
- File Number: `NS100`

### Database Migration Required

Run migration to add new fields:
```bash
npx prisma migrate dev --name add_patient_file_number_and_fields
```

This will:
- Add `file_number` (String, unique, required)
- Add `whatsapp_phone` (String, optional)
- Add `occupation` (String, optional)
- Create index on `file_number`

### Testing

File number generation is:
- ✅ Thread-safe (database constraint prevents duplicates)
- ✅ Sequential (always increments)
- ✅ Validated (format: NS001, NS002, etc.)
- ✅ Unique (database unique constraint)
