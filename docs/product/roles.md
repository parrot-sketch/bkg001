# User Roles and Permissions

**Last Updated:** January 2025

## Overview

The HIMS system supports role-based access control (RBAC) with six distinct roles. Each role has specific permissions and access levels within the system.

## Role Definitions

### ADMIN

**Purpose:** Full system administration and oversight

**Permissions:**
- ✅ Create, read, update, delete all users (patients, doctors, staff)
- ✅ View all appointments
- ✅ Access all patient records
- ✅ Manage system settings
- ✅ Process all billing and payments
- ✅ View audit logs and reports

**Access Areas:**
- All routes (`/admin`, `/record/*`, `/patient/*`)

**Typical Use Cases:**
- System configuration
- User management
- Financial oversight
- Compliance reporting

---

### DOCTOR

**Purpose:** Clinical care provision and patient management

**Permissions:**
- ✅ View own appointments
- ✅ Create and update clinical records
- ✅ Add vital signs and diagnoses
- ✅ Request lab tests
- ✅ View assigned patient records
- ✅ Generate bills for appointments
- ✅ View own ratings and feedback

**Access Areas:**
- `/doctor/*`
- `/record/doctors/*` (own profile)
- `/record/patients`
- `/patient/*` (view only)

**Typical Use Cases:**
- Manage appointment schedule
- Document patient encounters
- Review patient history
- Generate clinical notes

---

### NURSE

**Purpose:** Clinical support and patient care assistance

**Permissions:**
- ✅ View patient records
- ✅ Assist with appointments
- ✅ Access clinical documentation (read-only in some areas)
- ❌ Cannot create clinical records independently
- ❌ Cannot generate bills

**Access Areas:**
- `/patient/*` (view only)
- `/record/patients`

**Typical Use Cases:**
- Patient intake
- Vital signs documentation (may require doctor approval)
- Patient education
- Follow-up coordination

---

### LAB_TECHNICIAN

**Purpose:** Laboratory test management and results

**Permissions:**
- ✅ Manage lab tests
- ✅ Update test results
- ✅ View patient records (for test context)
- ❌ Cannot modify clinical diagnoses
- ❌ Cannot create appointments

**Access Areas:**
- `/record/medical-records` (lab test sections)
- Patient records (limited access for test context)

**Typical Use Cases:**
- Receive lab requests
- Perform tests
- Enter test results
- Update test status

---

### PATIENT

**Purpose:** Patient self-service and record access

**Permissions:**
- ✅ View own appointments
- ✅ View own medical records
- ✅ View own bills and payments
- ✅ Book new appointments
- ✅ Update own profile information
- ❌ Cannot access other patients' data
- ❌ Cannot modify clinical records
- ❌ Cannot access administrative functions

**Access Areas:**
- `/patient/*` (own data only)
- `/patient/registrations`

**Typical Use Cases:**
- Book appointments
- Review medical history
- View test results
- Make payments (future)
- Update contact information

---

### CASHIER

**Purpose:** Payment processing and billing support

**Permissions:**
- ✅ Process payments
- ✅ View bills
- ✅ Generate receipts
- ✅ View patient billing information
- ❌ Cannot modify clinical records
- ❌ Cannot create appointments

**Access Areas:**
- `/record/billing`
- Patient records (billing sections only)

**Typical Use Cases:**
- Process patient payments
- Generate invoices
- Handle refunds (future)
- Payment reconciliation

---

## Route Access Matrix

| Route | ADMIN | DOCTOR | NURSE | LAB_TECH | PATIENT | CASHIER |
|-------|-------|--------|-------|----------|---------|---------|
| `/admin/*` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/doctor/*` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/patient/*` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `/record/users` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/record/doctors` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/record/staffs` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/record/patients` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/record/appointments` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/record/billing` | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| `/record/medical-records` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

## Current Limitations

### Permission System
- ❌ Only role-based access (no fine-grained permissions)
- ❌ No resource-level permissions (cannot restrict access to specific patients)
- ❌ Route access hardcoded in middleware (requires code changes)
- ❌ No permission inheritance or hierarchy
- ❌ No temporary permissions or delegation

### Security Considerations
- ⚠️ Role metadata stored in Clerk (vendor lock-in)
- ⚠️ No audit trail for permission changes
- ⚠️ No multi-factor authentication configuration
- ⚠️ No session timeout management

## Future Enhancements

### Planned Improvements
1. Fine-grained permissions (view_patient, edit_record, etc.)
2. Resource-level permissions (e.g., doctor can only view assigned patients)
3. Permission inheritance and hierarchies
4. Temporary permissions and delegation
5. Permission audit logging
6. Multi-factor authentication support

### Use Cases Requiring Permission System
- Nurse assigned to specific doctor (can only view that doctor's patients)
- Lab technician can only view records for requested tests
- Administrative assistant with limited patient access
- Consulting physician with read-only access to specific cases

## Implementation Details

### Current Implementation
- Roles stored in Clerk metadata
- Route access enforced via middleware (`middleware.ts`)
- Route access rules defined in `lib/routes.ts`

### Future Implementation (After Refactor)
- Permission model in database
- Permission checking service in application layer
- Resource-level authorization in use cases

## References

- [System Overview](../architecture/system-overview.md)
- [Workflows Documentation](./workflows.md)
