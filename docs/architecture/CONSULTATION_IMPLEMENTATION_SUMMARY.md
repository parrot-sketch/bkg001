# Consultation Domain Architecture - Implementation Summary

**Last Updated:** January 2025  
**Status:** Implementation Guide

## Overview

This document provides a summary of the consultation domain architecture implementation and next steps for completing the system.

---

## What Has Been Implemented

### ✅ Core Domain Components

1. **Enums**
   - `ConsultationState` - Consultation lifecycle states (NOT_STARTED, IN_PROGRESS, COMPLETED)
   - `NoShowReason` - No-show reason types (AUTO, MANUAL, PATIENT_CALLED)
   - Enhanced `AppointmentStatus` - Added NO_SHOW and CONFIRMED states

2. **Value Objects** (Immutable, Validated)
   - `CheckInInfo` - Patient check-in information with late arrival tracking
   - `NoShowInfo` - No-show information with reason and notes
   - `ConsultationDuration` - Calculated consultation duration
   - `ConsultationNotes` - Structured or raw consultation notes

3. **Entities**
   - `Consultation` - Rich domain entity with state machine and business logic
   - Enhanced `Appointment` - (Design complete, needs implementation)

---

## What Needs to Be Implemented

### Phase 1: Complete Core Domain (High Priority)

#### 1. Enhanced Appointment Entity
**File:** `domain/entities/Appointment.ts`

**Required Changes:**
- Add `CheckInInfo` and `NoShowInfo` fields
- Implement `checkIn()`, `markAsNoShow()`, `complete()` methods
- Add getters for check-in and no-show state

**Status:** Design complete, implementation needed

#### 2. AppointmentAggregate
**File:** `domain/aggregates/AppointmentAggregate.ts`

**Purpose:** Root aggregate enforcing consistency between Appointment and Consultation

**Key Methods:**
- `checkIn(checkInInfo)` - Checks in patient
- `markAsNoShow(noShowInfo)` - Marks as no-show
- `startConsultation(userId)` - Starts consultation
- `updateConsultationNotes(notes)` - Updates draft
- `completeConsultation(params)` - Completes consultation

**Status:** Design complete, implementation needed

#### 3. State Machines
**Files:**
- `domain/services/AppointmentStateMachine.ts`
- `domain/services/ConsultationStateMachine.ts`

**Purpose:** Explicit state transition validation

**Status:** Design complete, implementation needed

---

### Phase 2: Domain Services (Medium Priority)

#### 1. NoShowDetectionService
**File:** `domain/services/NoShowDetectionService.ts`

**Purpose:** Detects potential no-shows based on business rules

**Key Methods:**
- `shouldFlagAsNoShow(appointment)` - Checks if should flag
- `createAutoNoShowInfo()` - Creates auto-detected no-show info

**Status:** Design complete, implementation needed

#### 2. ConsultationDraftService
**File:** `domain/services/ConsultationDraftService.ts`

**Purpose:** Manages consultation draft autosave logic

**Key Methods:**
- `shouldAutoSave(consultation, lastSavedAt)` - Determines if should save
- `validateDraft(notes)` - Validates draft before saving

**Status:** Design complete, implementation needed

#### 3. ConsultationSessionService
**File:** `domain/services/ConsultationSessionService.ts`

**Purpose:** Orchestrates consultation session workflow

**Key Methods:**
- `canStartConsultation(aggregate)` - Validates can start
- `canCompleteConsultation(aggregate, outcome, decision)` - Validates can complete
- `shouldCreateCasePlan(outcome, decision)` - Determines if case plan needed
- `shouldScheduleFollowUp(outcome)` - Determines if follow-up needed

**Status:** Design complete, implementation needed

---

### Phase 3: Domain Events (Medium Priority)

#### Consultation Events
**File:** `domain/events/ConsultationEvents.ts`

**Events to Implement:**
- `AppointmentCheckedInEvent`
- `ConsultationStartedEvent`
- `ConsultationDraftSavedEvent`
- `ConsultationCompletedEvent`
- `NoShowDetectedEvent`
- `LateArrivalDetectedEvent`

**Status:** Design complete, implementation needed

---

### Phase 4: Repository Interfaces (High Priority)

#### 1. IConsultationRepository
**File:** `domain/interfaces/repositories/IConsultationRepository.ts`

**Methods:**
- `findById(id)`
- `findByAppointmentId(appointmentId)`
- `findByDoctorId(doctorId, filters?)`
- `save(consultation)`
- `delete(id)`

**Status:** Design complete, implementation needed

#### 2. Enhanced IAppointmentRepository
**File:** `domain/interfaces/repositories/IAppointmentRepository.ts`

**New Methods:**
- `findPotentialNoShows(now, windowMinutes)` - Finds appointments that should be flagged

**Status:** Design complete, implementation needed

---

### Phase 5: Infrastructure Layer (High Priority)

#### 1. Prisma Schema Updates
**File:** `prisma/schema.prisma`

**Required Changes:**

**Consultation Model:**
- Add `state` field (ConsultationState enum)
- Add `duration_seconds` field
- Add structured note fields (`chief_complaint`, `examination`, `assessment`, `plan`)
- Add `last_draft_saved_at` and `draft_version` fields

**Appointment Model:**
- Add check-in fields (`checked_in_at`, `checked_in_by`, `late_arrival`, `late_by_minutes`)
- Add no-show fields (`no_show`, `no_show_at`, `no_show_reason`, `no_show_notes`)
- Add `rescheduled_to_appointment_id` field
- Update `status` enum to include NO_SHOW and CONFIRMED

