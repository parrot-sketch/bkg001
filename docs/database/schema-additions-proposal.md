# Schema Additions Proposal
## Minimal Additive Tables for Enhanced Doctor Workflows

**Last Updated:** January 2025  
**Status:** Proposal  
**Scope:** Doctor Onboarding, Dictation, Doctor-to-Doctor Consults, Surgery Workflows

---

## Overview

This document proposes **minimal additive tables** to support four key workflows:
1. **Doctor Onboarding** - Enhanced tracking and documentation
2. **Dictation** - Voice recording and transcription management
3. **Doctor-to-Doctor Consults** - Inter-physician consultation workflow
4. **Surgery Workflows** - Surgical procedure lifecycle management

**Design Principles:**
- ✅ **Additive Only** - No modifications to existing tables
- ✅ **Minimal** - Only essential fields and relationships
- ✅ **Backward Compatible** - Existing functionality remains unchanged
- ✅ **Extensible** - Can be enhanced later without breaking changes

---

## Current Schema Analysis

### Existing Doctor Onboarding Support
- ✅ `Doctor.onboarding_status` (enum: INVITED, ACTIVATED, PROFILE_COMPLETED, ACTIVE)
- ✅ `Doctor.invited_at`, `activated_at`, `profile_completed_at`
- ✅ `Doctor.invited_by` (User ID)
- ✅ `DoctorInviteToken` model for activation

**Gaps:**
- ❌ No onboarding task checklist
- ❌ No onboarding document attachments
- ❌ No onboarding notes/comments

### Existing Consultation Support
- ✅ `Consultation` model (one-to-one with Appointment)
- ✅ `Consultation.doctor_notes` (text field)
- ✅ `Consultation.outcome`, `follow_up_date`, `follow_up_notes`

**Gaps:**
- ❌ No voice dictation/transcription
- ❌ No doctor-to-doctor consultation workflow
- ❌ No structured surgery/procedure tracking

### Existing Appointment Support
- ✅ `Appointment` model with status tracking
- ✅ `Appointment.type` (string: "Consultation", "Follow-up", "Procedure", etc.)
- ✅ `CareNote` with `CareNoteType` enum (PRE_OP, POST_OP, GENERAL)

**Gaps:**
- ❌ No dedicated surgery/procedure model
- ❌ No surgery team assignments
- ❌ No pre-op/post-op structured workflows

---

## Proposed Additions

### 1. Doctor Onboarding Enhancements

#### 1.1 `DoctorOnboardingTask` Model
**Purpose:** Track onboarding checklist items and completion status

```prisma
model DoctorOnboardingTask {
  id                String   @id @default(uuid())
  doctor_id         String
  task_name         String   // e.g., "Complete Profile", "Upload License", "Set Availability"
  task_category     String?  // e.g., "Profile", "Documents", "Settings"
  description       String?
  is_required       Boolean  @default(true)
  is_completed      Boolean  @default(false)
  completed_at      DateTime?
  completed_by      String?  // User ID (usually the doctor themselves)
  notes             String?  // Admin notes or doctor notes
  assigned_by       String?  // User ID of admin who assigned task
  due_date          DateTime?

  doctor            Doctor   @relation(fields: [doctor_id], references: [id], onDelete: Cascade)

  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  @@index([doctor_id])
  @@index([is_completed])
  @@index([task_category])
  @@index([doctor_id, is_completed])
}
```

**Add to Doctor model:**
```prisma
model Doctor {
  // ... existing fields ...
  onboarding_tasks  DoctorOnboardingTask[]
}
```

#### 1.2 `DoctorOnboardingDocument` Model
**Purpose:** Store onboarding-related documents (license, certificates, etc.)

```prisma
model DoctorOnboardingDocument {
  id                String   @id @default(uuid())
  doctor_id         String
  document_type     String   // e.g., "LICENSE", "CERTIFICATE", "ID", "CONTRACT"
  file_name         String
  file_path         String   // URL or storage path
  file_size         Int?     // bytes
  mime_type         String?  // e.g., "application/pdf", "image/jpeg"
  uploaded_by       String   // User ID
  verified          Boolean  @default(false)
  verified_by       String? // User ID of admin who verified
  verified_at       DateTime?
  notes             String?

  doctor            Doctor   @relation(fields: [doctor_id], references: [id], onDelete: Cascade)

  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt

  @@index([doctor_id])
  @@index([document_type])
  @@index([verified])
  @@index([doctor_id, verified])
}
```

