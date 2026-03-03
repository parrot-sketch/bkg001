# Architecture to Code Mapping Reference

**Purpose:** Quick reference for finding code that implements each architectural component

---

## Domain Layer Mapping

### Entities
```
Patient Entity              → domain/entities/Patient.ts
Doctor Entity               → domain/entities/Doctor.ts
Appointment Entity          → domain/entities/Appointment.ts
Consultation Entity         → domain/entities/Consultation.ts
MedicalRecord Entity        → domain/entities/MedicalRecord.ts
CasePlan Entity             → domain/entities/CasePlan.ts
ConsentForm Entity          → domain/entities/ConsentForm.ts
User Entity                 → domain/entities/User.ts
IntakeSubmission Entity     → domain/entities/IntakeSubmission.ts
```

### Value Objects
```
Email Value Object          → domain/value-objects/Email.ts
PhoneNumber Value Object    → domain/value-objects/PhoneNumber.ts
Money Value Object          → domain/value-objects/Money.ts
Address Value Object        → domain/value-objects/Address.ts
Gender Value Object         → domain/value-objects/Gender.ts
```

### Enums
```
AppointmentStatus Enum      → domain/enums/AppointmentStatus.ts
ConsultationRequestStatus   → domain/enums/ConsultationRequestStatus.ts
UserRole Enum               → domain/enums/Role.ts
ConsentStatus Enum          → domain/enums/ConsentStatus.ts
ConsentType Enum            → domain/enums/ConsentType.ts
SigningStatus Enum          → domain/enums/SigningStatus.ts
```

### Repository Interfaces
```
IPatientRepository          → domain/interfaces/repositories/IPatientRepository.ts
IDoctorRepository           → domain/interfaces/repositories/IDoctorRepository.ts
IAppointmentRepository      → domain/interfaces/repositories/IAppointmentRepository.ts
IConsultationRepository     → domain/interfaces/repositories/IConsultationRepository.ts
IMedicalRecordRepository    → domain/interfaces/repositories/IMedicalRecordRepository.ts
ICasePlanRepository         → domain/interfaces/repositories/ICasePlanRepository.ts
IConsentFormRepository      → domain/interfaces/repositories/IConsentFormRepository.ts
```

### Domain Services
```
AvailabilityService         → domain/services/AvailabilityService.ts
ConsultationSessionService  → domain/services/ConsultationSessionService.ts
ConsentSigningService       → application/services/ConsentSigningService.ts
```

### Domain Exceptions
```
DomainException             → domain/exceptions/DomainException.ts
ValidationException         → domain/exceptions/ValidationException.ts
NotFoundError               → domain/exceptions/NotFoundError.ts
DuplicatePatientException   → domain/exceptions/DuplicatePatientException.ts
AppointmentConflictException→ domain/exceptions/AppointmentConflictException.ts
```

---

## Application Layer Mapping

### Patient Module Use Cases
```
CreatePatientUseCase        → application/use-cases/CreatePatientUseCase.ts
UpdatePatientUseCase        → application/use-cases/UpdatePatientUseCase.ts
GetPatientByIdUseCase       → application/use-cases/GetPatientByIdUseCase.ts
SubmitPatientIntakeUseCase  → application/use-cases/SubmitPatientIntakeUseCase.ts
ConfirmPatientIntakeUseCase → application/use-cases/ConfirmPatientIntakeUseCase.ts
ReviewPatientIntakeUseCase  → application/use-cases/ReviewPatientIntakeUseCase.ts
```

### Appointment Module Use Cases
```
BookAppointmentUseCase      → application/use-cases/BookAppointmentUseCase.ts
RescheduleAppointmentUseCase→ application/use-cases/RescheduleAppointmentUseCase.ts
CancelAppointmentUseCase    → application/use-cases/CancelAppointmentUseCase.ts
GetDoctorAvailabilityUseCase→ application/use-cases/GetDoctorAvailabilityUseCase.ts
CheckInPatientUseCase       → application/use-cases/CheckInPatientUseCase.ts
```

### Consultation Module Use Cases
```
SubmitConsultationRequestUseCase     → application/use-cases/SubmitConsultationRequestUseCase.ts
ReviewConsultationRequestUseCase     → application/use-cases/ReviewConsultationRequestUseCase.ts
ApproveConsultationRequestUseCase    → application/use-cases/ApproveConsultationRequestUseCase.ts
DeclineConsultationRequestUseCase    → application/use-cases/DeclineConsultationRequestUseCase.ts
StartConsultationUseCase             → application/use-cases/StartConsultationUseCase.ts
UpdateConsultationDraftUseCase       → application/use-cases/UpdateConsultationDraftUseCase.ts
CompleteConsultationUseCase          → application/use-cases/CompleteConsultationUseCase.ts
```

