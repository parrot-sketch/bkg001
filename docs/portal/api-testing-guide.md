# API Testing Guide - Consultation Workflow

**Status:** Ready for Testing  
**Date:** Current

---

## Prerequisites

1. **Start the Next.js Dev Server:**
   ```bash
   npm run dev
   ```

2. **Ensure Database is Running:**
   ```bash
   # Check if PostgreSQL is running
   docker-compose ps
   
   # Or start it if not running
   docker-compose up -d
   ```

3. **Ensure Test Users Exist:**
   - Patient user: `patient@example.com` / `password123`
   - Frontdesk user: `frontdesk@example.com` / `password123`
   
   If users don't exist, register them first via `/api/auth/register/public` or seed script.

---

## Testing with cURL

### Step 1: Login as Patient

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "password123"
  }'
```

**Save the `accessToken` from the response** - you'll need it for subsequent requests.

### Step 2: Submit Consultation Request

```bash
curl -X POST http://localhost:3000/api/consultations/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PATIENT_TOKEN" \
  -d '{
    "patientId": "patient-1",
    "serviceId": 1,
    "concernDescription": "I need a consultation about a skin condition",
    "preferredDate": "2025-12-31",
    "timePreference": "Morning",
    "isOver18": true,
    "hasSeriousConditions": "no",
    "isPregnant": "no",
    "contactConsent": true,
    "privacyConsent": true,
    "acknowledgmentConsent": true
  }'
```

**Save the `id` from the response** - this is the appointment ID you'll use for review/confirm.

### Step 3: Login as Frontdesk

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "frontdesk@example.com",
    "password": "password123"
  }'
```

**Save the `accessToken` from the response** - you'll need it to review the request.

### Step 4: Review Consultation Request

**Approve:**
```bash
curl -X POST http://localhost:3000/api/consultations/APPOINTMENT_ID/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FRONTDESK_TOKEN" \
  -d '{
    "action": "approve",
    "proposedDate": "2025-12-31",
    "proposedTime": "10:00 AM",
    "reviewNotes": "Approved for consultation"
  }'
```

**Request More Info:**
```bash
curl -X POST http://localhost:3000/api/consultations/APPOINTMENT_ID/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FRONTDESK_TOKEN" \
  -d '{
    "action": "needs_more_info",
    "reviewNotes": "Please provide more details about your condition"
  }'
```

**Reject:**
```bash
curl -X POST http://localhost:3000/api/consultations/APPOINTMENT_ID/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FRONTDESK_TOKEN" \
  -d '{
    "action": "reject",
    "reviewNotes": "Not suitable for our services"
  }'
```

### Step 5: Confirm Consultation (as Patient)

```bash
curl -X POST http://localhost:3000/api/consultations/APPOINTMENT_ID/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PATIENT_TOKEN"
```

---

## Testing with Test Script

A bash script is available for automated testing:

```bash
chmod +x scripts/test-consultation-api.sh
./scripts/test-consultation-api.sh
```

**Note:** Update the script with your actual test user emails/passwords.

---

## Testing with Postman/Thunder Client

1. **Import Collection:**
   - Create a new collection: "Consultation Workflow"
   - Add requests for each endpoint

2. **Set Environment Variables:**
   - `base_url`: `http://localhost:3000`
   - `patient_token`: (set after login)
   - `frontdesk_token`: (set after login)
   - `appointment_id`: (set after submit)

3. **Test Flow:**
   1. Login Patient → Set `patient_token` variable
   2. Submit Request → Set `appointment_id` variable
   3. Login Frontdesk → Set `frontdesk_token` variable
   4. Review Request → Use `appointment_id` and `frontdesk_token`
   5. Confirm Request → Use `appointment_id` and `patient_token`

---

## Expected Responses

### Submit Consultation Request (201)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "patientId": "patient-1",
    "doctorId": "",
    "appointmentDate": "2025-12-31T00:00:00.000Z",
    "time": "Morning",
    "status": "PENDING",
    "consultationRequestStatus": "SUBMITTED",
    "type": "Consultation Request",
    ...
  },
  "message": "Consultation request submitted successfully"
}
```

### Review Consultation Request (200)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "consultationRequestStatus": "APPROVED",
    "reviewedBy": "frontdesk-user-id",
    "reviewedAt": "2025-01-01T10:00:00.000Z",
    "reviewNotes": "Approved for consultation",
    ...
  },
  "message": "Consultation request approved successfully"
}
```

### Confirm Consultation (200)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "consultationRequestStatus": "CONFIRMED",
    "status": "SCHEDULED",
    ...
  },
  "message": "Consultation confirmed successfully"
}
```

---

## Common Errors

### 401 Unauthorized
- **Cause:** Missing or invalid JWT token
- **Fix:** Login again to get a fresh token

### 403 Forbidden
- **Cause:** Wrong role (e.g., Patient trying to review)
- **Fix:** Use the correct role's token (Frontdesk for review)

### 400 Bad Request
- **Cause:** Missing required fields or invalid data
- **Fix:** Check request body matches DTO requirements

### 500 Internal Server Error
- **Cause:** Server error (check logs)
- **Fix:** Check server logs for details

---

## Debugging Tips

1. **Check Server Logs:**
   ```bash
   # Terminal running npm run dev
   # Watch for error messages
   ```

2. **Check Database:**
   ```bash
   # Use Prisma Studio
   npx prisma studio
   
   # Check appointments table
   # Look for consultation_request_status field
   ```

3. **Verify Tokens:**
   - Decode JWT tokens at https://jwt.io
   - Check `userId` and `role` claims

4. **Check Migrations:**
   ```bash
   # Ensure migration was applied
   npx prisma migrate status
   ```

---

## Next Steps

After testing the API routes:
1. Fix any issues found
2. Test with frontend integration
3. Add integration tests
4. Document API in OpenAPI/Swagger format
