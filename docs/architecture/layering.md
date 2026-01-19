# Clean Architecture Refactoring Plan

**Date:** January 2025  
**Engineer:** Senior Staff TypeScript Engineer & Healthcare Systems Architect  
**Goal:** Refactor HIMS to Clean Architecture without changing behavior, improving testability and maintainability

---

## Executive Summary

This plan proposes a Clean Architecture refactor that separates:
- **Domain Layer** - Pure business logic, no framework dependencies
- **Application Layer** - Use cases and application services, orchestration
- **Infrastructure Layer** - External concerns (DB, Auth, APIs)
- **Interface Layer** - Controllers, routes, UI components

**Key Principle:** Dependencies point inward. Domain has no dependencies, infrastructure depends on domain/application, interfaces depend on all layers.

---

## 1. CURRENT STRUCTURE ANALYSIS

### 1.1 Current Folder Organization

```
/home/bkg/fullstack-healthcare/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Authentication routes
│   ├── (protected)/             # Protected routes (admin, doctor, patient, record)
│   ├── actions/                 # Server Actions (write operations)
│   │   ├── admin.ts
│   │   ├── appointment.ts
│   │   ├── general.ts
│   │   ├── medical.ts
│   │   └── patient.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/                   # React components
│   ├── ui/                      # Base UI components (Radix UI wrappers)
│   ├── appointment/             # Appointment feature components
│   ├── charts/                  # Chart components
│   ├── dialogs/                 # Dialog components
│   ├── forms/                   # Form components
│   └── ...
├── lib/                         # Shared utilities
│   ├── db.ts                    # Prisma client singleton
│   ├── schema.ts                # Zod validation schemas
│   ├── routes.ts                # Route access configuration
│   ├── utils.ts                 # Utility functions
│   └── index.ts                 # Constants (GENDER, MARITAL_STATUS, etc.)
├── middleware.ts                # Next.js middleware (Clerk auth)
├── prisma/                      # Database schema
│   └── schema.prisma
├── types/                       # TypeScript type definitions
│   ├── data-types.ts           # Type aliases for appointments, etc.
│   ├── globals.d.ts            # Global type extensions
│   └── index.ts                # SearchParams type
├── utils/                       # Business logic
│   ├── services/               # Query services (read operations)
│   │   ├── admin.ts
│   │   ├── appointment.ts
│   │   ├── doctor.ts
│   │   ├── medical-record.ts
│   │   ├── medical.ts
│   │   ├── patient.ts
│   │   ├── payments.ts
│   │   └── staff.ts
│   ├── roles.ts                # Role checking utilities
│   ├── seetings.ts             # Constants (SPECIALIZATION, DATA_LIMIT)
│   └── index.ts                # Utility functions (formatNumber, calculateAge, etc.)
└── ...
```

### 1.2 Current Layer Identification

#### **Domain Logic (Currently Mixed/Scattered):**
- ❌ **Business rules in actions** - `app/actions/*.ts` contain validation + business logic
- ❌ **Business rules in services** - `utils/services/*.ts` contain query logic + some business rules
- ❌ **Validation rules** - `lib/schema.ts` (Zod schemas) mixed with presentation concerns
- ❌ **Domain entities** - Only Prisma types exist, no rich domain models
- ❌ **Constants** - Scattered across `lib/index.ts`, `utils/seetings.ts`, `utils/index.ts`

**Examples of Domain Logic Currently in Wrong Layer:**
- MedicalRecord creation logic duplicated in `app/actions/appointment.ts` and `app/actions/medical.ts`
- Discount calculation in `app/actions/medical.ts` (`generateBill`)
- Appointment conflict checking logic (missing, but would be in actions)
- Patient age calculation in `utils/index.ts`
- BMI calculation in `utils/index.ts`

#### **Application Services (Currently in Actions/Services):**
- ✅ **Write operations** - `app/actions/*.ts` (create, update, delete)
- ✅ **Read operations** - `utils/services/*.ts` (find, list, query)
- ❌ **Orchestration** - Mixed with business logic in actions
- ❌ **Transaction management** - Missing (should be in application layer)
- ❌ **Use cases** - Not clearly defined, logic scattered

**Examples:**
- `createNewPatient` in `app/actions/patient.ts` - orchestrates Clerk user creation + DB insert
- `createNewAppointment` in `app/actions/appointment.ts` - simple DB insert, no validation
- `addVitalSigns` in `app/actions/appointment.ts` - creates MedicalRecord if missing (business logic)

#### **Infrastructure (Currently Mixed):**
- ✅ **Database** - `lib/db.ts` (Prisma client)
- ✅ **Database Schema** - `prisma/schema.prisma`
- ❌ **Auth** - Tightly coupled to Clerk (no abstraction)
- ❌ **Repository pattern** - Missing (direct Prisma calls everywhere)
- ❌ **External services** - No abstraction layer

**Examples:**
- `lib/db.ts` - Prisma client singleton (infrastructure)
- `app/actions/patient.ts` - Direct Clerk client usage (no abstraction)
- `utils/services/*.ts` - Direct Prisma queries (should use repositories)

