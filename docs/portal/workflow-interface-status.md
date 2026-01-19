# Consultation Workflow - Interface & Dashboard Status

**Date:** Current  
**Status:** Backend Complete ✅ | Frontend Partial ⚠️

---

## ✅ Backend API Routes (Complete)

### Consultation Workflow Endpoints
- ✅ `POST /api/consultations/submit` - Submit consultation request (Patient)
- ✅ `POST /api/consultations/:id/review` - Review/approve/reject request (Frontdesk)
- ✅ `POST /api/consultations/:id/confirm` - Confirm scheduled consultation (Patient)

### Supporting Endpoints
- ✅ `GET /api/doctors` - List doctors (public)
- ✅ `GET /api/services` - List services (public)
- ✅ `POST /api/auth/login` - Authentication
- ✅ `POST /api/auth/register` - Registration

### ⚠️ Missing Endpoints (For Dashboards)

**For Frontdesk Review Queue:**
- ❌ `GET /api/consultations/pending` - Get pending consultation requests
- ❌ `GET /api/consultations?status=SUBMITTED` - Filter by consultation_request_status

**For Patient Portal:**
- ❌ `GET /api/appointments?patientId=xxx` - Get patient's appointments with consultation_request_status
- ❌ `GET /api/appointments/:id` - Get appointment details with consultation_request_status

**For Doctor Dashboard:**
- ❌ `GET /api/appointments/doctor?status=CONFIRMED,SCHEDULED` - Filter by consultation_request_status

---

## ✅ Frontend Pages (Partial)

### Patient Portal ✅ Complete
- ✅ `/portal/welcome` - Welcome page
- ✅ `/portal/book-consultation` - Booking flow (complete)
- ✅ `/portal/doctors/[id]` - Doctor profiles
- ✅ `/portal/services` - Service listing
- ✅ Patient can submit consultation requests

**Missing:**
- ⚠️ Display consultation_request_status on appointment cards
- ⚠️ Show "Respond" button when status = `NEEDS_MORE_INFO`
- ⚠️ Show "Confirm" button when status = `SCHEDULED`

### Frontdesk Dashboard ⚠️ Partial
- ✅ `/frontdesk/dashboard` - Dashboard exists
- ✅ Shows today's appointments
- ❌ **Missing:** Consultation request review queue
- ❌ **Missing:** Filter appointments by `consultation_request_status = SUBMITTED`
- ❌ **Missing:** Review UI (approve/reject/request info)
- ❌ **Missing:** Quick actions for pending requests

### Doctor Dashboard ⚠️ Partial
- ✅ `/doctor/dashboard` - Dashboard exists
- ✅ Shows appointments
- ❌ **Missing:** Filter to only show `CONFIRMED` or `SCHEDULED` consultations
- ❌ **Missing:** Hide unreviewed requests (`SUBMITTED`, `PENDING_REVIEW`, `NEEDS_MORE_INFO`)

---

## 🎯 What's Needed for Complete Workflow

### 1. Backend: Query Endpoints (Missing)

**Get Pending Consultation Requests:**
```typescript
// GET /api/consultations/pending
// Returns appointments with consultation_request_status = SUBMITTED or PENDING_REVIEW
```

**Get Patient Appointments with Status:**
```typescript
// GET /api/appointments?patientId=xxx
// Returns appointments with consultation_request_status field included
```

**Get Doctor Appointments (Filtered):**
```typescript
// GET /api/appointments/doctor/:doctorId?status=CONFIRMED,SCHEDULED
// Returns only confirmed/scheduled consultations
```

### 2. Frontend: Patient Portal Enhancements (Missing)

**Appointment Status Display:**
- Show consultation_request_status on appointment cards
- Display status with user-friendly labels (e.g., "Under Review", "Approved", "More Info Needed")
- Show status-based actions:
  - `NEEDS_MORE_INFO` → "Respond" button
  - `SCHEDULED` → "Confirm Appointment" button

### 3. Frontend: Frontdesk Dashboard (Missing)

**Consultation Request Review Queue:**
- New section: "Consultation Requests" (separate from regular appointments)
- List appointments with `consultation_request_status = SUBMITTED`
- Quick actions per request:
  - ✅ Approve (with date/time picker)
  - 📝 Request More Info (with notes field)
  - ❌ Reject (with reason field)
- Display request details:
  - Patient name, concern description
  - Preferred date/time
  - Service requested

### 4. Frontend: Doctor Dashboard (Missing)

**Filter Confirmed Consultations:**
- Filter appointments to only show:
  - `consultation_request_status = CONFIRMED` OR
  - `consultation_request_status = SCHEDULED` (if doctor can see scheduled)
- Hide unreviewed requests (`SUBMITTED`, `PENDING_REVIEW`, `NEEDS_MORE_INFO`)

---

## 📋 Implementation Checklist

### Backend (Priority: High)
- [ ] Add `GET /api/consultations/pending` endpoint
- [ ] Add `GET /api/appointments` with consultation_request_status filter
- [ ] Update existing appointment endpoints to include consultation_request_status
- [ ] Add query parameters for filtering by consultation_request_status

### Frontend: Patient Portal (Priority: Medium)
- [ ] Display consultation_request_status on appointment cards
- [ ] Show status-based action buttons
- [ ] Add "Respond to Request" modal/page
- [ ] Add "Confirm Appointment" button and handler

### Frontend: Frontdesk Dashboard (Priority: High)
- [ ] Create "Consultation Requests" section component
- [ ] Add review queue list view
- [ ] Add review action buttons (Approve/Request Info/Reject)
- [ ] Add review modal/form
- [ ] Integrate with `/api/consultations/:id/review` endpoint

### Frontend: Doctor Dashboard (Priority: Medium)
- [ ] Add filter for consultation_request_status
- [ ] Hide unreviewed requests by default
- [ ] Update appointment list query to filter by status

---

## 🎯 Current Status Summary

### ✅ Complete
- Backend use cases (Submit, Review, Confirm)
- Backend API routes (Submit, Review, Confirm)
- Patient booking flow
- Database schema with consultation_request_status
- Domain logic and validation

### ⚠️ Partial
- Frontdesk dashboard (exists but missing review queue)
- Doctor dashboard (exists but missing filtering)
- Patient portal (exists but missing status display)

### ❌ Missing
- Query endpoints for fetching filtered appointments
- Frontdesk review queue UI
- Patient status display and actions
- Doctor filtering logic

---

## 🚀 Next Steps

1. **Create Query Endpoints** - Add GET endpoints for fetching appointments with consultation_request_status
2. **Enhance Frontdesk Dashboard** - Add consultation request review queue
3. **Enhance Patient Portal** - Show consultation_request_status and actions
4. **Enhance Doctor Dashboard** - Filter to only show confirmed consultations

---

**Assessment:** Backend is complete for the core workflow, but frontend dashboards need enhancement to support the full review and approval flow. Patient side is mostly complete but needs status display.
