# Surgeon Workflow Implementation Guide

**Last Updated:** January 2025

## Overview

This document outlines the implementation of surgeon-critical features based on real-world aesthetic surgery workflows. The system is designed to support how surgeons actually work, not fight against it.

## Tier 1 - Core Surgeon-Critical Features

### ✅ Database Schema Extended

New database models added to `prisma/schema.prisma`:

1. **DoctorConsultation** - Doctor-to-doctor consultations
   - Case-based threads
   - Urgency tagging (routine/urgent/intra-op)
   - Attachment support for images/scans
   - Message threads

2. **CasePlan** - Surgical case planning workspace
   - Procedure plan
   - Risk factors checklist
   - Pre-op notes
   - Implant details
   - Marking diagrams
   - Consent checklist
   - Planned anesthesia
   - Special instructions
   - Readiness status

3. **PatientImage** - Before & After image management
   - Standardized photo angles (front, oblique, profile, etc.)
   - Timepoint tagging (pre-op, 1 week, 1 month, 3 months, etc.)
   - Consent for marketing use
   - Links to appointments and case plans

4. **ClinicalNoteTemplate** - Template system for aesthetic notes
   - Consultation templates
   - Procedure notes
   - Post-op notes
   - Complication documentation

5. **ClinicalTask** - Task & delegation system
   - Assign tasks to clinical team
   - Priority levels
   - Due dates
   - Completion tracking

6. **SurgicalOutcome** - Outcome tracking
   - Procedure type
   - Complication rate
   - Revision rate
   - Patient satisfaction
   - Healing timeline

### ✅ Domain Enums Created

New enums in `domain/enums/`:
- `ConsultUrgency` - Routine, Urgent, Intra-op
- `ConsultStatus` - Open, In Progress, Resolved, Closed
- `ImageTimepoint` - Pre-op, 1 week post-op, etc.
- `ImageAngle` - Front, Oblique, Profile, etc.
- `CaseReadinessStatus` - Not Started, Pending Labs, Ready, etc.
- `TaskPriority` - Low, Medium, High, Urgent
- `TaskStatus` - Pending, In Progress, Completed
- `OutcomeStatus` - Excellent, Good, Needs Revision, Complication

## Next Steps

### 1. Run Database Migration

```bash
npx prisma migrate dev --name add_surgeon_features
npx prisma generate
```

### 2. Create API Endpoints

Need to create:
- `/api/doctor/consultations` - Doctor-to-doctor consultations
- `/api/doctor/case-plans` - Case planning
- `/api/doctor/theatre-schedule` - Theatre schedule with readiness
- `/api/doctor/post-op-monitoring` - Post-op outcomes
- `/api/doctor/tasks` - Task management
- `/api/patient/images` - Image management

### 3. Build UI Components

Priority order:
1. **Theatre Schedule View** - Surgeon-centric schedule with readiness status
2. **Post-Op Monitoring Dashboard** - Track outcomes and complications
3. **Case Planning Workspace** - Pre-op planning interface
4. **Before/After Image Gallery** - Image management interface
5. **Doctor Consultation Interface** - Secure chat/consultation system
6. **Task Delegation UI** - Assign and track tasks

### 4. Implementation Status

- [x] Database schema design
- [x] Domain enums
- [ ] API endpoints
- [ ] UI components
- [ ] Integration with existing workflows

## Key Features

### Theatre Schedule View
Shows surgeon's cases with:
- Patient summary per case
- Procedure name
- Duration
- Team assigned
- **Readiness status**: Cleared, Pending Labs, Awaiting Consent, Needs Review
- Quick answer: "Am I ready to operate on this patient?"

### Post-Op Monitoring Dashboard
Tracks:
- Recent surgeries
- Patients with pain issues
- Complications
- Missed follow-ups
- Red flags
- Quick access to patient thread

### Case Planning Workspace
Pre-surgery cockpit with:
- Procedure plan
- Risk factors
- Pre-op notes
- Implant details
- Marking diagrams
- Consent checklist
- Planned anesthesia
- Special instructions

### Before & After Image Management
- Standardized angles
- Timepoint tagging
- Side-by-side comparison
- Zoom capability
- Consent tracking
- Export for presentations

## Files Modified

- `prisma/schema.prisma` - Added 6 new models
- `domain/enums/` - Added 8 new enum files
- `domain/index.ts` - Exported new enums

## Files to Create

### API Routes
- `app/api/doctor/consultations/route.ts`
- `app/api/doctor/case-plans/route.ts`
- `app/api/doctor/theatre-schedule/route.ts`
- `app/api/doctor/post-op/route.ts`
- `app/api/doctor/tasks/route.ts`
- `app/api/patient/images/route.ts`

### Components
- `components/doctor/TheatreScheduleView.tsx`
- `components/doctor/PostOpDashboard.tsx`
- `components/doctor/CasePlanningWorkspace.tsx`
- `components/doctor/BeforeAfterGallery.tsx`
- `components/doctor/DoctorConsultation.tsx`
- `components/doctor/TaskManager.tsx`

### DTOs
- `application/dtos/DoctorConsultationDto.ts`
- `application/dtos/CasePlanDto.ts`
- `application/dtos/TheatreScheduleDto.ts`
- `application/dtos/PostOpOutcomeDto.ts`
- `application/dtos/TaskDto.ts`
- `application/dtos/PatientImageDto.ts`