#### **Interface/Adapters (Currently Mixed):**
- ✅ **Routes** - `app/(auth)/`, `app/(protected)/` (Next.js pages)
- ✅ **UI Components** - `components/` (React components)
- ✅ **Server Actions** - `app/actions/*.ts` (Next.js Server Actions)
- ✅ **Middleware** - `middleware.ts` (Clerk auth middleware)
- ❌ **Controllers** - Not clearly separated (Server Actions are controllers)

**Examples:**
- `app/(protected)/patient/page.tsx` - Page component (interface)
- `components/forms/book-appointment.tsx` - Form component (interface)
- `app/actions/appointment.ts` - Server Action (interface + application logic mixed)

---

## 2. PROPOSED CLEAN ARCHITECTURE STRUCTURE

### 2.1 New Folder Structure

```
/home/bkg/fullstack-healthcare/
├── domain/                       # ✅ NEW - Domain Layer (no dependencies)
│   ├── entities/                # Domain entities (rich models)
│   │   ├── Patient.ts
│   │   ├── Doctor.ts
│   │   ├── Staff.ts
│   │   ├── Appointment.ts
│   │   ├── MedicalRecord.ts
│   │   ├── VitalSigns.ts
│   │   ├── Diagnosis.ts
│   │   ├── Payment.ts
│   │   ├── LabTest.ts
│   │   └── Service.ts
│   ├── value-objects/           # Value objects (immutable)
│   │   ├── Email.ts
│   │   ├── PhoneNumber.ts
│   │   ├── Address.ts
│   │   ├── TimeSlot.ts
│   │   ├── Money.ts
│   │   ├── BloodPressure.ts
│   │   └── HeartRate.ts
│   ├── enums/                   # Domain enums
│   │   ├── Role.ts
│   │   ├── AppointmentStatus.ts
│   │   ├── PaymentStatus.ts
│   │   ├── Gender.ts
│   │   └── ...
│   ├── exceptions/              # Domain exceptions
│   │   ├── DomainException.ts
│   │   ├── PatientNotFoundError.ts
│   │   ├── AppointmentConflictError.ts
│   │   └── ...
│   ├── rules/                   # Business rules (if complex)
│   │   ├── AppointmentRules.ts
│   │   ├── BillingRules.ts
│   │   └── ClinicalRules.ts
│   └── interfaces/              # Domain interfaces (ports)
│       ├── repositories/        # Repository interfaces
│       │   ├── IPatientRepository.ts
│       │   ├── IAppointmentRepository.ts
│       │   ├── IMedicalRecordRepository.ts
│       │   └── ...
│       ├── services/            # External service interfaces
│       │   ├── IAuthService.ts
│       │   ├── IAuditService.ts
│       │   └── INotificationService.ts
│       └── events/              # Domain events (future)
│
├── application/                 # ✅ NEW - Application Layer
│   ├── use-cases/               # Use cases (single responsibility)
│   │   ├── patient/
│   │   │   ├── CreatePatientUseCase.ts
│   │   │   ├── UpdatePatientUseCase.ts
│   │   │   ├── GetPatientByIdUseCase.ts
│   │   │   └── ListPatientsUseCase.ts
│   │   ├── appointment/
│   │   │   ├── BookAppointmentUseCase.ts
│   │   │   ├── UpdateAppointmentStatusUseCase.ts
│   │   │   ├── GetAppointmentByIdUseCase.ts
│   │   │   ├── ListAppointmentsUseCase.ts
│   │   │   └── CheckAppointmentAvailabilityUseCase.ts
│   │   ├── clinical/
│   │   │   ├── CreateMedicalRecordUseCase.ts
│   │   │   ├── AddVitalSignsUseCase.ts
│   │   │   ├── AddDiagnosisUseCase.ts
│   │   │   └── RequestLabTestUseCase.ts
│   │   └── billing/
│   │       ├── CreateBillUseCase.ts
│   │       ├── AddBillItemUseCase.ts
│   │       ├── GenerateInvoiceUseCase.ts
│   │       └── ProcessPaymentUseCase.ts
│   ├── services/                # Application services (orchestration)
│   │   ├── AppointmentBookingService.ts
│   │   ├── ClinicalDocumentationService.ts
│   │   ├── BillingService.ts
│   │   └── PatientRegistrationService.ts
│   ├── dto/                     # Data Transfer Objects
│   │   ├── patient/
│   │   │   ├── CreatePatientDto.ts
│   │   │   ├── UpdatePatientDto.ts
│   │   │   └── PatientResponseDto.ts
│   │   ├── appointment/
│   │   │   ├── BookAppointmentDto.ts
│   │   │   └── AppointmentResponseDto.ts
│   │   └── ...
│   ├── validators/              # Application-level validation
│   │   ├── PatientValidator.ts
│   │   ├── AppointmentValidator.ts
│   │   └── ...
│   └── mappers/                 # Entity ↔ DTO mappers
│       ├── PatientMapper.ts
│       ├── AppointmentMapper.ts
│       └── ...
│
├── infrastructure/              # ✅ NEW - Infrastructure Layer
│   ├── database/                # Database implementation
│   │   ├── prisma/              # Keep existing Prisma folder here
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── repositories/        # Prisma repository implementations
│   │   │   ├── PrismaPatientRepository.ts
│   │   │   ├── PrismaAppointmentRepository.ts
│   │   │   ├── PrismaMedicalRecordRepository.ts
│   │   │   └── ...
│   │   ├── PrismaClient.ts      # Moved from lib/db.ts
│   │   └── PrismaModule.ts      # DI container setup (future)
│   ├── auth/                    # Authentication implementation
│   │   ├── ClerkAuthService.ts  # Implements IAuthService
│   │   └── ClerkUserAdapter.ts  # Maps Clerk user to domain
│   ├── validation/              # Validation implementation
│   │   ├── ZodPatientValidator.ts
│   │   ├── ZodAppointmentValidator.ts
│   │   └── ...
│   ├── audit/                   # Audit implementation
│   │   ├── PrismaAuditService.ts
│   │   └── AuditLogger.ts
│   ├── config/                  # Configuration
│   │   ├── DatabaseConfig.ts
│   │   ├── AuthConfig.ts
│   │   └── AppConfig.ts
│   └── utils/                   # Infrastructure utilities
│       ├── DateUtils.ts
│       └── ...
│
├── interfaces/                  # ✅ NEW - Interface Layer
│   ├── http/                    # HTTP/API interface
│   │   ├── actions/             # Next.js Server Actions (thin controllers)
│   │   │   ├── patient.actions.ts
│   │   │   ├── appointment.actions.ts
│   │   │   ├── clinical.actions.ts
│   │   │   └── billing.actions.ts
│   │   ├── routes/              # Route handlers (if using API routes)
│   │   └── middleware.ts        # Auth middleware (moved)
│   ├── web/                     # Web interface (Next.js App Router)
│   │   ├── app/                 # ✅ MOVE from root - Next.js pages
│   │   │   ├── (auth)/
│   │   │   ├── (protected)/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── components/          # ✅ MOVE from root - React components
│   │       ├── ui/
│   │       ├── appointment/
│   │       ├── forms/
│   │       └── ...
│   └── adapters/                # Adapters for external services
│       ├── ClerkAdapter.ts      # Clerk-specific adapters
│       └── ...
│
├── shared/                      # ✅ NEW - Shared code (used by multiple layers)
│   ├── constants/               # ✅ MOVE from lib/index.ts, utils/seetings.ts
│   │   ├── Gender.ts
│   │   ├── MaritalStatus.ts
│   │   ├── Specialization.ts
│   │   └── ...
│   ├── types/                   # ✅ MOVE from types/ - Shared types
│   │   ├── CommonTypes.ts
│   │   └── ...
│   └── utils/                   # ✅ MOVE from lib/utils.ts, utils/index.ts - Pure utilities
│       ├── formatNumber.ts
│       ├── calculateAge.ts
│       ├── calculateBMI.ts
│       └── ...
│
├── tests/                       # ✅ NEW - Test organization
│   ├── unit/
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   ├── integration/
│   └── e2e/
│
└── [config files remain at root]
    ├── package.json
    ├── tsconfig.json
    ├── next.config.mjs
    └── ...
```

