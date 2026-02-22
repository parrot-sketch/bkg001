# Doctor Schedule Availability Optimization

## Problem Identified

The frontdesk dashboard and appointment booking wizard were making **duplicate API requests** for the same doctor availability data:

1. **AvailableDoctorsPanel** (Dashboard):
   - Calls `frontdeskApi.getDoctorsAvailability()` for all doctors (2 months)
   - Query key: `['doctors', 'availability', 'future', date]`

2. **Step3DateTimePicker** (Booking Wizard):
   - When doctor selected, makes **TWO new API calls**:
     - `/doctors/${doctorId}/available-dates` - Gets available dates
     - `/doctors/${doctorId}/slots?date=${date}` - Gets slots for selected date
   - These are **redundant** if we already have the data from the dashboard

## Solution Implemented

### 1. Created Shared React Query Hooks (`hooks/schedule/useDoctorAvailability.ts`)

Centralized hooks with consistent query keys:

- `useDoctorsAvailability()` - Fetches all doctors' availability
- `useDoctorAvailableDates()` - Fetches available dates for a doctor
- `useDoctorAvailableSlots()` - Fetches slots for a specific date
- `useDoctorFromAvailabilityList()` - Gets doctor from cached list
- `getDefaultAvailabilityDateRange()` - Consistent date range helper

**Key Features:**
- Query key factory for consistent cache keys
- Shared cache across components
- Automatic data reuse
- Proper stale time and garbage collection

### 2. Updated AvailableDoctorsPanel

**Before:**
```typescript
const { data } = useQuery({
  queryKey: ['doctors', 'availability', 'future', date],
  queryFn: () => frontdeskApi.getDoctorsAvailability(...)
});
```

**After:**
```typescript
const { data } = useDoctorsAvailability(startDate, endDate);
```

**Benefits:**
- Uses shared hook
- Data cached for reuse
- Consistent query keys

### 3. Updated Step3DateTimePicker

**Before:**
```typescript
// Manual API calls with useEffect
useEffect(() => {
  apiClient.get(`/doctors/${doctorId}/available-dates?...`)
    .then(res => setAvailableDates(res.data));
}, [doctorId]);

useEffect(() => {
  apiClient.get(`/doctors/${doctorId}/slots?date=${date}`)
    .then(res => setSlots(res.data));
}, [doctorId, selectedDate]);
```

**After:**
```typescript
// Uses shared hooks - automatically reuses cached data
const { data: availableDates, isLoading } = useDoctorAvailableDates(doctorId, startDate, endDate);
const { data: slots, isLoading } = useDoctorAvailableSlots(doctorId, selectedDate);
```

**Benefits:**
- No manual API calls
- Automatic cache reuse
- Consistent with dashboard
- Better loading states

## Performance Improvements

### Before Optimization:
1. Dashboard loads → API call for all doctors
2. User clicks "Quick Book" → **2 new API calls** for selected doctor
3. **Total: 3 API calls** (1 + 2)

### After Optimization:
1. Dashboard loads → API call for all doctors (cached)
2. User clicks "Quick Book" → **Reuses cached data** for available dates
3. Only fetches slots when date selected (can't be cached from dashboard)
4. **Total: 2 API calls** (1 + 1) - **33% reduction**

### Additional Benefits:
- **Faster navigation** - No loading delay when coming from dashboard
- **Consistent data** - Same source of truth
- **Better UX** - Instant availability display
- **Reduced server load** - Fewer redundant requests

## Query Key Structure

```
['doctors', 'availability', 'list', startDate, endDate]
['doctors', 'availability', 'detail', doctorId, 'available-dates', startDate, endDate]
['doctors', 'availability', 'detail', doctorId, 'slots', date]
```

This hierarchical structure allows:
- Cache invalidation at different levels
- Efficient cache sharing
- Easy debugging in React Query DevTools

## Cache Strategy

- **Stale Time**: 5 minutes for availability, 2 minutes for slots
- **Garbage Collection**: 10 minutes for availability, 5 minutes for slots
- **Automatic Refetch**: On window focus (React Query default)

## Future Optimizations

1. **Prefetch on hover**: Prefetch doctor availability when hovering over doctor card
2. **Background refresh**: Refresh availability in background before it becomes stale
3. **Optimistic updates**: Update cache immediately when appointment is booked
4. **Partial data**: Only fetch slots for visible dates, not all dates at once

## Testing Checklist

- [x] Dashboard loads doctor availability
- [x] Clicking "Quick Book" reuses cached data
- [x] Available dates load instantly (from cache)
- [x] Slots fetch correctly when date selected
- [x] No duplicate API calls in network tab
- [x] Cache persists across navigation
- [x] Manual refresh works correctly
