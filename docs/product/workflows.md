# Healthcare Workflows

**Last Updated:** January 2025

## Overview

This document describes the key healthcare workflows supported by the HIMS system. These workflows represent the actual business processes that the system enables.

## Patient Registration

### Flow
1. Patient signs up via Clerk authentication
2. Patient fills out registration form
3. System validates patient data
4. System creates Clerk user (if new)
5. System creates Patient record in database
6. System sets role metadata in Clerk

### Actors
- Patient
- Admin (can register patients on behalf)

### Data Required
- Personal information (name, DOB, gender)
- Contact information (email, phone, address)
- Emergency contact details
- Insurance information (optional)
- Consents (privacy, service, medical)

### Current Limitations
- No duplicate patient validation (except email)
- Password defaults to phone number (security risk)
- No approval workflow for patient registration

## Appointment Booking

### Flow
1. Patient/Admin selects doctor
2. Patient/Admin selects date and time
3. System creates appointment with status PENDING
4. Admin/Doctor can update status to SCHEDULED
5. After appointment, status updated to COMPLETED

### Actors
- Patient
- Admin
- Doctor (can view own appointments)

### Current Limitations
- No availability checking
- No conflict detection (doctor can have multiple appointments at same time)
- No automated notifications
- No waitlist support

## Clinical Documentation

### Flow
1. Doctor views appointment
2. Doctor adds vital signs (creates MedicalRecord if doesn't exist)
3. Doctor adds diagnosis
4. Doctor may request lab tests
5. Doctor completes treatment plan
6. Bill can be generated

### Actors
- Doctor
- Lab Technician (for lab tests)

### Current Limitations
- MedicalRecord creation is implicit
- No workflow enforcement (can add diagnosis before vital signs)
- All clinical data stored as text (no structured data)
- No versioning of clinical notes

## Billing Workflow

### Flow
1. Admin/Doctor adds services to bill
2. System creates Payment record (if doesn't exist)
3. Admin generates bill (calculates total, applies discount)
4. Payment recorded (updates Payment status)
5. Appointment marked as COMPLETED

### Actors
- Admin
- Doctor
- Cashier

### Current Limitations
- No invoice generation (receipt number but no PDF)
- No payment transactions (cannot track partial payments)
- No refund support
- Discount calculation in application code (should be validated)

## Appointment Status Changes

### Allowed Transitions
- PENDING → SCHEDULED
- PENDING → CANCELLED
- SCHEDULED → CANCELLED
- SCHEDULED → COMPLETED
- COMPLETED (final state)
- CANCELLED (final state)

### Notes
- Status changes do not validate appointment conflicts
- Cancellation reason is optional and not enforced

## User Roles and Permissions

### Roles
- **ADMIN:** Full system access
- **DOCTOR:** View and manage own appointments, create clinical records
- **NURSE:** View patient records, assist with appointments
- **LAB_TECHNICIAN:** Manage lab tests
- **PATIENT:** View own records, book appointments
- **CASHIER:** Process payments, view bills

### Current Limitations
- Role-based access only (no fine-grained permissions)
- Route access defined in code (hard to change)
- No resource-level permissions (cannot restrict access to specific patients)

## Future Workflows (Not Yet Implemented)

- Patient self-service portal
- Automated appointment reminders
- Lab test result notifications
- Prescription management
- Insurance claims processing
- Multi-role clinical workflows (care teams)

## References

- [Roles Documentation](./roles.md)
- [System Overview](../architecture/system-overview.md)
