# Authentication Reload Fix

## Problem

When reloading the frontdesk dashboard (`/frontdesk/dashboard`), the page would:
1. Show console errors related to authentication
2. Display "failed to load doctor schedule" error
3. Sometimes break the UI

## Root Cause

The issue was a **race condition** between authentication initialization and API calls:

1. **Page reloads** → React components mount
2. **`AvailableDoctorsPanel` component** mounts and immediately calls `useEffect`
3. **`useEffect` triggers** `loadDoctorsAvailability()` API call
4. **`useAuth` hook** is still initializing (`isLoading: true`)
5. **API call executes** without authentication token (or with stale token)
6. **API returns 401** → Component shows error

### The Problem Flow:
```
Page Reload
  ↓
Components Mount
  ↓
AvailableDoctorsPanel useEffect runs
  ↓
API call made (no token yet)
  ↓
401 Unauthorized
  ↓
Error: "Failed to load doctor schedule"
```

## Solution

Fixed the `AvailableDoctorsPanel` component to:

1. **Wait for authentication** before making API calls
2. **Check authentication state** before loading data
3. **Handle authentication errors gracefully** (don't show error toasts for auth issues)
4. **Use `useCallback`** to prevent unnecessary re-renders

### Changes Made:

#### 1. Added Authentication Check
```typescript
const { user, isAuthenticated, isLoading: authLoading } = useAuth();

useEffect(() => {
  // Only load data when authentication is ready and user is authenticated
  if (!authLoading && isAuthenticated && user) {
    loadDoctorsAvailability();
  } else if (!authLoading && !isAuthenticated) {
    // If not authenticated, stop loading and show empty state
    setLoading(false);
    setDoctorsAvailability([]);
  }
}, [authLoading, isAuthenticated, user, loadDoctorsAvailability]);
```

#### 2. Added Guard in Load Function
```typescript
const loadDoctorsAvailability = useCallback(async () => {
  // Don't load if not authenticated
  if (!isAuthenticated || !user || authLoading) {
    return;
  }
  // ... rest of the function
}, [viewDate, isAuthenticated, user, authLoading]);
```

#### 3. Improved Error Handling
```typescript
if (!response.success) {
  // Only show error toast if it's not an authentication error (401)
  // Authentication errors are handled by the API client
  if (response.error && !response.error.includes('Authentication')) {
    toast.error(response.error || 'Failed to load doctor availability');
  }
  setDoctorsAvailability([]);
}
```

#### 4. Loading State Management
```typescript
// Show loading state while auth is loading or data is loading
if (authLoading || loading) {
  return <LoadingState />;
}

// Don't show anything if not authenticated (parent component handles auth UI)
if (!isAuthenticated || !user) {
  return null;
}
```

## How Authentication Works

### Client-Side Flow:
1. **Page loads** → `useAuth` hook initializes
2. **`useAuth` checks** `localStorage` for tokens
3. **If tokens exist** → Sets up API client with token provider
4. **If tokens don't exist** → User needs to login
5. **Components wait** for `isLoading: false` before making API calls

### API Client Flow:
1. **API call made** → `apiClient.get()` or `apiClient.post()`
2. **Token retrieved** → From `tokenStorage.getAccessToken()`
3. **Request sent** → With `Authorization: Bearer <token>` header
4. **If 401** → API client tries to refresh token
5. **If refresh succeeds** → Retry original request
6. **If refresh fails** → Return error

## Testing

### Test Cases:
1. ✅ **Fresh page load** → Should wait for auth, then load data
2. ✅ **Page reload** → Should wait for auth, then load data
3. ✅ **No authentication** → Should show empty state, no errors
4. ✅ **Expired token** → Should refresh token and retry
5. ✅ **Invalid token** → Should handle gracefully

### How to Test:
1. Open frontdesk dashboard: `http://localhost:3000/frontdesk/dashboard`
2. Reload the page (F5 or Cmd+R)
3. Check console - should not show authentication errors
4. Doctor schedule should load after authentication is ready

## Related Files

- `components/frontdesk/AvailableDoctorsPanel.tsx` - Fixed component
- `app/frontdesk/dashboard/page.tsx` - Parent component (already had proper auth checks)
- `hooks/patient/useAuth.ts` - Authentication hook
- `lib/api/client.ts` - API client with token refresh logic
- `app/api/doctors/availability/route.ts` - API endpoint (requires authentication)

## Best Practices Applied

1. ✅ **Always check authentication state** before making API calls
2. ✅ **Wait for auth initialization** (`isLoading: false`)
3. ✅ **Use `useCallback`** for functions in `useEffect` dependencies
4. ✅ **Handle authentication errors gracefully** (don't spam error toasts)
5. ✅ **Return `null` or empty state** when not authenticated (let parent handle UI)

## Future Improvements

1. Consider adding a **global authentication context** to avoid prop drilling
2. Add **retry logic** with exponential backoff for failed API calls
3. Implement **request queuing** for API calls made before auth is ready
4. Add **loading skeletons** for better UX during authentication initialization