### 2.2 Layer Dependency Rules

```
┌─────────────────────────────────────┐
│   interfaces/ (Interface Layer)     │
│   - Next.js pages, components       │
│   - Server Actions (thin)           │
│   - API routes                      │
└─────────────┬───────────────────────┘
              │ depends on
┌─────────────▼───────────────────────┐
│   application/ (Application Layer)  │
│   - Use cases                       │
│   - Application services            │
│   - DTOs, validators, mappers       │
└─────────────┬───────────────────────┘
              │ depends on
┌─────────────▼───────────────────────┐
│   domain/ (Domain Layer)            │
│   - Entities                        │
│   - Value objects                   │
│   - Domain interfaces               │
│   - Business rules                  │
└─────────────────────────────────────┘
              ↑ implements
┌─────────────┴───────────────────────┐
│   infrastructure/ (Infrastructure)  │
│   - Repository implementations      │
│   - Prisma, Clerk                   │
│   - External services               │
└─────────────────────────────────────┘
```

**Key Rules:**
- Domain has **ZERO** dependencies (no imports from other layers)
- Application depends on Domain only
- Infrastructure implements Domain interfaces and depends on Domain/Application
- Interfaces depend on Application (and Domain for types only)

---

## 3. DETAILED FILE MAPPING

### 3.1 Domain Layer (`domain/`)

**Purpose:** Pure business logic, no framework dependencies. These files define WHAT the system does, not HOW.

#### **`domain/entities/`**
**What belongs here:**
- Rich domain models (classes) that encapsulate business rules
- Entities are identified by an ID
- Contain business logic, validation, and invariants
- NO Prisma types, NO database concerns

**Files to create (NEW - not moving, creating):**
```
domain/entities/
├── Patient.ts                    # NEW - Rich Patient entity
├── Doctor.ts                     # NEW - Rich Doctor entity
├── Staff.ts                      # NEW - Rich Staff entity
├── Appointment.ts                # NEW - Rich Appointment entity
├── MedicalRecord.ts              # NEW - Rich MedicalRecord entity
├── VitalSigns.ts                 # NEW - Rich VitalSigns entity
├── Diagnosis.ts                  # NEW - Rich Diagnosis entity
├── Payment.ts                    # NEW - Rich Payment entity
├── LabTest.ts                    # NEW - Rich LabTest entity
└── Service.ts                    # NEW - Rich Service entity
```