**Status:** Design complete, migration needed

#### 2. Repository Implementations
**Files:**
- `infrastructure/repositories/ConsultationRepository.ts`
- `infrastructure/repositories/AppointmentRepository.ts` (enhancement)

**Status:** Implementation needed

#### 3. Mappers
**Files:**
- `infrastructure/mappers/ConsultationMapper.ts`
- `infrastructure/mappers/AppointmentMapper.ts` (enhancement)

**Purpose:** Map between domain entities and Prisma models

**Status:** Implementation needed

---

### Phase 6: Application Layer (High Priority)

#### 1. Use Cases
**Files to Create/Enhance:**

- `application/use-cases/StartConsultationUseCase.ts` (enhance existing)
- `application/use-cases/UpdateConsultationDraftUseCase.ts` (new)
- `application/use-cases/CompleteConsultationUseCase.ts` (enhance existing)
- `application/use-cases/CheckInPatientUseCase.ts` (enhance existing)
- `application/use-cases/MarkNoShowUseCase.ts` (new)
- `application/use-cases/DetectNoShowsUseCase.ts` (new)

**Status:** Some exist, need enhancement/new implementations

#### 2. DTOs
**Files to Create:**

- `application/dtos/CheckInPatientDto.ts` (enhance existing)
- `application/dtos/MarkNoShowDto.ts` (new)
- `application/dtos/UpdateConsultationDraftDto.ts` (new)
- `application/dtos/CompleteConsultationDto.ts` (enhance existing)

**Status:** Some exist, need enhancement/new DTOs

---

## Implementation Order

### Week 1: Core Domain Completion
1. ✅ Enhanced Appointment entity
2. ✅ AppointmentAggregate
3. ✅ State machines
4. ✅ Domain events

### Week 2: Domain Services
5. ✅ NoShowDetectionService
6. ✅ ConsultationDraftService
7. ✅ ConsultationSessionService

### Week 3: Infrastructure
8. ✅ Prisma schema updates and migration
9. ✅ Repository implementations
10. ✅ Mappers

### Week 4: Application Layer
11. ✅ Use case implementations
12. ✅ DTOs
13. ✅ Integration tests

---

## Key Design Decisions

### 1. Aggregate Boundaries
- **AppointmentAggregate** is the root aggregate
- Consultation is part of the aggregate but managed through the root
- All state changes go through the aggregate root

### 2. State Machines
- Explicit state machines prevent invalid transitions
- All transitions are validated before execution
- Terminal states cannot transition further

### 3. Value Objects
- All value objects are immutable
- Validation happens in constructors
- Equality based on value, not reference

### 4. Domain Events
- Events represent important state changes
- Events are emitted by aggregates
- Events trigger side effects (notifications, audit, etc.)

### 5. Draft Autosave
- Drafts are managed at the domain level
- Autosave logic is in ConsultationDraftService
- Drafts are separate from completed notes

---

## Testing Strategy

### Unit Tests
- Entity state transitions
- Value object validation
- State machine transitions
- Domain service logic
- Aggregate invariants

### Integration Tests
- Repository persistence
- Aggregate consistency
- Event publishing
- Use case execution

### Domain Tests
- Business rule validation
- Invariant enforcement
- State transition validation

---

## Migration Strategy

### Database Migration
1. Add new fields to Consultation model
2. Add new fields to Appointment model
3. Update enum types
4. Create migration script
5. Test migration on staging

### Code Migration
1. Implement new domain entities
2. Update existing use cases
3. Add new use cases
4. Update API endpoints
5. Update UI components

---

## Next Steps

1. **Review Architecture Document**
   - Read `CONSULTATION_DOMAIN_ARCHITECTURE.md` for full design
   - Understand invariants and constraints
   - Review state machines

2. **Implement Core Domain**
   - Start with Appointment entity enhancement
   - Implement AppointmentAggregate
   - Add state machines

3. **Update Prisma Schema**
   - Add new fields
   - Create migration
   - Test migration

4. **Implement Infrastructure**
   - Repository implementations
   - Mappers
   - Event publisher

5. **Implement Application Layer**
   - Use cases
   - DTOs
   - API endpoints

6. **Testing**
   - Unit tests
   - Integration tests
   - End-to-end tests

---

## Questions to Resolve

1. **Draft Storage:**
   - Should drafts be stored separately or as part of Consultation?
   - How long should drafts be retained?
   - Should drafts be versioned?

2. **No-Show Detection:**
   - What is the detection window? (Currently 30 minutes, should be configurable?)
   - Should detection be automatic or manual only?
   - What happens if patient arrives after being marked no-show?

3. **Case Plan Creation:**
   - Should case plan be created automatically or manually?
   - What is the relationship between Consultation and CasePlan?
   - Should case plan creation be part of consultation completion?

4. **Follow-Up Scheduling:**
   - Should follow-up be scheduled automatically or manually?
   - What is the default follow-up type?
   - Should follow-up be linked to the original consultation?

---

## Summary

The consultation domain architecture is designed with:

- ✅ **Explicit State Modeling** - All states and transitions are explicit
- ✅ **Clear Aggregates** - AppointmentAggregate enforces consistency
- ✅ **Immutable Value Objects** - All value objects are validated and immutable
- ✅ **Domain Events** - Important changes emit events
- ✅ **Service Boundaries** - Domain services encapsulate complex logic
- ✅ **Invariant Enforcement** - Business rules enforced at aggregate root

**Current Status:** Core domain components (enums, value objects, Consultation entity) are implemented. Next steps are to complete the Appointment entity, implement aggregates, state machines, and domain services.