### Clinical Module Use Cases
```
RecordVitalsUseCase         → application/use-cases/RecordVitalsUseCase.ts
DocumentDiagnosisUseCase    → application/use-cases/DocumentDiagnosisUseCase.ts
GeneratePrescriptionUseCase → application/use-cases/GeneratePrescriptionUseCase.ts
UpdateMedicalHistoryUseCase → application/use-cases/UpdateMedicalHistoryUseCase.ts
```

### Consent Module Use Cases
```
GenerateConsentUseCase      → application/use-cases/GenerateConsentUseCase.ts
CreateSigningSessionUseCase → application/use-cases/CreateSigningSessionUseCase.ts
SignConsentUseCase          → application/use-cases/SignConsentUseCase.ts
VerifyIdentityUseCase       → application/use-cases/VerifyIdentityUseCase.ts
ValidateOTPUseCase          → application/use-cases/ValidateOTPUseCase.ts
StaffVerifyIdentityUseCase  → application/use-cases/StaffVerifyIdentityUseCase.ts
```

### DTOs (Data Transfer Objects)
```
PatientResponseDto          → application/dtos/PatientResponseDto.ts
AppointmentResponseDto      → application/dtos/AppointmentResponseDto.ts
ConsultationResponseDto     → application/dtos/ConsultationResponseDto.ts
ConsultationRequestDto      → application/dtos/ConsultationRequestDto.ts
ConsentFormResponseDto      → application/dtos/ConsentFormResponseDto.ts
MedicalRecordResponseDto    → application/dtos/MedicalRecordResponseDto.ts
```

### Mappers
```
PatientMapper (Application) → application/mappers/PatientMapper.ts
AppointmentMapper           → application/mappers/AppointmentMapper.ts
ConsultationMapper          → application/mappers/ConsultationMapper.ts
ConsentMapper               → application/mappers/ConsentMapper.ts
```

---

## Infrastructure Layer Mapping

### Repository Implementations
```
PrismaPatientRepository     → infrastructure/repositories/PatientRepository.ts
PrismaDoctorRepository      → infrastructure/repositories/DoctorRepository.ts
PrismaAppointmentRepository → infrastructure/repositories/AppointmentRepository.ts
PrismaConsultationRepository→ infrastructure/repositories/ConsultationRepository.ts
PrismaMedicalRecordRepository→ infrastructure/repositories/MedicalRecordRepository.ts
PrismaCasePlanRepository    → infrastructure/repositories/CasePlanRepository.ts
PrismaConsentRepository     → infrastructure/repositories/ConsentRepository.ts
```

### Infrastructure Mappers
```
PatientMapper (Infrastructure) → infrastructure/mappers/PatientMapper.ts
AppointmentMapper              → infrastructure/mappers/AppointmentMapper.ts
ConsultationMapper             → infrastructure/mappers/ConsultationMapper.ts
ConsentMapper                  → infrastructure/mappers/ConsentMapper.ts
```

### Database Layer
```
Prisma Client              → lib/db.ts
Prisma Schema             → prisma/schema.prisma
Database Migrations       → prisma/migrations/
```

### Service Implementations
```
JWT Auth Service           → infrastructure/auth/JwtAuthService.ts
Auth Factory               → infrastructure/auth/AuthFactory.ts
Prisma Audit Service      → infrastructure/services/AuditService.ts
Twilio SMS Service        → infrastructure/services/TwilioSmsService.ts
OTP Service               → lib/services/consent/OtpService.ts
QR Code Service           → lib/services/consent/QrCodeService.ts
ConsentPdf Service        → lib/services/consent/ConsentPdfService.ts
```

---

## Interface Layer Mapping

### Public Pages (No Auth)
```
Login Page                 → app/(auth)/login/page.tsx
Patient Intake Form        → app/(public)/patient-intake/page.tsx
Consent Signing            → app/(public)/consent/sign/[qrCode]/page.tsx
```

### Patient Portal
```
Patient Dashboard          → app/patient/dashboard/page.tsx
My Appointments            → app/patient/appointments/page.tsx
Book Appointment           → app/patient/appointments/book/page.tsx
My Consultations           → app/patient/consultations/page.tsx
Medical Records            → app/patient/records/page.tsx
Profile Settings           → app/patient/profile/page.tsx
```

### Doctor Portal
```
Doctor Dashboard           → app/doctor/dashboard/page.tsx
My Patients                → app/doctor/patients/page.tsx
Consultations              → app/doctor/consultations/page.tsx
Case Plans                 → app/doctor/case-plans/page.tsx
Consent Management         → app/doctor/consents/page.tsx
My Schedule                → app/doctor/schedule/page.tsx
```