**Example structure (Patient.ts):**
```typescript
// domain/entities/Patient.ts
export class Patient {
  constructor(
    private readonly id: PatientId,
    private readonly firstName: string,
    private readonly lastName: string,
    // ... other fields
  ) {}

  // Business rules
  updateMedicalHistory(history: string): void {
    // Validation logic
  }

  addAllergy(allergy: Allergy): void {
    // Business rule: check if already exists
  }

  // Value calculation
  getAge(): number {
    // Calculate age from DOB
  }
}
```

#### **`domain/value-objects/`**
**What belongs here:**
- Immutable value objects (no identity)
- Validation encapsulated in value object
- Examples: Email, PhoneNumber, Address, TimeSlot, Money

**Files to create (NEW):**
```
domain/value-objects/
├── Email.ts
├── PhoneNumber.ts
├── Address.ts
├── TimeSlot.ts
├── Money.ts
├── BloodPressure.ts
└── HeartRate.ts
```

#### **`domain/enums/`**
**What belongs here:**
- Domain enums (not Prisma enums, though we can mirror them)
- Pure TypeScript enums/const objects

**Files to create (NEW - extract from Prisma schema):**
```
domain/enums/
├── Role.ts                       # Extract from prisma/schema.prisma
├── AppointmentStatus.ts          # Extract from prisma/schema.prisma
├── PaymentStatus.ts              # Extract from prisma/schema.prisma
├── PaymentMethod.ts              # Extract from prisma/schema.prisma
├── Gender.ts                     # Extract from prisma/schema.prisma
├── Status.ts                     # Extract from prisma/schema.prisma
└── JobType.ts                    # Extract from prisma/schema.prisma
```

#### **`domain/exceptions/`**
**What belongs here:**
- Domain-specific exceptions
- Custom error classes

**Files to create (NEW):**
```
domain/exceptions/
├── DomainException.ts            # Base exception
├── PatientNotFoundError.ts
├── AppointmentConflictError.ts
├── InvalidVitalSignsError.ts
└── ...
```

#### **`domain/interfaces/repositories/`**
**What belongs here:**
- Repository interfaces (ports)
- Define WHAT data access methods are needed
- NO implementation details

**Files to create (NEW):**
```
domain/interfaces/repositories/
├── IPatientRepository.ts
├── IAppointmentRepository.ts
├── IMedicalRecordRepository.ts
├── IDoctorRepository.ts
├── IStaffRepository.ts
├── IPaymentRepository.ts
├── ILabTestRepository.ts
└── IServiceRepository.ts
```

**Example:**
```typescript
// domain/interfaces/repositories/IPatientRepository.ts
import { Patient } from '../../entities/Patient';
import { PatientId } from '../../value-objects/PatientId';

export interface IPatientRepository {
  findById(id: PatientId): Promise<Patient | null>;
  findByEmail(email: string): Promise<Patient | null>;
  save(patient: Patient): Promise<void>;
  delete(id: PatientId): Promise<void>;
  // ... other methods
}
```

#### **`domain/interfaces/services/`**
**What belongs here:**
- Interfaces for external services (auth, audit, notifications)
- Define WHAT external services are needed

**Files to create (NEW):**
```
domain/interfaces/services/
├── IAuthService.ts               # Auth abstraction
├── IAuditService.ts              # Audit abstraction
└── INotificationService.ts       # Notification abstraction
```

---

### 3.2 Application Layer (`application/`)

**Purpose:** Orchestrate use cases, coordinate domain entities, handle application-level concerns (transactions, validation).

#### **`application/use-cases/`**
**What belongs here:**
- Single-use case per file (one responsibility)
- Orchestrate domain entities and repositories
- Handle transactions
- Convert between DTOs and domain entities

