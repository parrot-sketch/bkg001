# API Routes Retry Logic Fix

## Problem

The `/api/doctors/availability` route was failing with:
```
PrismaClientInitializationError: Can't reach database server at `pg-25182a71-mbuguamuiruri12-d78e.k.aivencloud.com:22630`
```

This error occurs when:
- Database server is temporarily unreachable
- Network connectivity issues
- Connection initialization failures
- Transient connection errors

## Root Cause

The route was not using the `withRetry` wrapper, so connection initialization errors failed immediately without retry attempts.

## Solution

### 1. Updated `/api/doctors/availability` Route

**Changes:**
- ✅ Added `withRetry` import from `@/lib/db`
- ✅ Wrapped use case execution in `withRetry` for automatic retry on connection errors
- ✅ Enhanced error handling to detect connection errors
- ✅ Returns 503 (Service Unavailable) for connection errors vs 500 for other errors

**Benefits:**
- Automatic retry (up to 3 attempts) on connection failures
- Better error messages for connection issues
- Proper HTTP status codes (503 for connection errors)

### 2. Enhanced `withRetry` Function

**Changes:**
- ✅ Added detection for `PrismaClientInitializationError` by name
- ✅ Added detection for "Can't reach database" error messages
- ✅ Improved connection error detection

**Error Types Detected:**
- `PrismaClientInitializationError` - Client initialization failures
- "Can't reach database server" - Network connectivity issues
- "Connection closed" - Connection terminated
- "Connection refused" - Connection rejected
- Prisma error codes: P1001, P1008, P1017, P1010

### 3. Updated `/api/appointments/today` Route

**Changes:**
- ✅ Added `withRetry` for resilience
- ✅ Wrapped database query in retry logic

**Benefits:**
- Prevents failures during transient connection issues
- Better reliability for critical frontdesk operations

## How It Works

### Retry Logic Flow

1. **Attempt Operation** - Try to execute database operation
2. **Check Connection** - Validate connection health before operation
3. **On Failure** - Detect if it's a connection error
4. **Retry** - If connection error and retries remaining:
   - Disconnect current connection
   - Wait with exponential backoff (1s, 2s, 3s)
   - Reconnect
   - Retry operation
5. **Fail** - If max retries reached or non-connection error, throw

### Example Flow

```
Request → Check Connection → Execute Operation
   ↓ (connection error)
Disconnect → Wait 1s → Reconnect → Retry
   ↓ (still failing)
Disconnect → Wait 2s → Reconnect → Retry
   ↓ (still failing)
Disconnect → Wait 3s → Reconnect → Retry
   ↓ (max retries)
Return 503 Service Unavailable
```

## Error Handling

### Connection Errors (503 Service Unavailable)

```json
{
  "success": false,
  "error": "Database connection error. Please try again in a moment."
}
```

### Other Errors (500 Internal Server Error)

```json
{
  "success": false,
  "error": "Failed to fetch doctors availability"
}
```

## Testing

### Verify Fix

1. **Check Logs** - Look for retry attempts:
   ```
   [DB] Connection error on attempt 1, retrying...
   [DB] Connection error on attempt 2, retrying...
   ```

2. **Test Availability Route**:
   ```bash
   curl -H "Authorization: Bearer <token>" \
     "https://www.nsac.co.ke/api/doctors/availability?startDate=2025-01-23&endDate=2025-01-30"
   ```

3. **Monitor Response Codes**:
   - 200 - Success
   - 503 - Connection error (retries exhausted)
   - 500 - Other error

## Additional Recommendations

### 1. Monitor Connection Errors

Track these metrics:
- Connection error rate
- Retry attempt counts
- Average retry delay
- Success rate after retries

### 2. Database Health Checks

Consider implementing:
- Periodic database health checks
- Connection pool monitoring
- Alerting on high connection error rates

### 3. Other Routes to Update

Consider adding `withRetry` to other critical routes:
- `/api/appointments/*` - All appointment routes
- `/api/consultations/*` - Consultation routes
- `/api/patients/*` - Patient routes
- `/api/admin/*` - Admin routes

## Summary

✅ **Fixed**: `/api/doctors/availability` now uses retry logic
✅ **Enhanced**: `withRetry` detects `PrismaClientInitializationError`
✅ **Improved**: Better error handling and HTTP status codes
✅ **Added**: Retry logic to `/api/appointments/today` for resilience

The routes will now automatically retry on connection failures, improving reliability in production.
