# Appointments API Design

**Last Updated:** January 2025

## Overview

The Appointments API follows RESTful principles with a single endpoint (`/api/appointments`) that supports multiple query parameters for flexible filtering. This design is maintainable, scalable, and follows clean architecture principles.

---

## Endpoint: `/api/appointments`

### GET `/api/appointments`

**Purpose:** Retrieve appointments with flexible filtering options.

**Authentication:** Required (JWT token)

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `patientId` | string | Filter by patient ID (required for PATIENT role) | `?patientId=abc123` |
| `status` | string | Filter by appointment status | `?status=SCHEDULED` |
| `consultationRequestStatus` | string | Filter by consultation request status (comma-separated) | `?consultationRequestStatus=SUBMITTED,PENDING_REVIEW` |
| `date` | string | Filter by specific date (YYYY-MM-DD) | `?date=2026-01-19` |
| `startDate` | string | Filter by date range start (YYYY-MM-DD) | `?startDate=2026-01-01&endDate=2026-01-31` |
| `endDate` | string | Filter by date range end (YYYY-MM-DD) | `?startDate=2026-01-01&endDate=2026-01-31` |
| `upcoming` | boolean | Filter for future appointments (true) | `?upcoming=true` |

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "patientId": "patient-uuid",
      "doctorId": "doctor-uuid",
      "appointmentDate": "2026-01-19T00:00:00.000Z",
      "time": "10:00 AM",
      "status": "SCHEDULED",
      "type": "Consultation",
      "consultationRequestStatus": "CONFIRMED",
      ...
    }
  ],
  "message": "Appointments retrieved successfully"
}
```

**Security:**
- PATIENT role: Can only query their own appointments (patientId automatically resolved from User ID)
- FRONTDESK/ADMIN/DOCTOR roles: Can query all appointments with appropriate filters

**Examples:**

1. **Get today's appointments:**
   ```
   GET /api/appointments?date=2026-01-19
   ```

2. **Get upcoming appointments:**
   ```
   GET /api/appointments?upcoming=true
   ```

3. **Get appointments by status:**
   ```
   GET /api/appointments?status=SCHEDULED
   ```

4. **Get appointments by date range:**
   ```
   GET /api/appointments?startDate=2026-01-01&endDate=2026-01-31
   ```

5. **Get pending consultation requests:**
   ```
   GET /api/appointments?consultationRequestStatus=SUBMITTED,PENDING_REVIEW
   ```

6. **Combined filters:**
   ```
   GET /api/appointments?date=2026-01-19&status=SCHEDULED
   ```

---

### POST `/api/appointments`

**Purpose:** Create a new appointment (consultation inquiry).

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "patientId": "patient-uuid or user-uuid",
  "doctorId": "doctor-uuid",
  "appointmentDate": "2026-01-19T00:00:00.000Z",
  "time": "10:00 AM",
  "type": "Consultation Request",
  "note": "Optional notes"
}
```

**Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Appointment created successfully"
}
```

**Business Logic:**
- Automatically resolves Patient ID from User ID if user role is PATIENT
- Uses `ScheduleAppointmentUseCase` for business logic validation
- Creates appointment with `PENDING` status initially
- Sets `consultation_request_status` to `SUBMITTED` for patient inquiries

---

## Convenience Endpoint: `/api/appointments/today`

### GET `/api/appointments/today`

**Purpose:** Convenience endpoint to get today's appointments (shorthand for `?date=YYYY-MM-DD`).

**Authentication:** Required (JWT token)

**Response Format:** Same as GET `/api/appointments`

**Implementation:** Uses `startOfDay` and `endOfDay` from `date-fns` to filter appointments for the current day.

**Note:** This endpoint is a convenience wrapper. The main `/api/appointments?date=YYYY-MM-DD` endpoint provides the same functionality.

---

## API Client Usage

### Frontdesk API Client

```typescript
// Get today's appointments
const today = await frontdeskApi.getTodayAppointments();

// Get appointments by date
const date = new Date('2026-01-19');
const byDate = await frontdeskApi.getAppointmentsByDate(date);

// Get upcoming appointments
const upcoming = await frontdeskApi.getUpcomingAppointments();

// Get appointments by status
const scheduled = await frontdeskApi.getAppointmentsByStatus('SCHEDULED');

// Get appointments by date range
const range = await frontdeskApi.getAppointmentsByDateRange(
  new Date('2026-01-01'),
  new Date('2026-01-31')
);
```

All these methods use the single `/api/appointments` endpoint with appropriate query parameters.

---

## Design Principles

### 1. **Single Source of Truth**
- One main endpoint (`/api/appointments`) handles all appointment queries
- Query parameters provide flexibility without endpoint proliferation
- Reduces code duplication and maintenance burden

### 2. **RESTful Design**
- GET for queries, POST for creation
- Query parameters for filtering (not path parameters for filters)
- Consistent response format across all endpoints

### 3. **Security by Design**
- Role-based access control built into the endpoint
- Patient ID resolution happens at API level (not client)
- No sensitive data exposure

### 4. **Clean Architecture**
- Uses existing use cases (`ScheduleAppointmentUseCase`)
- Follows domain-driven design principles
- Separation of concerns (API layer, use case layer, domain layer)

### 5. **Type Safety**
- TypeScript interfaces for all DTOs
- Type-safe API client methods
- Compile-time error checking

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created (POST)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

---

## Future Enhancements

1. **Pagination:** Add `page` and `limit` query parameters
2. **Sorting:** Add `sortBy` and `sortOrder` parameters
3. **Search:** Add `search` parameter for patient/doctor name search
4. **Caching:** Implement response caching for frequently accessed queries

---

## Migration Notes

**Before:** Multiple endpoints (`/appointments/date/:date`, `/appointments/upcoming`, etc.)
**After:** Single endpoint with query parameters (`/appointments?date=...`, `/appointments?upcoming=true`)

**Benefits:**
- Easier to maintain
- More flexible
- Consistent API design
- Better performance (single code path)
