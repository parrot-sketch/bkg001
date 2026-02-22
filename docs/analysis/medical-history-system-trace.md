# Medical History System - Complete Trace

## System Overview

The medical history system has **two distinct components** that serve different purposes:

### 1. Patient Medical Information (Free-Text Fields)

**Location**: `Patient` model in database
**Fields**:
- `allergies` (String?) - "Penicillin, Latex, Shellfish"
- `medical_conditions` (String?) - "Diabetes Type 2, Hypertension"
- `medical_history` (String?) - "Previous appendectomy in 2010, History of asthma"

**Characteristics**:
- Unstructured text fields
- Patient-reported or collected during intake
- Stored at patient registration
- Can be updated but no version history
- Cannot be queried or analyzed programmatically

**Current Access**:
- ✅ Doctors: Full read/write
- ✅ Nurses: Full read/write
- ✅ **Frontdesk: Read-only** (NEW - just added)
- ✅ Patients: Own data only

### 2. Medical Records (Structured Clinical Documentation)

**Location**: `MedicalRecord` model in database
**Fields**:
- `treatment_plan` (String?)
- `prescriptions` (String?)
- `lab_request` (String?)
- `notes` (String?)
- Relations: `diagnoses[]`, `lab_tests[]`

**Characteristics**:
- Structured records linked to appointments
- Created by doctors during/after consultations
- Timestamped and doctor-attributed
- Can be queried and analyzed
- Version history via timestamps

**Current Access**:
- ✅ Doctors: Full read/write
- ✅ Nurses: Read-only (typically)
- ✅ **Frontdesk: Read-only** (for coordination)
- ✅ Patients: Own records only

## Data Flow Trace

### Registration Flow
```
1. Patient Registration/Intake
   ↓
2. Frontdesk collects:
   - Demographics
   - Contact info
   - Medical info (allergies, conditions, history)
   ↓
3. Patient Model Created:
   - allergies → "Penicillin, Latex"
   - medical_conditions → "Diabetes Type 2"
   - medical_history → "Previous surgery..."
```

### Appointment Flow
```
1. Appointment Scheduled
   ↓
2. Frontdesk can see:
   - Allergies (for safety/preparation)
   - Medical conditions (for coordination)
   ↓
3. Patient Arrives
   ↓
4. Doctor Consultation
   ↓
5. MedicalRecord Created:
   - Diagnosis added
   - Prescription added
   - Lab tests requested
   ↓
6. Medical Records Tab Updated
```

## Where Medical History is Used

### 1. Patient Registration Forms
- **File**: `components/patient/PatientRegistrationForm.tsx`
- **File**: `components/frontdesk/PatientRegistrationDialog.tsx`
- **Purpose**: Collect medical information during registration
- **Fields**: allergies, medical_conditions, medical_history

### 2. Intake Forms
- **File**: `components/patient/intake-form/steps/MedicalInfoStep.tsx`
- **Purpose**: Update medical information during intake
- **Fields**: Same as registration

### 3. Consultation Views
- **File**: `components/consultation/PatientInfoSidebar.tsx`
- **Purpose**: Display medical info to doctors/nurses during consultation
- **Shows**: Allergies (prominent), conditions, history
- **Access**: Doctors, nurses

### 4. Patient Overview (NEW)
- **File**: `components/patient/PatientOverviewPanel.tsx`
- **File**: `components/patient/PatientMedicalInfoPanel.tsx`
- **Purpose**: Display medical information in patient profile
- **Shows**: Allergies (alert), conditions, history
- **Access**: Frontdesk (read-only), doctors, nurses

### 5. Medical Records Tab
- **File**: `components/medical-history-container.tsx`
- **File**: `components/medical-history.tsx`
- **Purpose**: Display structured clinical records
- **Shows**: MedicalRecord entries with diagnoses, prescriptions, lab tests
- **Access**: All roles (read-only for frontdesk)

### 6. Consultation Readiness
- **File**: `components/consultation/ConsultationReadinessIndicator.tsx`
- **Purpose**: Check if medical history is complete
- **Logic**: Checks if allergies, conditions, or history exist

### 7. Pre-Op Checklists
- **File**: `components/nurse/NursePreOpChecklist.tsx`
- **Purpose**: Verify allergies documented before surgery
- **Shows**: Allergy information prominently

## Access Control Matrix

| Data Type | Frontdesk | Doctor | Nurse | Patient |
|-----------|-----------|--------|-------|---------|
| Allergies | ✅ Read | ✅ Read/Write | ✅ Read/Write | ✅ Own only |
| Medical Conditions | ✅ Read | ✅ Read/Write | ✅ Read/Write | ✅ Own only |
| Medical History | ✅ Read | ✅ Read/Write | ✅ Read/Write | ✅ Own only |
| Medical Records | ✅ Read | ✅ Read/Write | ✅ Read | ✅ Own only |
| Diagnoses | ✅ Read | ✅ Read/Write | ✅ Read | ✅ Own only |
| Prescriptions | ✅ Read | ✅ Read/Write | ✅ Read | ✅ Own only |
| Lab Tests | ✅ Read | ✅ Read/Write | ✅ Read | ✅ Own only |

## UI Components Hierarchy

```
Patient Profile Page
├── PatientProfileHero (name, stats, badges)
├── PatientProfileTabs
│   ├── Overview Tab
│   │   ├── PatientOverviewPanel
│   │   │   ├── Personal Information
│   │   │   ├── Emergency Contact
│   │   │   └── PatientMedicalInfoPanel (NEW)
│   │   │       ├── Allergies (Alert)
│   │   │       ├── Medical Conditions
│   │   │       └── Medical History
│   │   └── FrontdeskPatientSidebar
│   ├── Medical History Tab
│   │   └── MedicalHistoryContainer
│   │       └── MedicalHistory (table of MedicalRecords)
│   └── Appointments Tab
│       └── PatientAppointmentsPanel
```

## Key Design Decisions

### 1. Why Frontdesk Can See Medical Info

**Safety Reasons**:
- Allergies are critical for appointment preparation
- Medical conditions help with scheduling
- Need to coordinate with clinical staff

**Operational Reasons**:
- Better appointment preparation
- Can flag urgent cases
- Improved patient experience

**Privacy Safeguards**:
- Read-only access (cannot modify)
- Clear visual indicators
- Access logged (if audit trail implemented)

### 2. Two-Tier System Rationale

**Patient Medical Info** (Free-text):
- Quick to collect
- Patient-friendly
- Flexible format
- Used for initial screening

**Medical Records** (Structured):
- Clinical accuracy
- Queryable
- Linked to appointments
- Doctor-controlled

### 3. UI Design Choices

**Allergies as Alert**:
- Red alert box (high visibility)
- Critical safety information
- Must be seen immediately

**Read-Only Badge**:
- Clear permission indicator
- Prevents confusion
- Professional appearance

**Empty States**:
- Helpful messaging
- Clear when data is missing
- Encourages documentation

## Future Enhancements

### Structured Storage
- Allergy table with severity levels
- Condition table with ICD-10 codes
- Medication allergy tracking
- History timeline view

### Enhanced Access Control
- Granular permissions
- Audit logging
- Access request workflow
- Temporary access grants

### Better UI
- Medical history timeline
- Condition tracking over time
- Allergy severity indicators
- Medication interaction warnings