**Add to Doctor model:**
```prisma
model Doctor {
  // ... existing fields ...
  onboarding_documents DoctorOnboardingDocument[]
}
```

---

### 2. Dictation Support

#### 2.1 `Dictation` Model
**Purpose:** Store voice recordings and transcription data

```prisma
enum DictationStatus {
  RECORDING
  PROCESSING
  TRANSCRIBED
  REVIEWED
  ARCHIVED
}

model Dictation {
  id                String          @id @default(uuid())
  doctor_id         String
  patient_id         String?
  appointment_id    Int?
  consultation_id   Int?
  medical_record_id Int?
  
  // Recording metadata
  audio_file_path   String?         // URL or storage path
  audio_file_size   Int?            // bytes
  duration_seconds  Int?            // Recording duration
  
  // Transcription
  transcription     String?         @db.Text
  transcription_raw String?         @db.Text // Raw transcription before editing
  transcription_service String?    // e.g., "AWS_TRANSCRIBE", "GOOGLE_SPEECH", "MANUAL"
  
  // Status and workflow
  status            DictationStatus @default(RECORDING)
  recorded_at       DateTime        @default(now())
  transcribed_at    DateTime?
  reviewed_at       DateTime?
  reviewed_by       String?        // User ID
  
  // Context
  notes             String?         @db.Text
  tags              String?         // Comma-separated tags for categorization
  
  // Relations
  doctor            Doctor          @relation(fields: [doctor_id], references: [id], onDelete: Cascade)
  patient           Patient?        @relation(fields: [patient_id], references: [id], onDelete: SetNull)
  appointment       Appointment?     @relation(fields: [appointment_id], references: [id], onDelete: SetNull)
  consultation      Consultation?   @relation(fields: [consultation_id], references: [id], onDelete: SetNull)
  medical_record    MedicalRecord?  @relation(fields: [medical_record_id], references: [id], onDelete: SetNull)

  created_at        DateTime        @default(now())
  updated_at        DateTime        @updatedAt

  @@index([doctor_id])
  @@index([patient_id])
  @@index([appointment_id])
  @@index([consultation_id])
  @@index([status])
  @@index([recorded_at])
  @@index([doctor_id, status])
}
```

**Add to related models:**
```prisma
model Doctor {
  // ... existing fields ...
  dictations        Dictation[]
}

model Patient {
  // ... existing fields ...
  dictations        Dictation[]
}

model Appointment {
  // ... existing fields ...
  dictations        Dictation[]
}

model Consultation {
  // ... existing fields ...
  dictations        Dictation[]
}

model MedicalRecord {
  // ... existing fields ...
  dictations        Dictation[]
}
```

---

### 3. Doctor-to-Doctor Consults

#### 3.1 `DoctorConsult` Model
**Purpose:** Track inter-physician consultation requests and responses

```prisma
enum DoctorConsultStatus {
  REQUESTED
  IN_REVIEW
  RESPONDED
  CLOSED
  CANCELLED
}

enum DoctorConsultPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

model DoctorConsult {
  id                String              @id @default(uuid())
  
  // Participants
  requesting_doctor_id String           // Doctor requesting consult
  consulting_doctor_id  String          // Doctor being consulted
  patient_id            String          // Patient in question
  
  // Context
  appointment_id       Int?             // Related appointment (if any)
  consultation_id      Int?             // Related consultation (if any)
  medical_record_id    Int?             // Related medical record (if any)
  
  // Request details
  subject              String           // Brief subject/title
  question             String           @db.Text // Clinical question or concern
  clinical_context     String?          @db.Text // Relevant patient history/context
  priority             DoctorConsultPriority @default(NORMAL)
  
  // Response
  response             String?          @db.Text // Consulting doctor's response
  recommendations      String?          @db.Text // Treatment recommendations
  responded_at         DateTime?
  
  // Status
  status               DoctorConsultStatus @default(REQUESTED)
  requested_at         DateTime         @default(now())
  reviewed_at          DateTime?
  closed_at            DateTime?
  
  // Metadata
  notes                String?          @db.Text
  attachments          String?         // JSON array of file paths/URLs
  
  // Relations
  requesting_doctor    Doctor           @relation("RequestingDoctorConsults", fields: [requesting_doctor_id], references: [id], onDelete: Cascade)
  consulting_doctor     Doctor           @relation("ConsultingDoctorConsults", fields: [consulting_doctor_id], references: [id], onDelete: Cascade)
  patient               Patient          @relation(fields: [patient_id], references: [id], onDelete: Cascade)
  appointment           Appointment?     @relation(fields: [appointment_id], references: [id], onDelete: SetNull)
  consultation          Consultation?   @relation(fields: [consultation_id], references: [id], onDelete: SetNull)
  medical_record        MedicalRecord?  @relation(fields: [medical_record_id], references: [id], onDelete: SetNull)

  created_at           DateTime         @default(now())
  updated_at           DateTime         @updatedAt

  @@index([requesting_doctor_id])
  @@index([consulting_doctor_id])
  @@index([patient_id])
  @@index([status])
  @@index([priority])
  @@index([requested_at])
  @@index([requesting_doctor_id, status])
  @@index([consulting_doctor_id, status])
}
```