**Files to create (refactor from `app/actions/` and `utils/services/`):**
```
application/use-cases/
├── patient/
│   ├── CreatePatientUseCase.ts      # From app/actions/patient.ts::createNewPatient
│   ├── UpdatePatientUseCase.ts      # From app/actions/patient.ts::updatePatient
│   ├── GetPatientByIdUseCase.ts     # From utils/services/patient.ts::getPatientById
│   ├── GetPatientFullDataUseCase.ts # From utils/services/patient.ts::getPatientFullDataById
│   └── ListPatientsUseCase.ts       # From utils/services/patient.ts::getAllPatients
│
├── appointment/
│   ├── BookAppointmentUseCase.ts    # From app/actions/appointment.ts::createNewAppointment
│   ├── UpdateAppointmentStatusUseCase.ts # From app/actions/appointment.ts::appointmentAction
│   ├── GetAppointmentByIdUseCase.ts # From utils/services/appointment.ts::getAppointmentById
│   ├── GetAppointmentWithMedicalRecordsUseCase.ts # From utils/services/appointment.ts::getAppointmentWithMedicalRecordsById
│   └── ListAppointmentsUseCase.ts   # From utils/services/appointment.ts::getPatientAppointments
│
├── clinical/
│   ├── CreateMedicalRecordUseCase.ts # Extract logic from app/actions/appointment.ts + medical.ts
│   ├── AddVitalSignsUseCase.ts      # From app/actions/appointment.ts::addVitalSigns
│   ├── AddDiagnosisUseCase.ts       # From app/actions/medical.ts::addDiagnosis
│   ├── RequestLabTestUseCase.ts     # NEW (extract from clinical workflow)
│   └── GetMedicalRecordsUseCase.ts  # From utils/services/medical-record.ts::getMedicalRecords
│
├── billing/
│   ├── CreateBillUseCase.ts         # Extract from app/actions/medical.ts::addNewBill
│   ├── AddBillItemUseCase.ts        # Extract from app/actions/medical.ts::addNewBill
│   ├── GenerateInvoiceUseCase.ts    # From app/actions/medical.ts::generateBill
│   └── GetPaymentRecordsUseCase.ts  # From utils/services/payments.ts::getPaymentRecords
│
├── doctor/
│   ├── CreateDoctorUseCase.ts       # From app/actions/admin.ts::createNewDoctor
│   ├── GetDoctorByIdUseCase.ts      # From utils/services/doctor.ts::getDoctorById
│   ├── GetDoctorDashboardStatsUseCase.ts # From utils/services/doctor.ts::getDoctorDashboardStats
│   └── ListDoctorsUseCase.ts        # From utils/services/doctor.ts::getAllDoctors
│
└── staff/
    ├── CreateStaffUseCase.ts        # From app/actions/admin.ts::createNewStaff
    └── ListStaffUseCase.ts          # From utils/services/staff.ts::getAllStaff
```

**Example refactoring:**
```typescript
// BEFORE: app/actions/patient.ts
export async function createNewPatient(data: any, pid: string) {
  // Validation
  // Clerk user creation
  // Database insert
}

// AFTER: application/use-cases/patient/CreatePatientUseCase.ts
export class CreatePatientUseCase {
  constructor(
    private patientRepo: IPatientRepository,
    private authService: IAuthService,
  ) {}

  async execute(dto: CreatePatientDto): Promise<PatientResponseDto> {
    // 1. Validate DTO
    // 2. Create domain entity
    // 3. Create auth user (via IAuthService)
    // 4. Save patient (via repository)
    // 5. Return DTO
  }
}
```

#### **`application/services/`**
**What belongs here:**
- Application services that orchestrate multiple use cases
- Complex workflows that span multiple aggregates

**Files to create (NEW - extract complex workflows):**
```
application/services/
├── AppointmentBookingService.ts     # Orchestrates booking + availability + notifications
├── ClinicalDocumentationService.ts  # Orchestrates medical record + vital signs + diagnosis
├── BillingService.ts                # Orchestrates bill creation + calculation + payment
└── PatientRegistrationService.ts    # Orchestrates patient creation + auth + initial setup
```

#### **`application/dto/`**
**What belongs here:**
- Data Transfer Objects for input/output
- Pure data structures (no logic)
- Separate from domain entities

**Files to create (NEW - extract from current actions/services):**
```
application/dto/
├── patient/
│   ├── CreatePatientDto.ts          # From lib/schema.ts::PatientFormSchema
│   ├── UpdatePatientDto.ts
│   └── PatientResponseDto.ts
├── appointment/
│   ├── BookAppointmentDto.ts        # From lib/schema.ts::AppointmentSchema
│   └── AppointmentResponseDto.ts
├── clinical/
│   ├── AddVitalSignsDto.ts          # From lib/schema.ts::VitalSignsSchema
│   └── AddDiagnosisDto.ts           # From lib/schema.ts::DiagnosisSchema
└── billing/
    ├── CreateBillDto.ts
    └── PaymentDto.ts
```

#### **`application/validators/`**
**What belongs here:**
- Application-level validation (input validation)
- Separate from domain validation

**Files to create (refactor from `lib/schema.ts`):**
```
application/validators/
├── PatientValidator.ts              # From lib/schema.ts::PatientFormSchema
├── AppointmentValidator.ts          # From lib/schema.ts::AppointmentSchema
├── VitalSignsValidator.ts           # From lib/schema.ts::VitalSignsSchema
├── DiagnosisValidator.ts            # From lib/schema.ts::DiagnosisSchema
└── ...
```

**Note:** Keep Zod schemas in infrastructure, but validators wrap them with domain-aware validation.

#### **`application/mappers/`**
**What belongs here:**
- Convert between DTOs and domain entities
- Convert between Prisma models and domain entities

**Files to create (NEW):**
```
application/mappers/
├── PatientMapper.ts                 # DTO ↔ Entity ↔ Prisma
├── AppointmentMapper.ts
├── MedicalRecordMapper.ts
└── ...
```

---

### 3.3 Infrastructure Layer (`infrastructure/`)

**Purpose:** Implement external concerns - database, auth, APIs, frameworks.

#### **`infrastructure/database/`**
**What belongs here:**
- Database-specific code
- Prisma client, repositories, migrations