### Front Desk Portal
```
Frontdesk Dashboard        → app/frontdesk/dashboard/page.tsx
Pending Intakes            → app/frontdesk/intakes/page.tsx
Appointments               → app/frontdesk/appointments/page.tsx
Patient Check-in           → app/frontdesk/check-in/page.tsx
Consultations              → app/frontdesk/consultations/page.tsx
```

### Admin Portal
```
Admin Dashboard            → app/admin/dashboard/page.tsx
User Management            → app/admin/users/page.tsx
Audit Logs                 → app/admin/audit-logs/page.tsx
Reports                    → app/admin/reports/page.tsx
System Settings            → app/admin/settings/page.tsx
```

### API Endpoints
```
POST /api/patient/intake   → app/api/patient/intake/route.ts
POST /api/patient/confirm  → app/api/patient/intake/confirm/route.ts
GET  /api/appointments     → app/api/appointments/route.ts
POST /api/appointments/book→ app/api/appointments/book/route.ts
POST /api/consultations    → app/api/consultations/route.ts
GET  /api/consents/{id}    → app/api/doctor/consents/[consentId]/route.ts
POST /api/consent/sign     → app/api/public/consent/sign/[qrCode]/route.ts
```

### Reusable Components
```
UI Components              → components/ui/*
Forms                      → components/forms/*
Dialogs                    → components/dialogs/*
Patient Cards              → components/patient/*
Appointment Components     → components/appointment/*
Consultation Components    → components/consultation/*
```

---

## Cross-Layer Utilities

### Authentication & Authorization
```
Auth Hook                  → hooks/useAuth.ts
JWT Middleware             → lib/auth/middleware.ts
Role-based Guards          → lib/auth/guards.ts
JWT Auth Utilities         → lib/auth/jwt-helper.ts, token.ts, server-auth.ts
```

### Validation
```
Zod Schemas                → lib/schema.ts
Custom Validators          → lib/validation/*
Form Validation            → app/api/_utils/handleApiError.ts
```

### Error Handling
```
API Error Handler          → app/api/_utils/handleApiError.ts
Custom Exceptions          → domain/exceptions/*
Error Middleware           → lib/middleware/errorHandler.ts
```

### Constants & Types
```
Global Constants           → lib/constants/*.ts
Type Definitions           → lib/types/*.ts
Enum Values                → domain/enums/*.ts
```

---

## Key File Locations Summary

| Layer | Directory | Key Files |
|-------|-----------|-----------|
| **Domain** | `/domain` | Entities, Value Objects, Interfaces, Enums |
| **Application** | `/application` | Use Cases, DTOs, Mappers, Services |
| **Infrastructure** | `/infrastructure` | Repositories, Service Implementations |
| **Interface** | `/app` | Pages, API Routes, Components |
| **Database** | `/prisma` | Schema, Migrations |
| **Utilities** | `/lib` | Auth, Validation, Constants, Types |
| **Tests** | `/tests` | Unit, Integration Tests |
| **Docs** | `/docs` | Architecture, Decisions, Setup |

---

## Quick Navigation Guide

### Find a Use Case
**Example:** "I need to understand how appointment booking works"
1. Go to: `application/use-cases/BookAppointmentUseCase.ts`
2. Read logic and dependencies
3. Check repositories: `infrastructure/repositories/AppointmentRepository.ts`
4. Check API route: `app/api/appointments/book/route.ts`
5. Check UI: `app/patient/appointments/book/page.tsx`

### Find an Entity
**Example:** "I need to understand Patient entity rules"
1. Go to: `domain/entities/Patient.ts`
2. Read business rules and methods
3. Check how it's created: `Patient.create()`
4. Check validation rules in constructor

### Find a Repository
**Example:** "How do we fetch patients?"
1. Interface: `domain/interfaces/repositories/IPatientRepository.ts`
2. Implementation: `infrastructure/repositories/PatientRepository.ts`
3. Mapper: `infrastructure/mappers/PatientMapper.ts`

### Find an API Route
**Example:** "What happens when patient submits intake?"
1. Route: `app/api/patient/intake/route.ts`
2. Use case: `application/use-cases/SubmitPatientIntakeUseCase.ts`
3. Entity: `domain/entities/IntakeSubmission.ts`
4. Repository: `infrastructure/repositories/IntakeSubmissionRepository.ts`

---

**Last Updated:** March 2, 2026  
**Architecture Version:** 1.0  
**Status:** Production Ready