**Add to related models:**
```prisma
model Doctor {
  // ... existing fields ...
  requesting_consults  DoctorConsult[] @relation("RequestingDoctorConsults")
  consulting_consults  DoctorConsult[] @relation("ConsultingDoctorConsults")
}

model Patient {
  // ... existing fields ...
  doctor_consults     DoctorConsult[]
}

model Appointment {
  // ... existing fields ...
  doctor_consults     DoctorConsult[]
}

model Consultation {
  // ... existing fields ...
  doctor_consults     DoctorConsult[]
}

model MedicalRecord {
  // ... existing fields ...
  doctor_consults     DoctorConsult[]
}
```

---

### 4. Surgery Workflows

#### 4.1 `Surgery` Model
**Purpose:** Track surgical procedures separately from general appointments

```prisma
enum SurgeryStatus {
  SCHEDULED
  IN_PREP
  IN_PROGRESS
  COMPLETED
  CANCELLED
  POSTPONED
}

enum SurgeryType {
  ELECTIVE
  URGENT
  EMERGENCY
}

model Surgery {
  id                  String          @id @default(uuid())
  patient_id          String
  primary_doctor_id   String          // Primary surgeon
  appointment_id      Int?            // Link to appointment if scheduled via appointment
  
  // Surgery details
  surgery_name        String          // Procedure name
  surgery_type        SurgeryType     @default(ELECTIVE)
  description         String?         @db.Text
  estimated_duration  Int?            // minutes
  
  // Scheduling
  scheduled_date      DateTime
  scheduled_time      String          // HH:mm format
  actual_start_time   DateTime?
  actual_end_time     DateTime?
  
  // Status
  status              SurgeryStatus  @default(SCHEDULED)
  scheduled_at         DateTime       @default(now())
  completed_at        DateTime?
  cancelled_at        DateTime?
  cancellation_reason String?        @db.Text
  
  // Pre-op
  pre_op_notes        String?         @db.Text
  pre_op_checklist_completed Boolean @default(false)
  pre_op_completed_at DateTime?
  
  // Post-op
  post_op_notes       String?         @db.Text
  post_op_completed_at DateTime?
  follow_up_required  Boolean         @default(true)
  follow_up_date      DateTime?
  
  // Anesthesia
  anesthesia_type     String?         // e.g., "General", "Local", "Sedation"
  anesthesiologist_id String?         // Doctor ID (if different from primary)
  
  // Location
  operating_room      String?         // Room number/identifier
  facility_location   String?         // If multiple locations
  
  // Relations
  patient             Patient         @relation(fields: [patient_id], references: [id], onDelete: Cascade)
  primary_doctor      Doctor          @relation("PrimarySurgeonSurgeries", fields: [primary_doctor_id], references: [id], onDelete: Cascade)
  anesthesiologist    Doctor?         @relation("AnesthesiologistSurgeries", fields: [anesthesiologist_id], references: [id], onDelete: SetNull)
  appointment         Appointment?    @relation(fields: [appointment_id], references: [id], onDelete: SetNull)
  surgery_team        SurgeryTeamMember[]
  surgery_notes       SurgeryNote[]
  surgery_complications SurgeryComplication[]

  created_at          DateTime        @default(now())
  updated_at          DateTime        @updatedAt

  @@index([patient_id])
  @@index([primary_doctor_id])
  @@index([scheduled_date])
  @@index([status])
  @@index([surgery_type])
  @@index([scheduled_date, status])
  @@index([primary_doctor_id, scheduled_date])
}
```

#### 4.2 `SurgeryTeamMember` Model
**Purpose:** Track surgery team assignments (assistant surgeons, nurses, etc.)