**Files to move/create:**
```
infrastructure/database/
├── prisma/                          # ✅ MOVE from root prisma/
│   ├── schema.prisma
│   └── migrations/
├── PrismaClient.ts                  # ✅ MOVE from lib/db.ts
├── repositories/
│   ├── PrismaPatientRepository.ts   # NEW - Implements IPatientRepository
│   ├── PrismaAppointmentRepository.ts # NEW - Implements IAppointmentRepository
│   ├── PrismaMedicalRecordRepository.ts
│   └── ...
└── PrismaModule.ts                  # NEW - DI setup (future)
```

**Repository example:**
```typescript
// infrastructure/database/repositories/PrismaPatientRepository.ts
import { IPatientRepository } from '../../../domain/interfaces/repositories/IPatientRepository';
import { Patient } from '../../../domain/entities/Patient';
import { PrismaClient } from '../PrismaClient';

export class PrismaPatientRepository implements IPatientRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: PatientId): Promise<Patient | null> {
    const prismaPatient = await this.prisma.patient.findUnique({ where: { id } });
    return prismaPatient ? PatientMapper.toDomain(prismaPatient) : null;
  }

  async save(patient: Patient): Promise<void> {
    const prismaData = PatientMapper.toPersistence(patient);
    await this.prisma.patient.upsert({
      where: { id: patient.id },
      create: prismaData,
      update: prismaData,
    });
  }
}
```

#### **`infrastructure/auth/`**
**What belongs here:**
- Authentication implementation (Clerk)
- Adapters for auth service

**Files to create (NEW - extract from `app/actions/*.ts`):**
```
infrastructure/auth/
├── ClerkAuthService.ts              # NEW - Implements IAuthService
└── ClerkUserAdapter.ts              # NEW - Maps Clerk user to domain
```

**Extract from:**
- `app/actions/patient.ts` - Clerk user creation/update
- `app/actions/admin.ts` - Clerk user creation for doctors/staff

#### **`infrastructure/validation/`**
**What belongs here:**
- Zod validation implementation
- Wraps Zod schemas

**Files to create (refactor from `lib/schema.ts`):**
```
infrastructure/validation/
├── ZodPatientValidator.ts           # NEW - Wraps PatientFormSchema
├── ZodAppointmentValidator.ts       # NEW - Wraps AppointmentSchema
└── ...
```

#### **`infrastructure/audit/`**
**What belongs here:**
- Audit logging implementation
- Prisma-based audit service

**Files to create (NEW):**
```
infrastructure/audit/
├── PrismaAuditService.ts            # NEW - Implements IAuditService
└── AuditLogger.ts                   # NEW - Audit logging utilities
```

#### **`infrastructure/config/`**
**What belongs here:**
- Configuration management
- Environment variable handling

**Files to create (NEW):**
```
infrastructure/config/
├── DatabaseConfig.ts                # NEW - Database configuration
├── AuthConfig.ts                    # NEW - Auth configuration
└── AppConfig.ts                     # NEW - App configuration
```

#### **`infrastructure/utils/`**
**What belongs here:**
- Infrastructure-specific utilities
- Date/time utilities

**Files to create (extract from `utils/index.ts`):**
```
infrastructure/utils/
├── DateUtils.ts                     # Extract date formatting
└── ...
```

---

### 3.4 Interface Layer (`interfaces/`)

**Purpose:** Entry points - HTTP handlers, UI components, API routes.

#### **`interfaces/http/actions/`**
**What belongs here:**
- Thin Server Actions (Next.js)
- Call use cases, return responses
- NO business logic

**Files to refactor (move from `app/actions/`):**
```
interfaces/http/actions/
├── patient.actions.ts               # ✅ REFACTOR from app/actions/patient.ts
├── appointment.actions.ts           # ✅ REFACTOR from app/actions/appointment.ts
├── clinical.actions.ts              # ✅ REFACTOR from app/actions/medical.ts
├── billing.actions.ts               # Extract billing from app/actions/medical.ts
├── admin.actions.ts                 # ✅ REFACTOR from app/actions/admin.ts
└── general.actions.ts               # ✅ REFACTOR from app/actions/general.ts
```

**Example refactoring:**
```typescript
// BEFORE: app/actions/patient.ts
export async function createNewPatient(data: any, pid: string) {
  // 50+ lines of business logic
}

// AFTER: interfaces/http/actions/patient.actions.ts
"use server";

import { CreatePatientUseCase } from '../../../application/use-cases/patient/CreatePatientUseCase';

export async function createPatientAction(dto: CreatePatientDto) {
  const useCase = new CreatePatientUseCase(/* inject dependencies */);
  return await useCase.execute(dto);
}
```

#### **`interfaces/http/middleware.ts`**
**What belongs here:**
- Auth middleware

**Files to move:**
```
interfaces/http/
└── middleware.ts                    # ✅ MOVE from root middleware.ts
```

#### **`interfaces/web/app/`**
**What belongs here:**
- Next.js App Router pages
- Page components only

