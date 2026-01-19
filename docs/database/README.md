# Database Documentation

## Nairobi Sculpt Surgical Aesthetic Clinic Database

This document provides comprehensive documentation for the PostgreSQL database schema, setup, and usage.

## Table of Contents

1. [Database Overview](#database-overview)
2. [Setup Instructions](#setup-instructions)
3. [Schema Design](#schema-design)
4. [Entity Relationships](#entity-relationships)
5. [Seeding Data](#seeding-data)
6. [Database Operations](#database-operations)
7. [Adding New Data](#adding-new-data)

---

## Database Overview

The database is built using **PostgreSQL** and managed with **Prisma ORM**. It supports all roles (Admin, Doctor, Nurse, Frontdesk, Patient) and their workflows including:

- User authentication and authorization
- Patient management and approvals
- Appointment scheduling and management
- Pre/Post-operative care workflows
- Consultations and medical records
- Billing and payments
- Audit logging and compliance
- Notifications

---

## Setup Instructions

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ and npm
- PostgreSQL client (optional, for direct access)

### 1. Environment Configuration

Create a `.env` file in the project root:

```env
# Database Configuration
# Note: Using port 5433 to avoid conflicts with existing ehr-postgres on port 5432
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/nairobi_sculpt?schema=public"

# Database Connection Details (for Docker)
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=nairobi_sculpt
DB_PORT=5433

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800

# Application
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 2. Start Docker Database

```bash
# Start PostgreSQL container
npm run docker:up

# Or manually
docker-compose up -d
```

The database will be available at `localhost:5432`.

### 3. Run Migrations

```bash
# Generate Prisma Client and run migrations
npm run db:migrate

# Or step by step
npx prisma generate
npx prisma migrate dev
```

### 4. Seed Database

```bash
# Seed with realistic data
npm run db:seed
```

This will create:
- Admin user
- 5 doctors (surgeons)
- 3 nurses
- 2 frontdesk staff
- 5 patients with medical history
- 20 appointments
- Pre/post-op workflows
- Consultations
- Audit logs
- Notifications

### 5. Verify Setup

```bash
# Open Prisma Studio to view data
npm run db:studio
```

---

## Schema Design

### Core Models

#### User
- **Purpose**: Authentication and authorization
- **Key Fields**: `id`, `email`, `password_hash`, `role`, `status`
- **Relations**: Links to Patient, Doctor, RefreshToken, AuditLog, Notifications

#### Patient
- **Purpose**: Patient profiles and medical information
- **Key Fields**: `id`, `first_name`, `last_name`, `email`, `date_of_birth`, `gender`
- **Consents**: `privacy_consent`, `service_consent`, `medical_consent`
- **Approval**: `approved`, `approved_by`, `approved_at`
- **Relations**: Appointments, MedicalRecords, Payments, CareNotes, VitalSigns

#### Doctor
- **Purpose**: Surgeon profiles and specializations
- **Key Fields**: `id`, `name`, `email`, `specialization`, `license_number`
- **Relations**: Appointments, Consultations, WorkingDays, Ratings

#### Appointment
- **Purpose**: Patient appointments with doctors
- **Key Fields**: `id`, `patient_id`, `doctor_id`, `appointment_date`, `time`, `status`
- **Status**: PENDING, SCHEDULED, CANCELLED, COMPLETED
- **Relations**: Patient, Doctor, Consultation, Payment, MedicalRecord

#### Consultation
- **Purpose**: Doctor consultations and outcomes
- **Key Fields**: `id`, `appointment_id`, `doctor_id`, `started_at`, `completed_at`
- **Relations**: Appointment, Doctor, User

#### NurseAssignment
- **Purpose**: Assign nurses to patients for care
- **Key Fields**: `id`, `patient_id`, `nurse_user_id`, `appointment_id`
- **Relations**: Patient, User (nurse), Appointment

#### CareNote
- **Purpose**: Pre/post-op and general care notes
- **Key Fields**: `id`, `patient_id`, `nurse_user_id`, `note_type`, `note`
- **Types**: PRE_OP, POST_OP, GENERAL
- **Relations**: Patient, User (nurse), Appointment

#### VitalSign
- **Purpose**: Patient vital signs measurements
- **Key Fields**: `body_temperature`, `systolic`, `diastolic`, `heart_rate`, `weight`, `height`
- **Relations**: Patient, Appointment, MedicalRecord

#### MedicalRecord
- **Purpose**: Medical records and treatment plans
- **Key Fields**: `id`, `patient_id`, `appointment_id`, `doctor_id`, `treatment_plan`
- **Relations**: Patient, Appointment, Doctor, Diagnosis, LabTest, VitalSign

#### Payment
- **Purpose**: Billing and payment tracking
- **Key Fields**: `id`, `patient_id`, `appointment_id`, `total_amount`, `status`
- **Relations**: Patient, Appointment, PatientBill

#### AuditLog
- **Purpose**: Compliance and audit tracking
- **Key Fields**: `id`, `user_id`, `action`, `model`, `details`
- **Relations**: User

#### Notification
- **Purpose**: System notifications (email, SMS, in-app)
- **Key Fields**: `id`, `user_id`, `type`, `status`, `message`
- **Relations**: User (recipient and sender)

---

## Entity Relationships

### User Relationships
```
User
├── RefreshToken (one-to-many)
├── Patient (one-to-one, if patient has account)
├── Doctor (one-to-one, via doctor.user_id)
├── NurseAssignments (one-to-many, as nurse)
├── CareNotes (one-to-many, as nurse)
├── Consultations (one-to-many, as doctor)
├── AuditLogs (one-to-many)
└── Notifications (one-to-many, as sender/recipient)
```

### Patient Relationships
```
Patient
├── User (one-to-one, optional)
├── Appointments (one-to-many)
├── MedicalRecords (one-to-many)
├── Payments (one-to-many)
├── NurseAssignments (one-to-many)
├── CareNotes (one-to-many)
├── VitalSigns (one-to-many)
├── Diagnoses (one-to-many)
└── Ratings (one-to-many)
```

### Appointment Relationships
```
Appointment
├── Patient (many-to-one)
├── Doctor (many-to-one)
├── Consultation (one-to-one)
├── Payment (one-to-one)
├── MedicalRecord (one-to-many)
├── CareNotes (one-to-many, pre/post-op)
├── NurseAssignments (one-to-many)
└── VitalSigns (one-to-many)
```

---

## Seeding Data

### Default Credentials

After seeding, use these credentials to log in:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@nairobisculpt.com | admin123 |
| Doctor | sarah.wanjiku@nairobisculpt.com | doctor123 |
| Nurse | jane.wambui@nairobisculpt.com | nurse123 |
| Frontdesk | david.omondi@nairobisculpt.com | frontdesk123 |

### Seed Data Includes

- **5 Doctors**: Plastic & reconstructive surgeons
- **3 Nurses**: Pre/post-op care staff
- **2 Frontdesk**: Patient intake and check-in
- **5 Patients**: With medical history and consents
- **20 Appointments**: Spread over next 30 days
- **5 Consultations**: Completed consultations
- **Pre/Post-op Workflows**: Nurse assignments and care notes
- **Vital Signs**: Patient vital signs records
- **Services**: 8 common services (consultations, procedures, lab tests)
- **50 Audit Logs**: System activity tracking
- **20 Notifications**: Sample notifications

---

## Database Operations

### Common Commands

```bash
# Start database
npm run docker:up

# Stop database
npm run docker:down

# View database logs
npm run docker:logs

# Run migrations
npm run db:migrate

# Reset database (WARNING: Deletes all data)
npm run db:reset

# Seed database
npm run db:seed

# Open Prisma Studio (GUI)
npm run db:studio

# Generate Prisma Client
npm run db:generate
```

### Direct Database Access

```bash
# Connect to database via psql
docker exec -it nairobi-sculpt-db psql -U postgres -d nairobi_sculpt

# Or using connection string
psql postgresql://postgres:postgres@localhost:5432/nairobi_sculpt
```

---

## Adding New Data

### Adding a New Doctor

1. Create User account:
```typescript
const user = await prisma.user.create({
  data: {
    id: uuid(),
    email: 'doctor@example.com',
    password_hash: await hashPassword('password'),
    role: Role.DOCTOR,
    status: Status.ACTIVE,
    first_name: 'John',
    last_name: 'Doe',
    phone: '+254700000000',
  },
});
```

2. Create Doctor profile:
```typescript
const doctor = await prisma.doctor.create({
  data: {
    id: uuid(),
    user_id: user.id,
    email: 'doctor@example.com',
    name: 'Dr. John Doe',
    specialization: 'Plastic Surgery',
    license_number: 'KMPDB-2024-XXX',
    phone: '+254700000000',
    address: 'Nairobi, Kenya',
    department: 'Surgery',
    availability_status: 'AVAILABLE',
    type: 'FULL',
  },
});
```

3. Add working days:
```typescript
await prisma.workingDay.createMany({
  data: [
    { doctor_id: doctor.id, day: 'Monday', start_time: '09:00', end_time: '17:00' },
    { doctor_id: doctor.id, day: 'Tuesday', start_time: '09:00', end_time: '17:00' },
    // ... more days
  ],
});
```

### Adding a New Patient

```typescript
const patient = await prisma.patient.create({
  data: {
    id: uuid(),
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+254712345678',
    date_of_birth: new Date('1990-01-01'),
    gender: Gender.FEMALE,
    address: 'Nairobi, Kenya',
    marital_status: 'Single',
    emergency_contact_name: 'John Smith',
    emergency_contact_number: '+254712345679',
    relation: 'Brother',
    privacy_consent: true,
    service_consent: true,
    medical_consent: true,
    approved: false, // Requires admin approval
  },
});
```

### Scheduling an Appointment

```typescript
const appointment = await prisma.appointment.create({
  data: {
    patient_id: patient.id,
    doctor_id: doctor.id,
    appointment_date: new Date('2024-12-25'),
    time: '10:00',
    status: AppointmentStatus.PENDING,
    type: 'Initial Consultation',
    note: 'Patient requested morning appointment',
  },
});
```

---

## Database Constraints

### Unique Constraints
- `User.email` - Unique email addresses
- `Patient.email` - Unique patient emails
- `Doctor.email` - Unique doctor emails
- `Doctor.license_number` - Unique license numbers
- `RefreshToken.token` - Unique refresh tokens
- `Payment.receipt_number` - Unique receipt numbers
- `Rating.doctor_id + patient_id` - One rating per doctor-patient pair

### Foreign Key Constraints
- All foreign keys enforce referential integrity
- Cascade deletes for dependent records (e.g., deleting patient deletes appointments)
- Set null for optional relationships (e.g., user deletion sets patient.user_id to null)

### Indexes
- Email fields indexed for fast lookups
- Date fields indexed for range queries
- Composite indexes for common query patterns (e.g., `[doctor_id, appointment_date, time]`)

---

## ER Diagram

```
┌─────────┐         ┌──────────────┐         ┌──────────┐
│  User   │────────│   Patient    │────────│Appointment│
└─────────┘         └──────────────┘         └──────────┘
     │                      │                      │
     │                      │                      │
     ├──────────────────────┼──────────────────────┤
     │                      │                      │
┌─────────┐         ┌──────────────┐         ┌──────────┐
│ Doctor  │────────│ Consultation │────────│MedicalRecord│
└─────────┘         └──────────────┘         └──────────┘
     │                      │                      │
     │                      │                      │
┌─────────┐         ┌──────────────┐         ┌──────────┐
│Nurse    │────────│NurseAssignment│────────│ CareNote  │
└─────────┘         └──────────────┘         └──────────┘
```

---

## Troubleshooting

### Database Connection Issues

1. **Check Docker container is running**:
   ```bash
   docker ps | grep nairobi-sculpt-db
   ```

2. **Check database logs**:
   ```bash
   npm run docker:logs
   ```

3. **Verify DATABASE_URL in .env**:
   ```bash
   echo $DATABASE_URL
   ```

### Migration Issues

1. **Reset database** (WARNING: Deletes all data):
   ```bash
   npm run db:reset
   ```

2. **Check migration status**:
   ```bash
   npx prisma migrate status
   ```

### Seed Issues

1. **Clear existing data manually**:
   ```bash
   npx prisma studio
   # Delete records in reverse dependency order
   ```

2. **Run seed with verbose output**:
   ```bash
   DEBUG=* npm run db:seed
   ```

---

## Security Considerations

1. **Password Hashing**: All passwords are hashed using bcrypt (10 rounds)
2. **Environment Variables**: Never commit `.env` files
3. **Database Credentials**: Use strong passwords in production
4. **Connection Security**: Use SSL in production
5. **Audit Logging**: All sensitive actions are logged
6. **Role-Based Access**: Enforced at database level via foreign keys

---

## Production Checklist

- [ ] Change default passwords
- [ ] Use strong DATABASE_URL with SSL
- [ ] Enable database backups
- [ ] Set up connection pooling
- [ ] Configure read replicas (if needed)
- [ ] Enable query logging
- [ ] Set up monitoring and alerts
- [ ] Review and optimize indexes
- [ ] Test disaster recovery procedures

---

## Support

For database-related issues:
1. Check Prisma documentation: https://www.prisma.io/docs
2. Review migration files in `prisma/migrations/`
3. Check database logs: `npm run docker:logs`
4. Use Prisma Studio for data inspection: `npm run db:studio`