```prisma
enum SurgeryTeamRole {
  PRIMARY_SURGEON
  ASSISTANT_SURGEON
  SCRUB_NURSE
  CIRCULATING_NURSE
  ANESTHESIOLOGIST
  SURGICAL_TECH
  OBSERVER
}

model SurgeryTeamMember {
  id                  Int             @id @default(autoincrement())
  surgery_id          String
  user_id             String          // User ID (doctor or nurse)
  role                SurgeryTeamRole
  confirmed           Boolean         @default(false)
  confirmed_at        DateTime?
  notes               String?

  surgery             Surgery         @relation(fields: [surgery_id], references: [id], onDelete: Cascade)
  user                User            @relation(fields: [user_id], references: [id], onDelete: Cascade)

  created_at          DateTime        @default(now())
  updated_at          DateTime        @updatedAt

  @@unique([surgery_id, user_id])
  @@index([surgery_id])
  @@index([user_id])
  @@index([role])
}
```

#### 4.3 `SurgeryNote` Model
**Purpose:** Structured notes during surgery (pre-op, intra-op, post-op)

```prisma
enum SurgeryNoteType {
  PRE_OP
  INTRA_OP
  POST_OP
}

model SurgeryNote {
  id                  Int             @id @default(autoincrement())
  surgery_id          String
  doctor_id            String
  note_type           SurgeryNoteType
  note                String          @db.Text
  recorded_at          DateTime        @default(now())
  is_final             Boolean         @default(false) // Can edit until marked final

  surgery             Surgery         @relation(fields: [surgery_id], references: [id], onDelete: Cascade)
  doctor              Doctor          @relation(fields: [doctor_id], references: [id], onDelete: Cascade)

  created_at          DateTime        @default(now())
  updated_at          DateTime        @updatedAt

  @@index([surgery_id])
  @@index([doctor_id])
  @@index([note_type])
  @@index([recorded_at])
  @@index([surgery_id, note_type])
}
```

#### 4.4 `SurgeryComplication` Model
**Purpose:** Track complications during or after surgery

```prisma
enum ComplicationSeverity {
  MINOR
  MODERATE
  SEVERE
  CRITICAL
}

model SurgeryComplication {
  id                  Int             @id @default(autoincrement())
  surgery_id          String
  complication_type   String          // e.g., "Bleeding", "Infection", "Anesthesia"
  description         String          @db.Text
  severity            ComplicationSeverity
  occurred_at         DateTime        // When complication occurred
  resolved_at         DateTime?
  resolution_notes    String?         @db.Text
  reported_by         String          // User ID

  surgery             Surgery         @relation(fields: [surgery_id], references: [id], onDelete: Cascade)

  created_at          DateTime        @default(now())
  updated_at          DateTime        @updatedAt

  @@index([surgery_id])
  @@index([severity])
  @@index([occurred_at])
  @@index([surgery_id, severity])
}
```

**Add to related models:**
```prisma
model Doctor {
  // ... existing fields ...
  primary_surgeries    Surgery[]       @relation("PrimarySurgeonSurgeries")
  anesthesiologist_surgeries Surgery[] @relation("AnesthesiologistSurgeries")
  surgery_notes        SurgeryNote[]
}

model Patient {
  // ... existing fields ...
  surgeries            Surgery[]
}

model Appointment {
  // ... existing fields ...
  surgery              Surgery?
}

model User {
  // ... existing fields ...
  surgery_team_members SurgeryTeamMember[]
}
```

---

## New Enums Summary

Add these enums to the schema:

```prisma
enum DictationStatus {
  RECORDING
  PROCESSING
  TRANSCRIBED
  REVIEWED
  ARCHIVED
}

enum DoctorConsultStatus {
  REQUESTED
  IN_REVIEW
  RESPONDED
  CLOSED
  CANCELLED
}

enum DoctorConsultPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum SurgeryStatus {
  SCHEDULED
  IN_PREP
  IN_PROGRESS
  COMPLETED
  CANCELLED
  POSTPONED
}

enum SurgeryType {
  ELECTIVE
  URGENT
  EMERGENCY
}

enum SurgeryTeamRole {
  PRIMARY_SURGEON
  ASSISTANT_SURGEON
  SCRUB_NURSE
  CIRCULATING_NURSE
  ANESTHESIOLOGIST
  SURGICAL_TECH
  OBSERVER
}

enum SurgeryNoteType {
  PRE_OP
  INTRA_OP
  POST_OP
}

enum ComplicationSeverity {
  MINOR
  MODERATE
  SEVERE
  CRITICAL
}
```

---

## Summary of Additions