**Files to move:**
```
interfaces/web/app/
├── (auth)/                          # ✅ MOVE from app/(auth)/
├── (protected)/                     # ✅ MOVE from app/(protected)/
├── layout.tsx                       # ✅ MOVE from app/layout.tsx
└── page.tsx                         # ✅ MOVE from app/page.tsx
```

#### **`interfaces/web/components/`**
**What belongs here:**
- All React components
- UI components, feature components

**Files to move:**
```
interfaces/web/components/
├── ui/                              # ✅ MOVE from components/ui/
├── appointment/                     # ✅ MOVE from components/appointment/
├── charts/                          # ✅ MOVE from components/charts/
├── dialogs/                         # ✅ MOVE from components/dialogs/
├── forms/                           # ✅ MOVE from components/forms/
└── ...                              # ✅ MOVE all other components/
```

---

### 3.5 Shared Layer (`shared/`)

**Purpose:** Code used by multiple layers (constants, pure utilities, shared types).

#### **`shared/constants/`**
**What belongs here:**
- Constants used across layers
- Enum-like constants

**Files to create (extract from `lib/index.ts`, `utils/seetings.ts`):**
```
shared/constants/
├── Gender.ts                        # From lib/index.ts::GENDER
├── MaritalStatus.ts                 # From lib/index.ts::MARITAL_STATUS
├── Relation.ts                      # From lib/index.ts::RELATION
├── UserRoles.ts                     # From lib/index.ts::USER_ROLES
├── Specialization.ts                # From utils/seetings.ts::SPECIALIZATION
└── DataLimit.ts                     # From utils/seetings.ts::DATA_LIMIT
```

#### **`shared/types/`**
**What belongs here:**
- Shared TypeScript types
- Not domain entities, but shared types

**Files to move/create:**
```
shared/types/
├── CommonTypes.ts                   # From types/data-types.ts (extract common types)
└── SearchParams.ts                  # From types/index.ts
```

#### **`shared/utils/`**
**What belongs here:**
- Pure utility functions (no dependencies)
- Used by multiple layers

**Files to extract (from `lib/utils.ts`, `utils/index.ts`):**
```
shared/utils/
├── formatNumber.ts                  # From utils/index.ts
├── getInitials.ts                   # From utils/index.ts
├── formatDateTime.ts                # From utils/index.ts
├── calculateAge.ts                  # From utils/index.ts
├── calculateBMI.ts                  # From utils/index.ts
├── calculateDiscount.ts             # From utils/index.ts
├── generateRandomColor.ts           # From utils/index.ts
├── daysOfWeek.ts                    # From utils/index.ts
└── generateTimes.ts                 # From utils/index.ts
```

---

## 4. MIGRATION STRATEGY

### 4.1 Phase 1: Create Domain Layer (Week 1-2)

**Goal:** Extract domain entities, value objects, enums, and interfaces.

**Tasks:**
1. Create `domain/` folder structure
2. Extract enums from Prisma schema → `domain/enums/`
3. Create value objects (`Email`, `PhoneNumber`, etc.)
4. Create repository interfaces → `domain/interfaces/repositories/`
5. Create service interfaces → `domain/interfaces/services/`
6. Create domain exceptions → `domain/exceptions/`

**No behavior changes** - These are new files, existing code continues to work.

---

### 4.2 Phase 2: Create Infrastructure Repositories (Week 2-3)

**Goal:** Implement repositories using Prisma.

**Tasks:**
1. Create `infrastructure/database/repositories/`
2. Move `lib/db.ts` → `infrastructure/database/PrismaClient.ts`
3. Implement Prisma repositories for each entity
4. Create mappers (Prisma ↔ Domain) in `application/mappers/`

**Behavior:** Keep existing services working, but start using repositories internally.

---

### 4.3 Phase 3: Extract Use Cases (Week 3-4)

**Goal:** Move business logic from actions to use cases.

**Tasks:**
1. Create `application/use-cases/` structure
2. For each action in `app/actions/`:
   - Extract business logic to use case
   - Keep action as thin wrapper
3. Create DTOs → `application/dto/`
4. Create validators → `application/validators/`

**Behavior:** Actions become thin wrappers, business logic in use cases.

---

### 4.4 Phase 4: Extract Application Services (Week 4-5)

**Goal:** Create orchestration services for complex workflows.

**Tasks:**
1. Identify complex workflows (appointment booking, clinical documentation)
2. Extract to `application/services/`
3. Refactor use cases to use services where appropriate

---

### 5.5 Phase 5: Move Files to New Structure (Week 5)

**Goal:** Reorganize folder structure.

**Tasks:**
1. Move `app/` → `interfaces/web/app/`
2. Move `components/` → `interfaces/web/components/`
3. Move `prisma/` → `infrastructure/database/prisma/`
4. Move shared code → `shared/`
5. Update imports across codebase

**Critical:** Update all import paths, test thoroughly.

---

### 4.6 Phase 6: Extract Auth Service (Week 6)

**Goal:** Abstract authentication.

**Tasks:**
1. Create `IAuthService` interface
2. Implement `ClerkAuthService`
3. Refactor actions to use `IAuthService` instead of direct Clerk calls

---

### 4.7 Phase 7: Testing & Validation (Week 7-8)

