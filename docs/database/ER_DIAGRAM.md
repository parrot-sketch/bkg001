# Entity Relationship Diagram

## Nairobi Sculpt Surgical Aesthetic Clinic Database

### Core Entity Relationships

```
┌─────────────┐
│    User     │
│ (Auth/RBAC) │
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│   Patient   │   │   Doctor    │
│  (Profile)  │   │ (Surgeon)    │
└──────┬──────┘   └──────┬──────┘
       │                 │
       │                 │
       └────────┬────────┘
                │
                ▼
        ┌───────────────┐
        │ Appointment   │
        │ (Scheduling)  │
        └───────┬───────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
┌───────────────┐ ┌──────────────┐
│ Consultation  │ │MedicalRecord │
│  (Outcome)    │ │ (Treatment)  │
└───────────────┘ └──────┬───────┘
                         │
                ┌────────┴────────┐
                │                 │
                ▼                 ▼
        ┌──────────────┐  ┌─────────────┐
        │  Diagnosis    │  │  VitalSign  │
        │  (Clinical)   │  │  (Metrics)  │
        └──────────────┘  └─────────────┘
```

### Pre/Post-op Workflow

```
┌─────────────┐
│   Patient   │
└──────┬──────┘
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│NurseAssignment│  │  CareNote   │
│ (Assignment)  │  │ (Pre/Post)  │
└──────┬───────┘   └──────┬──────┘
       │                   │
       └─────────┬─────────┘
                 │
                 ▼
         ┌───────────────┐
         │  Appointment  │
         └───────────────┘
```

### Billing & Payments

```
┌─────────────┐
│  Appointment│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Payment   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ PatientBill │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Service   │
└─────────────┘
```

### Audit & Compliance

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌─────────────┐  ┌──────────────┐
│  AuditLog   │  │ Notification │
│ (Tracking)  │  │  (Alerts)    │
└─────────────┘  └──────────────┘
```

## Table Relationships Summary

### One-to-Many Relationships

- **User → RefreshToken**: One user can have many refresh tokens
- **User → AuditLog**: One user can perform many actions
- **User → Notification**: One user can send/receive many notifications
- **Patient → Appointment**: One patient can have many appointments
- **Patient → MedicalRecord**: One patient can have many medical records
- **Patient → Payment**: One patient can have many payments
- **Patient → CareNote**: One patient can have many care notes
- **Patient → VitalSign**: One patient can have many vital sign records
- **Doctor → Appointment**: One doctor can have many appointments
- **Doctor → Consultation**: One doctor can conduct many consultations
- **Doctor → WorkingDay**: One doctor can have many working days
- **Appointment → Payment**: One appointment can have one payment
- **Appointment → Consultation**: One appointment can have one consultation
- **Appointment → MedicalRecord**: One appointment can have many medical records
- **MedicalRecord → Diagnosis**: One medical record can have many diagnoses
- **MedicalRecord → LabTest**: One medical record can have many lab tests
- **MedicalRecord → VitalSign**: One medical record can have many vital signs
- **Payment → PatientBill**: One payment can have many bill items

### Many-to-Many Relationships

- **Patient ↔ Nurse** (via NurseAssignment): Many patients can be assigned to many nurses
- **Patient ↔ Doctor** (via Appointment): Many patients can see many doctors
- **Patient ↔ Doctor** (via Rating): Many patients can rate many doctors

### One-to-One Relationships

- **User ↔ Patient**: One user account can be linked to one patient profile
- **User ↔ Doctor**: One user account can be linked to one doctor profile
- **Appointment ↔ Consultation**: One appointment can have one consultation
- **Appointment ↔ Payment**: One appointment can have one payment

## Key Constraints

### Unique Constraints
- `User.email` - Unique email addresses
- `Patient.email` - Unique patient emails
- `Doctor.email` - Unique doctor emails
- `Doctor.license_number` - Unique license numbers
- `RefreshToken.token` - Unique refresh tokens
- `Payment.receipt_number` - Unique receipt numbers
- `Rating.doctor_id + patient_id` - One rating per doctor-patient pair
- `WorkingDay.doctor_id + day` - One working day entry per doctor per day
- `Consultation.appointment_id` - One consultation per appointment

### Foreign Key Constraints
- All foreign keys enforce referential integrity
- Cascade deletes for dependent records
- Set null for optional relationships

### Indexes
- Email fields for fast lookups
- Date fields for range queries
- Composite indexes for common query patterns
- Status fields for filtering