### Tables (7 new models)
1. `DoctorOnboardingTask` - Onboarding checklist
2. `DoctorOnboardingDocument` - Onboarding documents
3. `Dictation` - Voice recordings and transcriptions
4. `DoctorConsult` - Doctor-to-doctor consultations
5. `Surgery` - Surgical procedures
6. `SurgeryTeamMember` - Surgery team assignments
7. `SurgeryNote` - Structured surgery notes
8. `SurgeryComplication` - Complication tracking

### Enums (9 new enums)
1. `DictationStatus`
2. `DoctorConsultStatus`
3. `DoctorConsultPriority`
4. `SurgeryStatus`
5. `SurgeryType`
6. `SurgeryTeamRole`
7. `SurgeryNoteType`
8. `ComplicationSeverity`

### Relations Added
- **Doctor**: `onboarding_tasks`, `onboarding_documents`, `dictations`, `requesting_consults`, `consulting_consults`, `primary_surgeries`, `anesthesiologist_surgeries`, `surgery_notes`
- **Patient**: `dictations`, `doctor_consults`, `surgeries`
- **Appointment**: `dictations`, `doctor_consults`, `surgery`
- **Consultation**: `dictations`, `doctor_consults`
- **MedicalRecord**: `dictations`, `doctor_consults`
- **User**: `surgery_team_members`

---

## Migration Strategy

### Phase 1: Doctor Onboarding (Low Risk)
1. Add `DoctorOnboardingTask` and `DoctorOnboardingDocument` models
2. Add relations to `Doctor` model
3. Migrate existing onboarding data if needed
4. **Impact:** None on existing functionality

### Phase 2: Dictation (Low Risk)
1. Add `Dictation` model and enum
2. Add relations to `Doctor`, `Patient`, `Appointment`, `Consultation`, `MedicalRecord`
3. **Impact:** None on existing functionality (optional feature)

### Phase 3: Doctor Consults (Low Risk)
1. Add `DoctorConsult` model and enums
2. Add relations to `Doctor`, `Patient`, `Appointment`, `Consultation`, `MedicalRecord`
3. **Impact:** None on existing functionality (new feature)

### Phase 4: Surgery Workflows (Medium Risk)
1. Add `Surgery`, `SurgeryTeamMember`, `SurgeryNote`, `SurgeryComplication` models
2. Add relations to `Doctor`, `Patient`, `Appointment`, `User`
3. Consider migrating existing "Procedure" appointments to `Surgery` if needed
4. **Impact:** Minimal - existing appointments remain unchanged

---

## Design Decisions

### Why Separate Surgery from Appointment?
- **Different lifecycle:** Surgeries have pre-op, intra-op, post-op phases
- **Team management:** Surgeries require team assignments
- **Complication tracking:** Specific to surgical procedures
- **Flexibility:** Can link surgery to appointment OR create standalone

### Why Dictation is Optional on Relations?
- **Flexibility:** Dictations can be standalone or linked to multiple contexts
- **Use cases:** General notes, consultation notes, procedure notes
- **Future-proof:** Can attach to any clinical entity

### Why Doctor Consult is Separate from Consultation?
- **Different participants:** Doctor-to-doctor vs doctor-to-patient
- **Different workflow:** Request/response vs direct consultation
- **Different purpose:** Clinical advice vs patient care

### Why Onboarding Tasks are Separate?
- **Flexibility:** Can add/remove tasks without schema changes
- **Audit trail:** Track completion history
- **Scalability:** Support different onboarding flows per doctor type

---

## Future Enhancements (Out of Scope)

These can be added later without breaking changes:

1. **Dictation:**
   - Multiple transcription versions
   - Voice-to-text confidence scores
   - Language detection

2. **Surgery:**
   - Equipment tracking
   - Supply usage
   - Operating room scheduling

3. **Doctor Consults:**
   - Consult templates
   - Response time tracking
   - Consult ratings

4. **Onboarding:**
   - Onboarding workflow templates
   - Automated task assignment
   - Onboarding analytics

---

## Implementation Checklist

- [ ] Create migration file for new enums
- [ ] Create migration file for `DoctorOnboardingTask`
- [ ] Create migration file for `DoctorOnboardingDocument`
- [ ] Create migration file for `Dictation`
- [ ] Create migration file for `DoctorConsult`
- [ ] Create migration file for `Surgery`
- [ ] Create migration file for `SurgeryTeamMember`
- [ ] Create migration file for `SurgeryNote`
- [ ] Create migration file for `SurgeryComplication`
- [ ] Update Prisma schema with all relations
- [ ] Run `prisma generate` to update client
- [ ] Test migrations on development database
- [ ] Update seed script if needed
- [ ] Document new models in schema documentation

---

**End of Document**