**Goal:** Ensure nothing broke, add tests.

**Tasks:**
1. Run full test suite
2. Manual testing of all workflows
3. Add unit tests for use cases
4. Add unit tests for repositories
5. Fix any issues

---

## 5. DEPENDENCY INJECTION STRATEGY

### 5.1 Current Problem

- No DI container
- Direct instantiation everywhere
- Hard to test (can't mock dependencies)

### 5.2 Proposed Solution

**Phase 1: Manual DI (Initial)**
- Pass dependencies via constructor
- Create factories for common cases

**Example:**
```typescript
// application/use-cases/patient/CreatePatientUseCase.ts
export class CreatePatientUseCase {
  constructor(
    private patientRepo: IPatientRepository,
    private authService: IAuthService,
  ) {}
}

// interfaces/http/actions/patient.actions.ts
import { PrismaPatientRepository } from '../../../infrastructure/database/repositories/PrismaPatientRepository';
import { ClerkAuthService } from '../../../infrastructure/auth/ClerkAuthService';

export async function createPatientAction(dto: CreatePatientDto) {
  const prisma = new PrismaClient();
  const patientRepo = new PrismaPatientRepository(prisma);
  const authService = new ClerkAuthService();
  
  const useCase = new CreatePatientUseCase(patientRepo, authService);
  return await useCase.execute(dto);
}
```

**Phase 2: DI Container (Future)**
- Consider using a lightweight DI container (tsyringe, inversify)
- Create module/container configuration
- Auto-wire dependencies

---

## 6. TESTING STRATEGY

### 6.1 Unit Tests

**Domain Layer:**
- Test entities (business rules)
- Test value objects (validation)
- Test exceptions

**Application Layer:**
- Test use cases (mock repositories)
- Test application services
- Test mappers

**Infrastructure Layer:**
- Test repository implementations (integration tests with test DB)
- Test auth service
- Test validators

### 6.2 Integration Tests

- Test use cases with real repositories (test database)
- Test workflows end-to-end

### 6.3 E2E Tests

- Test full user flows (appointment booking, clinical documentation)
- Use test database

---

## 7. RISKS & MITIGATION

### 7.1 Risk: Breaking Changes During Migration

**Mitigation:**
- Migrate incrementally (phase by phase)
- Keep old code working until new code is tested
- Use feature flags if needed

### 7.2 Risk: Import Path Chaos

**Mitigation:**
- Use TypeScript path aliases in `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "paths": {
        "@domain/*": ["./domain/*"],
        "@application/*": ["./application/*"],
        "@infrastructure/*": ["./infrastructure/*"],
        "@interfaces/*": ["./interfaces/*"],
        "@shared/*": ["./shared/*"]
      }
    }
  }
  ```
- Update imports gradually
- Use find/replace carefully

### 7.3 Risk: Performance Regression

**Mitigation:**
- Monitor performance during migration
- Repository pattern should not add significant overhead
- Test with realistic data volumes

### 7.4 Risk: Team Resistance

**Mitigation:**
- Document benefits clearly
- Show improved testability
- Provide migration guide
- Pair programming during migration

---

## 8. SUCCESS CRITERIA

### 8.1 Structural

- ✅ All domain logic in `domain/` (no framework dependencies)
- ✅ All use cases in `application/use-cases/`
- ✅ All infrastructure concerns in `infrastructure/`
- ✅ All interfaces in `interfaces/`
- ✅ Dependencies point inward (domain has no dependencies)

### 8.2 Testability

- ✅ All use cases unit testable (mock repositories)
- ✅ All domain entities unit testable (no dependencies)
- ✅ Integration tests for repositories

### 8.3 Maintainability

- ✅ Clear separation of concerns
- ✅ Easy to find code (consistent structure)
- ✅ Easy to add new features (follow patterns)

### 8.4 Functionality

- ✅ **No behavior changes** - All existing features work identically
- ✅ All tests pass
- ✅ Manual testing confirms functionality

---

## 9. NEXT STEPS (After Refactor)

Once Clean Architecture is in place:

1. **Add Domain Events** - For decoupled communication
2. **Implement CQRS** - Separate read/write models (if needed)
3. **Add Domain Services** - Complex business rules that don't fit in entities
4. **Implement Audit Service** - Automatic audit logging
5. **Add Event Sourcing** - For critical workflows (optional)
6. **Improve Error Handling** - Standardized error responses
7. **Add Transaction Management** - Explicit transaction boundaries

---

## 10. CONCLUSION

This refactoring plan provides a clear path to Clean Architecture:

1. **Clear separation** - Domain, Application, Infrastructure, Interfaces
2. **Testability** - All layers independently testable
3. **Maintainability** - Easy to find and modify code
4. **Scalability** - Easy to add features without breaking existing code
5. **No behavior changes** - Refactor only, no feature changes

**Estimated Timeline:** 8 weeks (with 1-2 engineers)

**Benefits:**
- ✅ Testable business logic
- ✅ Framework-independent domain
- ✅ Easy to swap infrastructure (database, auth)
- ✅ Clear architecture for team
- ✅ Foundation for future features

---

**End of Refactoring Plan**
