# Database Schema Summary

## Overview

The Nairobi Sculpt Surgical Aesthetic Clinic database is a comprehensive PostgreSQL database designed to support all roles (Admin, Doctor, Nurse, Frontdesk, Patient) and their workflows.

## Database Statistics

- **Total Models**: 20
- **Total Enums**: 9
- **Total Relations**: 35+
- **Total Indexes**: 50+

## Core Models

### Authentication & Authorization

1. **User** - Central authentication model
   - Supports all roles (ADMIN, DOCTOR, NURSE, FRONTDESK, PATIENT)
   - MFA support
   - Status management (ACTIVE, INACTIVE, DORMANT)

2. **RefreshToken** - JWT refresh token management
   - One-to-many with User
   - Token revocation support

### Patient Management

3. **Patient** - Patient profiles
   - Medical information (allergies, conditions, history)
   - Consent management (privacy, service, medical)
   - Approval workflow
   - Staff assignment

### Staff Management

4. **Doctor** - Surgeon profiles
   - Specialization tracking
   - License numbers
   - Working days and availability

5. **WorkingDay** - Doctor schedules
   - Day of week
   - Start/end times
   - Availability flags

### Appointments & Consultations

6. **Appointment** - Patient appointments
   - Status tracking (PENDING, SCHEDULED, COMPLETED, CANCELLED)
   - Check-in tracking
   - Links to Patient and Doctor

7. **Consultation** - Doctor consultations
   - One-to-one with Appointment
   - Start/completion times
   - Outcomes and follow-ups

### Pre/Post-op Workflows

8. **NurseAssignment** - Nurse-to-patient assignments
   - Many-to-many via junction table
   - Assignment tracking

9. **CareNote** - Pre/post-op and general care notes
   - Note types: PRE_OP, POST_OP, GENERAL
   - Linked to appointments

10. **VitalSign** - Patient vital signs
    - Comprehensive measurements
    - Linked to appointments and medical records

### Medical Records

11. **MedicalRecord** - Medical documentation
    - Treatment plans
    - Prescriptions
    - Lab requests

12. **Diagnosis** - Clinical diagnoses
    - Symptoms and diagnosis
    - Prescribed medications
    - Follow-up plans

13. **LabTest** - Laboratory test results
    - Test results and status
    - Linked to medical records

### Billing

14. **Payment** - Payment tracking
    - Multiple payment methods
    - Status tracking (PAID, UNPAID, PART)

15. **PatientBill** - Bill line items
    - Service details
    - Quantities and costs

16. **Service** - Service catalog
    - Service names and prices
    - Categories

### Feedback & Ratings

17. **Rating** - Doctor ratings
    - 1-5 scale
    - Comments
    - Unique per doctor-patient pair

### System

18. **Notification** - System notifications
    - Multiple types (EMAIL, SMS, PUSH, IN_APP)
    - Status tracking
    - Sender/recipient tracking

19. **AuditLog** - Compliance logging
    - All user actions
    - IP address and user agent
    - Detailed action tracking

## Key Features

### Referential Integrity
- All foreign keys enforced
- Cascade deletes for dependent records
- Set null for optional relationships

### Data Validation
- Unique constraints on emails, licenses, tokens
- Non-nullable required fields
- Enum constraints for status fields

### Performance
- Indexes on all foreign keys
- Composite indexes for common queries
- Date range indexes for appointments

### Security
- Password hashing (bcrypt)
- MFA support
- Audit logging for all actions
- Role-based access control

## Seeding Data

The seed script creates:
- 1 Admin user
- 5 Doctors (surgeons)
- 3 Nurses
- 2 Frontdesk staff
- 5 Patients with medical history
- 20 Appointments
- 5 Consultations
- Pre/post-op workflows
- Vital signs records
- 8 Services
- 50 Audit logs
- 20 Notifications

## Default Credentials

After seeding:
- **Admin**: admin@nairobisculpt.com / admin123
- **Doctor**: sarah.wanjiku@nairobisculpt.com / doctor123
- **Nurse**: jane.wambui@nairobisculpt.com / nurse123
- **Frontdesk**: david.omondi@nairobisculpt.com / frontdesk123

## Next Steps

1. Run migrations: `npm run db:migrate`
2. Seed database: `npm run db:seed`
3. Verify data: `npm run db:studio`
4. Start backend integration
