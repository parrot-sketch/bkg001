# Healthcare Information Management System (HIMS)
## Comprehensive System Architecture Design Document

**Version:** 1.0  
**Last Updated:** March 2, 2026  
**Status:** Production

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architectural Patterns](#architectural-patterns)
4. [Layer Architecture](#layer-architecture)
5. [Domain Model](#domain-model)
6. [Module Breakdown](#module-breakdown)
7. [Data Flow & Workflows](#data-flow--workflows)
8. [Design Patterns & Principles](#design-patterns--principles)
9. [Technology Stack](#technology-stack)
10. [Key Design Decisions](#key-design-decisions)
11. [Scalability & Performance](#scalability--performance)
12. [Security Architecture](#security-architecture)

---

## Executive Summary

This Healthcare Information Management System (HIMS) is a **production-grade medical clinic management platform** built with **Clean Architecture principles** and a **modular monolithic design pattern**. The system is designed to handle patient intake, appointment scheduling, clinical workflows, and administrative operations in a surgical aesthetic clinic.

### Key Characteristics:
- **Architecture Pattern:** Clean Architecture + Modular Monolith
- **Design Approach:** Domain-Driven Design (DDD) + Repository Pattern + CQRS (minimal)
- **Tech Stack:** Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL + JWT Auth (bcrypt)
- **Deployment:** Containerized with Docker, deployed on cloud (AWS/GCP/Azure)
- **Scale:** Designed to support 500+ concurrent users, 10,000+ patients

---

## System Overview

### 1.1 System Purpose

HIMS is an integrated healthcare management platform with the following core responsibilities:

1. **Patient Management:** Intake forms, registration, medical history tracking
2. **Appointment Scheduling:** Doctor availability, appointment booking, rescheduling
3. **Consultation Workflow:** Consultation requests, medical assessments, case planning
4. **Clinical Documentation:** Medical records, clinical notes, diagnoses, treatments
5. **Consent Management:** Digital consent forms, signature capture, audit trails
6. **Administrative Operations:** User management, payments, audit logging

### 1.2 Key Stakeholders

```
┌──────────────────────────────────────────────────────────┐
│                   HIMS STAKEHOLDERS                      │
├──────────────────────────────────────────────────────────┤
│ Patient        - Uses intake form, views appointments    │
│ Doctor         - Manages availability, consultations     │
│ Nurse          - Clinical documentation, vital signs     │
│ Front Desk     - Patient check-in, appointment booking   │
│ Admin          - User management, audit reports          │
└──────────────────────────────────────────────────────────┘
```

### 1.3 System Boundaries

HIMS does NOT directly manage:
- Pharmacy operations (external integration point)
- Accounting/Billing systems (external integration point)
- Medical laboratory systems (external integration point)
- Imaging/Radiology systems (external integration point)

These are designed as **integration points** for future expansion.

---

## Architectural Patterns

### 2.1 Clean Architecture (Primary Pattern)

HIMS follows **Clean Architecture** principles as defined by Robert C. Martin. This architecture depends on four concentric layers:

```
┌─────────────────────────────────────────────────────────────┐
│                  INTERFACE LAYER                            │
│  React Components, Next.js Pages, API Routes               │
│  Responsibility: Present data, capture user input          │
│  Dependencies: Application Layer                           │
└─────────────────────────────────────────────────────────────┘
                          ↑
                   depends on
                          │
┌─────────────────────────────────────────────────────────────┐
│                APPLICATION LAYER                            │
│  Use Cases, Application Services, DTOs, Mappers            │
│  Responsibility: Orchestrate business logic, validate      │
│  Dependencies: Domain Layer                                │
└─────────────────────────────────────────────────────────────┘
                          ↑
                   depends on
                          │
┌─────────────────────────────────────────────────────────────┐
│                   DOMAIN LAYER                              │
│  Entities, Value Objects, Interfaces (no implementations)  │
│  Responsibility: Pure business logic, domain rules         │
│  Dependencies: NONE (Framework-independent)                │
└─────────────────────────────────────────────────────────────┘
                          ↑
              implements (has no deps)
                          │
┌─────────────────────────────────────────────────────────────┐
│              INFRASTRUCTURE LAYER                           │
│  Prisma Repositories, Auth Services, External APIs         │
│  Responsibility: Implementation of domain interfaces       │
│  Dependencies: Domain + Application Layers                 │
└─────────────────────────────────────────────────────────────┘
```

**Key Principles:**
1. **Dependency Rule:** Dependencies point inward (towards the center)
2. **Independence:** Domain layer has ZERO external dependencies
3. **Testability:** Each layer testable in isolation
4. **Framework Agnostic:** Business logic independent from framework

### 2.2 Modular Monolith Pattern

HIMS is organized as a **modular monolith** with clear module boundaries:

```
HIMS Monolith
├── Patient Module
│   ├── Domain: Patient entity, validation rules
│   ├── Application: CreatePatient, UpdatePatient use cases
│   ├── Infrastructure: PatientRepository implementation
│   └── Interface: Patient management pages
│
├── Appointment Module
│   ├── Domain: Appointment entity, availability logic
│   ├── Application: BookAppointment, RescheduleAppointment use cases
│   ├── Infrastructure: AppointmentRepository implementation
│   └── Interface: Appointment booking pages
│
├── Consultation Module
│   ├── Domain: Consultation entity, consultation rules
│   ├── Application: StartConsultation, CompleteConsultation use cases
│   ├── Infrastructure: ConsultationRepository implementation
│   └── Interface: Consultation workflow pages
│
├── Clinical Module
│   ├── Domain: MedicalRecord, Diagnosis entities
│   ├── Application: RecordVitals, DocumentDiagnosis use cases
│   ├── Infrastructure: MedicalRecordRepository implementation
│   └── Interface: Clinical documentation pages
│
└── Consent Module
    ├── Domain: ConsentForm, ConsentSigningSession entities
    ├── Application: GenerateConsent, SignConsent use cases
    ├── Infrastructure: ConsentRepository implementation
    └── Interface: Consent management pages
```

### 2.3 Repository Pattern

All data access is abstracted through **repository interfaces** defined in the domain layer:

```typescript
// Domain Layer - Interface (no implementation)
export interface IPatientRepository {
  findById(id: string): Promise<Patient | null>;
  findByEmail(email: Email): Promise<Patient | null>;
  save(patient: Patient): Promise<void>;
  update(patient: Patient): Promise<void>;
  delete(id: string): Promise<void>;
}

// Infrastructure Layer - Implementation
export class PrismaPatientRepository implements IPatientRepository {
  async findById(id: string): Promise<Patient | null> {
    const raw = await this.db.patient.findUnique({ where: { id } });
    return raw ? PatientMapper.fromPrisma(raw) : null;
  }
  // ... other methods
}
```

**Benefits:**
- Decoupled from database choice (Prisma could be replaced with another ORM)
- Database logic isolated (easy to test with mocks)
- Single responsibility (repository only handles data access)

### 2.4 Ports & Adapters (Hexagonal Architecture)

The system uses Ports & Adapters architecture for external services:

```
Domain Layer (Core Business Logic)
  ↓
Interfaces (Ports)
  ├── IAuthService (port)
  ├── IAuditService (port)
  ├── INotificationService (port)
  └── IPatientRepository (port)
  ↓
Implementations (Adapters)
  ├── JwtAuthService (JWT token generation & verification)
  ├── PostgresAuditAdapter
  ├── SendgridNotificationAdapter
  └── PrismaPatientRepository
```

This allows switching external service providers without changing domain logic.

---

## Layer Architecture

### 3.1 Domain Layer (`/domain`)

**Responsibility:** Pure business logic, domain rules, invariants.  
**Dependencies:** NONE (100% framework-independent)

```
domain/
├── entities/                 # Rich domain models
│   ├── Patient.ts          # Patient aggregate root
│   ├── Doctor.ts           # Doctor aggregate root
│   ├── Appointment.ts      # Appointment aggregate root
│   ├── Consultation.ts     # Consultation aggregate root
│   ├── MedicalRecord.ts    # Medical record aggregate root
│   ├── CasePlan.ts         # Surgical case plan entity
│   ├── ConsentForm.ts      # Consent form entity
│   └── User.ts             # User/Staff aggregate root
│
├── value-objects/          # Immutable value objects
│   ├── Email.ts            # Email with validation
│   ├── PhoneNumber.ts      # Phone number with formatting
│   ├── Money.ts            # Currency amount
│   ├── Gender.ts           # Gender enumeration
│   └── Address.ts          # Physical address
│
├── aggregates/             # Aggregate boundaries
│   ├── PatientAggregate.ts
│   ├── AppointmentAggregate.ts
│   └── ConsultationAggregate.ts
│
├── interfaces/             # Ports (no implementations)
│   ├── repositories/
│   │   ├── IPatientRepository.ts
│   │   ├── IAppointmentRepository.ts
│   │   ├── IConsultationRepository.ts
│   │   ├── IMedicalRecordRepository.ts
│   │   └── ...
│   ├── services/
│   │   ├── IAuthService.ts
│   │   ├── IAuditService.ts
│   │   ├── INotificationService.ts
│   │   └── ...
│   └── events/
│       ├── IDomainEvent.ts
│       └── ...
│
├── enums/                   # Domain constants
│   ├── AppointmentStatus.ts
│   ├── ConsultationStatus.ts
│   ├── UserRole.ts
│   └── ConsentStatus.ts
│
├── exceptions/              # Domain-specific errors
│   ├── DomainException.ts
│   ├── ValidationException.ts
│   ├── DuplicatePatientException.ts
│   └── AppointmentConflictException.ts
│
└── services/                # Domain services (stateless)
    ├── AvailabilityService.ts
    ├── ConsultationSessionService.ts
    └── ConsentSigningService.ts
```

#### 3.1.1 Key Characteristics

**Entity Example (Patient):**
```typescript
export class Patient {
  private constructor(
    private readonly id: string,
    private readonly email: Email,
    private readonly firstName: string,
    private readonly lastName: string,
    private readonly dateOfBirth: Date,
    // ... other properties
  ) {}

  // Factory method (validation happens here)
  static create(params: {
    email: Email;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    // ...
  }): Patient {
    if (!params.firstName || params.firstName.trim().length === 0) {
      throw new ValidationException('First name is required');
    }
    // ... more validation
    return new Patient(uuid(), params.email, ...);
  }

  // Behavior methods (domain logic)
  getAge(): number {
    return differenceInYears(new Date(), this.dateOfBirth);
  }

  isEligibleForSurgery(): boolean {
    // Business rule: patient must be at least 18 years old
    return this.getAge() >= 18;
  }

  // Query methods
  getId(): string { return this.id; }
  getEmail(): Email { return this.email; }
  // ...
}
```

**Value Object Example (Email):**
```typescript
export class Email {
  private readonly value: string;

  private constructor(value: string) {
    if (!this.isValidEmail(value)) {
      throw new ValidationException(`Invalid email format: ${value}`);
    }
    this.value = value;
  }

  static create(value: string): Email {
    return new Email(value.toLowerCase().trim());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
```

### 3.2 Application Layer (`/application`)

**Responsibility:** Orchestrate domain logic, validate input, coordinate with infrastructure.  
**Dependencies:** Domain layer only

```
application/
├── use-cases/              # Business operations (one per file)
│   ├── patient/
│   │   ├── CreatePatientUseCase.ts
│   │   ├── UpdatePatientUseCase.ts
│   │   └── GetPatientByIdUseCase.ts
│   ├── appointment/
│   │   ├── BookAppointmentUseCase.ts
│   │   ├── RescheduleAppointmentUseCase.ts
│   │   ├── CancelAppointmentUseCase.ts
│   │   └── GetDoctorAvailabilityUseCase.ts
│   ├── consultation/
│   │   ├── StartConsultationUseCase.ts
│   │   ├── CompleteConsultationUseCase.ts
│   │   ├── UpdateConsultationDraftUseCase.ts
│   │   └── SubmitConsultationRequestUseCase.ts
│   ├── clinical/
│   │   ├── RecordVitalsUseCase.ts
│   │   ├── DocumentDiagnosisUseCase.ts
│   │   └── GeneratePrescriptionUseCase.ts
│   └── consent/
│       ├── GenerateConsentUseCase.ts
│       ├── SignConsentUseCase.ts
│       └── CreateSigningSessionUseCase.ts
│
├── dtos/                    # Data Transfer Objects
│   ├── PatientResponseDto.ts
│   ├── AppointmentResponseDto.ts
│   ├── ConsultationRequestDto.ts
│   └── ...
│
├── mappers/                 # DTO ↔ Entity conversion
│   ├── PatientMapper.ts     # Patient ↔ PatientDto
│   ├── AppointmentMapper.ts
│   ├── ConsultationMapper.ts
│   └── ...
│
├── services/                # Application services
│   ├── AuditService.ts     # Audit logging
│   ├── NotificationService.ts
│   └── ...
│
│
└── errors/                  # Application-level exceptions
    ├── InvalidInputError.ts
    ├── NotFoundError.ts
    └── ...
```

#### 3.2.1 Use Case Example

```typescript
export class BookAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly patientRepository: IPatientRepository,
    private readonly doctorRepository: IDoctorRepository,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async execute(input: {
    patientId: string;
    doctorId: string;
    date: Date;
    timeSlot: string;
  }): Promise<BookAppointmentOutput> {
    // 1. Validate input
    if (!input.patientId || !input.doctorId) {
      throw new InvalidInputError('Patient and doctor IDs are required');
    }

    // 2. Load entities from repositories
    const patient = await this.patientRepository.findById(input.patientId);
    if (!patient) {
      throw new NotFoundError(`Patient ${input.patientId} not found`);
    }

    const doctor = await this.doctorRepository.findById(input.doctorId);
    if (!doctor) {
      throw new NotFoundError(`Doctor ${input.doctorId} not found`);
    }

    // 3. Apply domain logic
    // Check availability (uses domain service)
    const isAvailable = await this.availabilityService.isSlotAvailable(
      input.doctorId,
      input.date,
      input.timeSlot
    );
    if (!isAvailable) {
      throw new AppointmentConflictException('This time slot is not available');
    }

    // Create appointment entity (domain)
    const appointment = Appointment.create({
      patientId: input.patientId,
      doctorId: input.doctorId,
      appointmentDate: input.date,
      time: input.timeSlot,
    });

    // 4. Persist using repository
    await this.appointmentRepository.save(appointment);

    // 5. Return DTO
    return {
      appointmentId: appointment.getId(),
      patientName: patient.getFullName(),
      doctorName: doctor.getFullName(),
      appointmentDate: appointment.getAppointmentDate(),
      time: appointment.getTime(),
    };
  }
}
```

### 3.3 Infrastructure Layer (`/infrastructure`)

**Responsibility:** Implement domain/application interfaces, handle external services.  
**Dependencies:** Domain + Application layers

```
infrastructure/
├── repositories/            # Repository implementations
│   ├── PatientRepository.ts       # Implements IPatientRepository
│   ├── AppointmentRepository.ts   # Implements IAppointmentRepository
│   ├── ConsultationRepository.ts  # Implements IConsultationRepository
│   └── ...
│
├── mappers/                 # Prisma ↔ Domain conversion
│   ├── PatientMapper.ts
│   ├── AppointmentMapper.ts
│   └── ...
│
├── services/                # Service implementations
│   ├── JwtAuthService.ts         # JWT-based auth (bcrypt + signing)
│   ├── AuthFactory.ts            # Auth service factory
│   ├── PostgresAuditService.ts   # Implements IAuditService
│   ├── SendgridNotificationService.ts
│   └── TwilioSmsService.ts
│
└── database/
    └── PrismaClient.ts      # Singleton Prisma instance
```

#### 3.3.1 Repository Implementation Example

```typescript
export class PrismaPatientRepository implements IPatientRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<Patient | null> {
    // 1. Query database using Prisma
    const raw = await this.db.patient.findUnique({ where: { id } });
    
    if (!raw) return null;

    // 2. Map Prisma model to domain entity
    return PatientMapper.fromPrisma(raw);
  }

  async save(patient: Patient): Promise<void> {
    // 1. Convert domain entity to Prisma create input
    const data = PatientMapper.toPrismaCreateInput(patient);
    
    // 2. Send to database
    await this.db.patient.create({ data });
  }

  async update(patient: Patient): Promise<void> {
    const data = PatientMapper.toPrismaUpdateInput(patient);
    await this.db.patient.update({
      where: { id: patient.getId() },
      data,
    });
  }

  // ... other methods
}
```

**Key Mappers:**

```typescript
export class PatientMapper {
  // Prisma → Domain
  static fromPrisma(raw: PrismaPatient): Patient {
    return Patient.create({
      id: raw.id,
      email: Email.create(raw.email),
      firstName: raw.first_name,
      lastName: raw.last_name,
      dateOfBirth: raw.date_of_birth,
      // ...
    });
  }

  // Domain → Prisma (Create)
  static toPrismaCreateInput(patient: Patient): Prisma.PatientCreateInput {
    return {
      id: patient.getId(),
      email: patient.getEmail().getValue(),
      first_name: patient.getFirstName(),
      last_name: patient.getLastName(),
      date_of_birth: patient.getDateOfBirth(),
      // ...
    };
  }

  // Domain → DTO (Response)
  static toResponseDto(patient: Patient): PatientResponseDto {
    return {
      id: patient.getId(),
      email: patient.getEmail().getValue(),
      firstName: patient.getFirstName(),
      lastName: patient.getLastName(),
      age: patient.getAge(),
      // ...
    };
  }
}
```

### 3.4 Interface Layer (`/app`)

**Responsibility:** Present data to users, capture input.  
**Dependencies:** Application layer + Framework-specific

```
app/
├── (auth)/                  # Authentication pages
│   └── login/
│       └── page.tsx
│
├── (public)/                # Public pages
│   ├── consent/             # Consent signing (public)
│   └── patient-intake/      # Patient intake form (public)
│
├── doctor/                  # Doctor portal
│   ├── dashboard/
│   ├── consultations/
│   ├── appointments/
│   └── patients/
│
├── frontdesk/               # Front desk portal
│   ├── dashboard/
│   ├── appointments/
│   ├── patient-check-in/
│   └── consultations/
│
├── admin/                   # Admin portal
│   ├── users/
│   ├── audit-logs/
│   └── reports/
│
├── api/                     # API endpoints
│   ├── patient/
│   ├── appointments/
│   ├── consultations/
│   └── public/
│
└── components/              # Reusable components
    ├── ui/
    ├── forms/
    ├── dialogs/
    └── layouts/
```

#### 3.4.1 API Route Example

```typescript
// app/api/appointments/book/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { BookAppointmentUseCase } from '@/application/use-cases/BookAppointmentUseCase';
import { PrismaAppointmentRepository } from '@/infrastructure/repositories/PrismaAppointmentRepository';
import { db } from '@/lib/db';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate user
    const authResult = await authenticate(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate input
    const body = await request.json();
    const validation = bookAppointmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error },
        { status: 400 }
      );
    }

    // 3. Instantiate use case (dependency injection)
    const appointmentRepository = new PrismaAppointmentRepository(db);
    const patientRepository = new PrismaPatientRepository(db);
    const doctorRepository = new PrismaDoctorRepository(db);
    const availabilityService = new AvailabilityService(appointmentRepository);

    const useCase = new BookAppointmentUseCase(
      appointmentRepository,
      patientRepository,
      doctorRepository,
      availabilityService
    );

    // 4. Execute use case
    const result = await useCase.execute({
      patientId: validation.data.patientId,
      doctorId: validation.data.doctorId,
      date: validation.data.date,
      timeSlot: validation.data.timeSlot,
    });

    // 5. Return response
    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );

  } catch (error) {
    // 6. Error handling
    return handleApiError(error);
  }
}
```

---

## Domain Model

### 4.1 Core Entities & Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                   DOMAIN ENTITIES                           │
└─────────────────────────────────────────────────────────────┘

User/Staff
├── id (PK)
├── email (unique)
├── firstName
├── lastName
├── role (ADMIN, DOCTOR, NURSE, etc.)
├── status (ACTIVE, INACTIVE)
└── createdAt

Patient
├── id (PK)
├── email (unique)
├── firstName
├── lastName
├── dateOfBirth
├── gender
├── phone
├── address
├── medicalHistory
├── allergies
├── insurance
└── consents (relationships)

Doctor
├── id (PK)
├── userId (FK to User)
├── specialization
├── qualifications
└── availability

Appointment
├── id (PK)
├── patientId (FK to Patient)
├── doctorId (FK to Doctor)
├── appointmentDate
├── time
├── status (PENDING, CONFIRMED, COMPLETED, CANCELLED)
└── type (CONSULTATION, CHECKUP, etc.)

Consultation
├── id (PK)
├── appointmentId (FK to Appointment)
├── concern
├── status (SUBMITTED, PENDING_REVIEW, APPROVED, SCHEDULED)
└── consultationData (JSON)

CasePlan
├── id (PK)
├── appointmentId (FK to Appointment)
├── patientId (FK to Patient)
├── procedureType
├── preOpNotes
├── readinessStatus
└── consents (relationships)

ConsentForm
├── id (PK)
├── casePlanId (FK to CasePlan)
├── title
├── type (SURGICAL, ANESTHESIA, etc.)
├── content
├── status (DRAFT, SIGNED, REJECTED)
└── signature

MedicalRecord
├── id (PK)
├── patientId (FK to Patient)
├── appointmentId (FK to Appointment)
├── recordType (VITAL_SIGNS, DIAGNOSIS, etc.)
├── content
└── recordedAt
```

### 4.2 Entity Relationships

```
User ──┬──> Doctor ──┬──> Appointment ──┬──> Consultation
       │             │                    ├──> CasePlan ──> ConsentForm
       │             │                    └──> MedicalRecord
       │             └──────────────────────────────────────┘
       │
       └──> Audit Log (Who did what, when)
       
Patient ──┬──> Appointment ──┬──> Consultation
          ├──> CasePlan ──┬──> ConsentForm
          │                └──> ConsentSigningSession
          ├──> MedicalRecord
          └──> IntakeSubmission
```

---

## Module Breakdown

### 5.1 Patient Module

**Purpose:** Manage patient data and intake process

```typescript
// Domain
Patient entity
- validate age, contact info
- business rules for eligibility

// Application
CreatePatientUseCase
UpdatePatientUseCase
GetPatientByIdUseCase
ListPatientsUseCase
ConfirmPatientIntakeUseCase

// Infrastructure
PrismaPatientRepository

// Interface
/app/patient - Patient portal pages
/app/frontdesk/patients - Patient management
/app/api/patients - API endpoints
```

**Key Flows:**
1. **Intake Flow:** QuestionnaireForm → IntakeSubmission → PatientConfirmation → Patient created
2. **Update Flow:** EditPatientForm → UpdatePatientUseCase → PatientRepository.update()

### 5.2 Appointment Module

**Purpose:** Handle appointment scheduling and availability

```typescript
// Domain
Appointment entity
AvailabilityService (domain service)
- Check doctor availability
- Find conflict slots
- Calculate available times

// Application
BookAppointmentUseCase
RescheduleAppointmentUseCase
CancelAppointmentUseCase
GetDoctorAvailabilityUseCase

// Infrastructure
PrismaAppointmentRepository
PrismaDoctorRepository

// Interface
/app/patient/appointments - Patient booking
/app/frontdesk/appointments - Receptionist view
/app/doctor/availability - Doctor scheduling
/app/api/appointments - API endpoints
```

**Key Flows:**
1. **Booking:** SearchDoctors → SelectTime → BookAppointment → ConfirmationEmail
2. **Rescheduling:** SelectNewTime → RescheduleAppointment → NotifyDoctor
3. **Cancellation:** ConfirmCancel → CancelAppointment → SendNotifications

### 5.3 Consultation Module

**Purpose:** Manage consultation requests and workflows

```typescript
// Domain
Consultation entity (aggregate root)
ConsultationStatus enum
ConsultationSessionService

// Application
SubmitConsultationRequestUseCase
ReviewConsultationRequestUseCase
StartConsultationUseCase
UpdateConsultationDraftUseCase
CompleteConsultationUseCase
DeclineConsultationRequestUseCase

// Infrastructure
PrismaConsultationRepository

// Interface
/app/patient/consultations - Patient requests
/app/frontdesk/consultations - Receptionist review
/app/doctor/consultations - Doctor consultation
/app/api/consultations - API endpoints
```

**Workflow:**
```
Patient submits consultation request
        ↓
Frontdesk reviews (may request more info)
        ↓
Doctor approves & schedules
        ↓
Appointment created
        ↓
Consultation starts (doctor begins consultation notes)
        ↓
Consultation completed (final diagnosis/plan)
```

### 5.4 Clinical Module

**Purpose:** Document clinical findings and treatments

```typescript
// Domain
MedicalRecord entity
VitalSigns entity
Diagnosis entity

// Application
RecordVitalsUseCase
DocumentDiagnosisUseCase
GeneratePrescriptionUseCase
UpdateMedicalHistoryUseCase

// Infrastructure
PrismaMedicalRecordRepository

// Interface
/app/nurse/vitals - Nurse vital signs entry
/app/doctor/diagnosis - Doctor diagnosis entry
/app/api/clinical - API endpoints
```

### 5.5 Consent Module

**Purpose:** Digital consent form management

```typescript
// Domain
ConsentForm entity
ConsentSigningSession entity
ConsentSigningService

// Application
GenerateConsentUseCase
CreateSigningSessionUseCase
SignConsentUseCase
VerifyConsignIdentityUseCase
ValidateOTPUseCase

// Infrastructure
PrismaConsentRepository
QrCodeService
OTPService
TwilioSmsService

// Interface
/app/public/consent/sign - Public signing page
/app/doctor/consents - Doctor consent management
/app/api/public/consent - Public API
/app/api/consents - Protected API
```

**Workflow:**
```
Doctor generates consent
        ↓
QR code created
        ↓
Patient scans QR (or receives link)
        ↓
Patient verifies identity (name + DOB)
        ↓
OTP sent to phone
        ↓
Patient validates OTP
        ↓
Patient signs digitally
        ↓
Audit trail created
```

---

## Data Flow & Workflows

### 6.1 Complete Patient Intake Workflow

```
START: Patient checks in at reception
  │
  ├─→ 1. Init Intake Session (Frontend)
  │     POST /api/patient/intake-session/init
  │     Session ID generated (e.g., abc123xyz)
  │
  ├─→ 2. Patient fills QR code or receives link
  │     Shows intake form on tablet/kiosk
  │
  ├─→ 3. Patient submits form (Frontend validation)
  │     POST /api/patient/intake
  │     Body: { sessionId, firstName, lastName, ... }
  │
  ├─→ 4. Application Layer (SubmitPatientIntakeUseCase)
  │     ├─ Validate session not expired
  │     ├─ Create IntakeSubmission entity
  │     ├─ Store in database
  │     └─ Update session status to SUBMITTED
  │
  ├─→ 5. Frontdesk reviews pending intake
  │     GET /app/frontdesk/pending-intakes
  │     Shows list of pending intakes
  │
  ├─→ 6. Frontdesk confirms intake (ConfirmPatientIntakeUseCase)
  │     POST /api/patient/intake/confirm
  │     ├─ Generate file number (NS001, NS002,..)
  │     ├─ Create Patient entity
  │     ├─ Save to database
  │     └─ Mark intake as CONFIRMED
  │
  ├─→ 7. Patient created in system
  │     ├─ Can now book appointments
  │     ├─ Can submit consultations
  │     └─ Can view medical records
  │
  └─→ END: Patient record created successfully
```

### 6.2 Appointment Booking Workflow

```
Patient clicks "Book Appointment"
  │
  ├─→ 1. Search Doctors
  │     GET /api/doctors?specialization=cosmetic
  │
  ├─→ 2. Check Availability
  │     GET /api/doctors/{doctorId}/availability?date=2025-03-15
  │     Response: [09:00, 10:00, 14:00, 15:00] (available slots)
  │
  ├─→ 3. Select Time & Confirm
  │     POST /api/appointments/book
  │     Body: { patientId, doctorId, date, timeSlot }
  │
  ├─→ 4. Application Layer (BookAppointmentUseCase)
  │     ├─ Load Patient & Doctor entities
  │     ├─ Check availability (domain service)
  │     ├─ Create Appointment entity
  │     ├─ Save to repository
  │     └─ Return confirmation
  │
  ├─→ 5. Send Notifications
  │     ├─ Email to patient
  │     ├─ SMS reminder
  │     └─ Google Calendar event
  │
  └─→ 6. Appointment confirmed
     Visible in patient dashboard
```

### 6.3 Consultation to Case Plan Workflow

```
Doctor initiates case plan from appointment
  │
  ├─→ 1. Create Case Plan
  │     POST /api/case-plans
  │     Body: { appointmentId, procedureType, ..}
  │
  ├─→ 2. Doctor reviews pre-op checklist
  │     GET /app/doctor/case-plans/{casePlanId}
  │
  ├─→ 3. Generate Consent Forms
  │     POST /api/consents/generate
  │     ├─ Create multiple consent types
  │     ├─ Generate QR codes
  │     └─ Return signing links
  │
  ├─→ 4. Patient Signs Consents
  │     GET /consent/sign/{qrCode} (Public)
  │     ├─ Verify identity (name + DOB)
  │     ├─ Send OTP
  │     ├─ Capture digital signature
  │     └─ Store audit trail
  │
  ├─→ 5. Case Plan Readiness
  │     POST /api/case-plans/{casePlanId}/mark-ready
  │     ├─ Verify all consents signed
  │     ├─ Verify checklists completed
  │     └─ Update status to READY_FOR_SURGERY
  │
  └─→ 6. Case Plan ready for surgery
     Viewable in OR system
```

---

## Design Patterns & Principles

### 7.1 Design Patterns Used

#### 1. **Repository Pattern**
- Abstracts data access
- Each entity has a repository interface in domain
- Implementation in infrastructure using Prisma

#### 2. **Mapper Pattern**
- Converts between layers (Prisma ↔ Domain ↔ DTO)
- Keeps each layer using its own types

#### 3. **Domain Service Pattern**
- Stateless services for domain logic
- Example: `AvailabilityService` (availability checking)
- Example: `ConsentSigningService` (consent workflow)

#### 4. **Factory Pattern**
- `Patient.create()` - validates and creates patient
- `IntakeSubmission.create()` - validates and creates submission
- Ensures invariants are maintained

#### 5. **Value Object Pattern**
- `Email` - ensures valid email format
- `PhoneNumber` - ensures valid phone
- Immutable, equality by value

#### 6. **Aggregate Pattern**
- `Patient` - aggregate root for patient data
- `Appointment` - aggregate root for appointment data
- Defines consistency boundaries

#### 7. **Dependency Injection**
- Use cases receive repositories via constructor
- Enables testing with mock repositories
- Loose coupling

```typescript
// Constructor Injection Example
export class BookAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly patientRepository: IPatientRepository,
    private readonly availabilityService: AvailabilityService,
  ) {}
}
```

#### 8. **Observer Pattern (implicit)**
- Audit logging via `IAuditService`
- Notifications via `INotificationService`
- Can add new observers without changing core logic

### 7.2 SOLID Principles

#### **Single Responsibility Principle**
- One use case per file
- Repository only handles data access
- Services have one job

#### **Open/Closed Principle**
- Open for extension (new use cases)
- Closed for modification (existing use cases stable)

#### **Liskov Substitution Principle**
- All `IPatientRepository` implementations interchangeable
- Can switch from Prisma to MongoDB without breaking code

#### **Interface Segregation Principle**
- `IPatientRepository` has only patient-related methods
- `IDoctorRepository` has only doctor-related methods
- Clients depend only on methods they use

#### **Dependency Inversion Principle**
- Domain defines interfaces
- Infrastructure implements interfaces
- Application depends on domain interfaces

---

## Technology Stack

### 8.1 Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| Next.js | React framework with App Router | 14+ |
| React | UI library | 18+ |
| TypeScript | Type safety | 5+ |
| Tailwind CSS | Styling | 3+ |
| shadcn/ui | Component library | Latest |
| Zod | Schema validation | 3+ |
| React Hook Form | Form management | 7+ |
| TanStack Query | Data fetching/caching | 5+ |
| Zustand | State management | Latest |
| Sonner | Toast notifications | Latest |

### 8.2 Backend

| Technology | Purpose | Version |
|------------|---------|---------|
| Next.js | Node.js framework + API routes | 14+ |
| TypeScript | Type safety | 5+ |
| Prisma | ORM | 5+ |
| PostgreSQL | Database | 14+ |
| JWT (jsonwebtoken) | Token signing & verification | Latest |
| bcrypt | Password hashing | Latest |

### 8.3 Infrastructure & DevOps

| Technology | Purpose | Version |
|------------|---------|---------|
| Docker | Containerization | Latest |
| Docker Compose | Multi-container orchestration | Latest |
| PostgreSQL | Relational database | 14+ |
| Redis | Caching (optional) | 7+ |
| AWS RDS | Managed database | As needed |
| S3 | File storage | As needed |

### 8.4 Testing & Quality

| Technology | Purpose | Version |
|------------|---------|---------|
| Vitest | Unit testing | Latest |
| @testing-library/react | Component testing | Latest |
| Cypress | E2E testing | Latest |
| ESLint | Linting | Latest |
| Prettier | Code formatting | Latest |

---

## Key Design Decisions

### 9.1 Why Clean Architecture?

**Decision:** Use Clean Architecture with 4-layer pattern (Interface → Application → Domain → Infrastructure)

**Rationale:**
- **Testability:** Domain logic tested without database/framework
- **Maintainability:** Clear layer boundaries
- **Independence:** Easy to replace Prisma, JWT, or other tools (due to IAuthService interface)
- **Framework Agnostic:** Business logic survives framework upgrades

**Trade-offs:**
- ✓ More files/folders initially
- ✓ Requires discipline in team
- ✗ More upfront investment
- ✗ Overhead for simple features

### 9.2 Why Modular Monolith Instead of Microservices?

**Decision:** Single Next.js monolith with module boundaries instead of microservices

**Rationale:**
- **Startup Phase:** Easier to deploy and manage single app
- **Shared Data:** Patient, Doctor, Appointment data shared across all modules
- **Transactions:** Complex workflows need ACID transactions
- **Scalability:** Monolith scales to 10K+ requests/min with proper caching

**When to Move to Microservices:**
- 100+ engineers on team
- Modules have completely different scaling needs
- Separate deployment cadences needed
- Clear data ownership boundaries

### 9.3 Why Prisma ORM?

**Decision:** Prisma instead of TypeORM, Sequelize, or raw SQL

**Rationale:**
- ✓ **Type Safety:** Schema-first approach ensures type safety
- ✓ **Developer Experience:** Clean, intuitive API
- ✓ **Migrations:** Built-in migration system with versioning
- ✓ **Performance:** Efficient query execution
- ✓ **Relationships:** Excellent support for complex relationships

**Examples:**
```typescript
// Get patient with all appointments
const patient = await db.patient.findUnique({
  where: { id: patientId },
  include: {
    appointments: {
      where: { status: 'SCHEDULED' },
      orderBy: { appointmentDate: 'asc' },
    },
  },
});
```

### 9.4 Why PostgreSQL?

**Decision:** PostgreSQL instead of MySQL, MongoDB, or other databases

**Rationale:**
- ✓ **ACID Compliance:** Critical for healthcare data integrity
- ✓ **Advanced Features:** Full-text search, JSON, arrays, enums
- ✓ **Performance:** Excellent for complex queries with many JOINs
- ✓ **Ecosystem:** Rich extension ecosystem (PostGIS, UUID, etc.)

### 9.5 Why JWT + bcrypt for Authentication?

**Decision:** JWT (jsonwebtoken) + bcrypt instead of Clerk, Auth0, or Firebase

**Rationale:**
- ✓ **No Vendor Lock-in:** Not dependent on external SaaS providers
- ✓ **Full Control:** Complete control over authentication flow and security policies
- ✓ **Stateless:** JWT tokens are stateless and scalable
- ✓ **HIPAA Compliant:** Meets healthcare compliance requirements
- ✓ **Cost Effective:** No per-user licensing costs
- ✓ **Flexible RBAC:** Role-based access control fully customizable via domain layer
- ✓ **Refresh Token Support:** Secure token rotation via refresh tokens
- ✓ **bcrypt Security:** Industry-standard password hashing with configurable salt rounds

---

## Scalability & Performance

### 10.1 Caching Strategy

**Three-Level Caching:**

```
Level 1: Browser Cache
  ├─ Static assets (JS, CSS, images)
  └─ Stale-While-Revalidate (SWR) for API responses

Level 2: Application Cache (Redis/Memory)
  ├─ Doctor availability (10 min TTL)
  ├─ Patient data (5 min TTL)
  └─ System lookups (1 hour TTL)

Level 3: Database Cache
  └─ Prisma query caching
```

### 10.2 Load Testing Targets

```
Concurrent Users: 500+
Requests/sec: 1,000+
Response Time: <200ms (p95)
Database Connections: 20-30 pooled

Doctor Availability Checks: 100/sec
Appointment Bookings: 10/sec
Patient Dashboard Loads: 50/sec
```

### 10.3 Database Optimization

```sql
-- Key Indexes for Performance
CREATE INDEX idx_patient_email ON patient(email);
CREATE INDEX idx_appointment_doctor_date ON appointment(doctor_id, appointment_date);
CREATE INDEX idx_appointment_patient_id ON appointment(patient_id);
CREATE INDEX idx_consultation_status ON consultation(status);

-- Materialized Views for Reporting
CREATE MATERIALIZED VIEW doctor_availability_summary AS
SELECT doctor_id, COUNT(*) as available_slots
FROM appointment
WHERE status = 'AVAILABLE'
GROUP BY doctor_id;
```

---

## Security Architecture

### 11.1 Authentication & Authorization

```
Authentication (JWT + bcrypt)
  ├─ Email/Password login (bcrypt verified)
  ├─ JWT access tokens (short-lived, 15 min)
  ├─ JWT refresh tokens (long-lived, 7 days)
  ├─ Token rotation & refresh flow
  ├─ Multi-factor authentication (MFA) ready
  └─ Stateless session management

Authorization (Role-Based)
  ├─ ADMIN - Full system access
  ├─ DOCTOR - Own consultations, patients
  ├─ NURSE - Clinical documentation
  ├─ FRONTDESK - Appointments, check-in
  └─ PATIENT - Own data only
```

### 11.2 Data Protection

```
At Rest (Database)
  ├─ Encrypted storage (AWS RDS encryption)
  ├─ Sensitive fields encrypted (SSN, DOB)
  └─ Regular backups (daily)

In Transit (HTTPS)
  ├─ TLS 1.3 enforced
  ├─ Certificate pinning (optional)
  └─ CORS properly configured

In Memory
  ├─ Secrets not logged
  ├─ PII handles carefully
  └─ Immediate cleanup after use
```

### 11.3 HIPAA Compliance (US) / GDPR (EU)

```
Patient Consent
  ├─ Explicit consent for data collection
  ├─ Withdrawal of consent support
  └─ Digital signatures (legally binding)

Data Access
  ├─ Audit logging every access
  ├─ Role-based access control
  └─ Need-to-know principle

Data Retention
  ├─ Retention policies enforced
  ├─ Secure deletion (cryptographic erasure)
  └─ Archive for compliance
```

---

## Summary: Architecture Strengths & Considerations

### ✅ Strengths

1. **Separation of Concerns:** Each layer has single responsibility
2. **Testability:** Domain logic testable without framework
3. **Flexibility:** Easy to replace implementations
4. **Scalability:** Modular structure prevents monolithic bloat
5. **Team Friendly:** Clear structure helps onboarding
6. **Future-Proof:** Can evolve to microservices if needed

### ⚠️ Considerations

1. **Initial Complexity:** Requires more upfront architecture work
2. **File Count:** Many files/folders initially intimidating
3. **Discipline:** Team must follow patterns consistently
4. **Performance:** Extra layer indirection (minimal with caching)
5. **Onboarding:** New developers need architecture training

### 🎯 Next Steps

1. **Implement Unit Tests** for all domain entities
2. **Add Integration Tests** for use cases
3. **E2E Tests** for critical workflows
4. **Performance Monitoring** (APM tools)
5. **Documentation** (Architecture Decision Records - ADRs)
6. **Team Training** on Clean Architecture principles

---

## Appendix: File Structure Reference

```
fullstack-healthcare/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── aggregates/
│   ├── interfaces/
│   │   ├── repositories/
│   │   └── services/
│   ├── enums/
│   ├── exceptions/
│   └── services/
│
├── application/
│   ├── use-cases/
│   ├── dtos/
│   ├── mappers/
│   ├── services/
│   └── errors/
│
├── infrastructure/
│   ├── repositories/
│   ├── mappers/
│   ├── services/
│   └── database/
│
├── app/
│   ├── (auth)/
│   ├── (public)/
│   ├── doctor/
│   ├── frontdesk/
│   ├── admin/
│   ├── patient/
│   ├── api/
│   └── components/
│
├── lib/
│   ├── db.ts
│   ├── auth/
│   ├── validation/
│   └── utils/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── docs/
    ├── architecture/
    └── decisions/

---

**Document Version:** 1.0  
**Last Updated:** March 2, 2026  
**Author:** System Architecture Team  
**Status:** Production Ready
