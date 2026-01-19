# React Query Hooks Proposal for Consultation Session UI

**Last Updated:** January 2025

## Overview

This document proposes React Query hooks and cache strategy for the Consultation Session UI, designed for aesthetic surgery workflows with emphasis on:
- Zero data loss (auto-save with recovery)
- Network resilience (retry logic, optimistic updates)
- State machine fidelity (UI reflects backend state)
- Fast doctor scanning (minimal transformation)

---

## 1. Hook Definitions

### 1.1 `useConsultation(appointmentId)`

**Purpose:** Fetch consultation details for active session UI

**Cache Key:** `['consultation', appointmentId]`

**Query Function:**
```typescript
async (appointmentId: number) => {
  const response = await consultationApi.getConsultation(appointmentId);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch consultation');
  }
  return response.data; // ConsultationResponseDto | null
}
```

**Configuration:**
```typescript
{
  queryKey: ['consultation', appointmentId],
  queryFn: () => fetchConsultation(appointmentId),
  enabled: !!appointmentId,
  staleTime: 0, // Always fresh during active consultation
  refetchInterval: isConsultationActive ? 30000 : false, // Poll every 30s if active
  refetchIntervalInBackground: true,
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
}
```

**Usage:**
```typescript
const { data: consultation, isLoading, error, refetch } = useConsultation(appointmentId);

// Derived state
const isConsultationActive = consultation?.state === ConsultationState.IN_PROGRESS;
const canSaveDraft = isConsultationActive;
const canComplete = isConsultationActive;
```

---

### 1.2 `useSaveConsultationDraft()`

**Purpose:** Save draft notes with optimistic updates and version safety

**Cache Key:** Mutation (no cache key)

**Mutation Function:**
```typescript
async (dto: SaveConsultationDraftDto) => {
  const response = await consultationApi.saveDraft(dto.appointmentId, dto);
  if (!response.success) {
    throw new Error(response.error || 'Failed to save draft');
  }
  return response.data; // ConsultationResponseDto
}
```

**Configuration:**
```typescript
{
  mutationFn: saveConsultationDraft,
  onMutate: async (newDraft) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['consultation', newDraft.appointmentId]);
    
    // Snapshot previous value
    const previousConsultation = queryClient.getQueryData<ConsultationResponseDto | null>(
      ['consultation', newDraft.appointmentId]
    );
    
    // Optimistically update
    if (previousConsultation) {
      queryClient.setQueryData(['consultation', newDraft.appointmentId], {
        ...previousConsultation,
        notes: {
          fullText: newDraft.notes.rawText || 
            (newDraft.notes.structured ? 
              formatStructuredNotes(newDraft.notes.structured) : ''),
          structured: newDraft.notes.structured,
        },
        updatedAt: new Date(), // Optimistic timestamp
      });
    }
    
    return { previousConsultation };
  },
  onError: (err, newDraft, context) => {
    // Rollback on error
    if (context?.previousConsultation !== undefined) {
      queryClient.setQueryData(
        ['consultation', newDraft.appointmentId],
        context.previousConsultation
      );
    }
    
    // Handle version conflict specifically
    if (err instanceof Error && err.message.includes('VERSION_CONFLICT')) {
      // Refetch to get latest version
      queryClient.invalidateQueries(['consultation', newDraft.appointmentId]);
      toast.error('Consultation was updated. Please refresh and try again.');
    } else {
      toast.error('Failed to save draft. Please try again.');
    }
  },
  onSuccess: (data, variables) => {
    // Update cache with server response
    queryClient.setQueryData(['consultation', variables.appointmentId], data);
    toast.success('Draft saved');
  },
  retry: (failureCount, error) => {
    // Don't retry version conflicts
    if (error instanceof Error && error.message.includes('VERSION_CONFLICT')) {
      return false;
    }
    return failureCount < 3;
  },
}
```

**Usage:**
```typescript
const saveDraftMutation = useSaveConsultationDraft();

// Debounced auto-save
const debouncedSave = useMemo(
  () => debounce((notes: string) => {
    saveDraftMutation.mutate({
      appointmentId,
      doctorId,
      notes: { rawText: notes },
      versionToken: consultation?.updatedAt.toISOString(),
    });
  }, 30000), // 30 seconds
  [saveDraftMutation, appointmentId, doctorId, consultation?.updatedAt]
);

// Manual save
const handleSave = () => {
  saveDraftMutation.mutate({
    appointmentId,
    doctorId,
    notes: { rawText: currentNotes },
    versionToken: consultation?.updatedAt.toISOString(),
  });
};
```

---

### 1.3 `usePatientConsultationHistory(patientId)`

**Purpose:** Fetch patient consultation history for timeline UI

**Cache Key:** `['patient-consultations', patientId]`

**Query Function:**
```typescript
async (patientId: string) => {
  const response = await consultationApi.getPatientConsultationHistory(patientId);
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch consultation history');
  }
  return response.data; // PatientConsultationHistoryDto
}
```

**Configuration:**
```typescript
{
  queryKey: ['patient-consultations', patientId],
  queryFn: () => fetchPatientConsultationHistory(patientId),
  enabled: !!patientId,
  staleTime: 5 * 60 * 1000, // 5 minutes (history changes less frequently)
  retry: 2,
}
```

**Usage:**
```typescript
const { data: history, isLoading } = usePatientConsultationHistory(patientId);

// Derived data
const completedConsultations = history?.consultations.filter(
  c => c.state === ConsultationState.COMPLETED
) || [];
const proceduresProceeded = history?.summary.proceduresProceeded || 0;
```

---

## 2. Cache Strategy

### 2.1 Cache Keys

```typescript
// Consultation by appointment ID
['consultation', appointmentId]

// Patient consultation history
['patient-consultations', patientId]

// Appointment details (existing)
['appointment', appointmentId]

// Patient details (existing)
['patient', patientId]
```

### 2.2 Cache Invalidation

**When to invalidate:**

1. **After saving draft:**
   ```typescript
   // In onSuccess of saveDraftMutation
   queryClient.setQueryData(['consultation', appointmentId], updatedConsultation);
   // No need to invalidate - we update directly
   ```

2. **After completing consultation:**
   ```typescript
   // After completeConsultation mutation
   queryClient.invalidateQueries(['consultation', appointmentId]);
   queryClient.invalidateQueries(['patient-consultations', patientId]);
   queryClient.invalidateQueries(['appointment', appointmentId]);
   ```

3. **On version conflict:**
   ```typescript
   // In onError of saveDraftMutation (if VERSION_CONFLICT)
   queryClient.invalidateQueries(['consultation', appointmentId]);
   ```

### 2.3 Cache Prefetching

**Prefetch consultation when appointment is loaded:**
```typescript
// In appointment detail page
const { data: appointment } = useQuery(['appointment', appointmentId], ...);

useEffect(() => {
  if (appointment && appointment.status === AppointmentStatus.SCHEDULED) {
    // Prefetch consultation (may not exist yet)
    queryClient.prefetchQuery({
      queryKey: ['consultation', appointmentId],
      queryFn: () => fetchConsultation(appointmentId),
    });
  }
}, [appointment, appointmentId]);
```

---

## 3. Optimistic Updates Strategy

### 3.1 Draft Save Optimistic Update

**Flow:**
1. User types in notes editor
2. Debounced auto-save triggers mutation
3. Optimistically update UI immediately
4. Send request to server
5. On success: Update cache with server response
6. On error: Rollback to previous state, show error

**Implementation:**
```typescript
// In useSaveConsultationDraft hook
onMutate: async (newDraft) => {
  // Cancel outgoing refetches
  await queryClient.cancelQueries(['consultation', newDraft.appointmentId]);
  
  // Snapshot
  const previous = queryClient.getQueryData(['consultation', newDraft.appointmentId]);
  
  // Optimistic update
  queryClient.setQueryData(['consultation', newDraft.appointmentId], {
    ...previous,
    notes: mapDraftToNotes(newDraft.notes),
    updatedAt: new Date(), // Optimistic timestamp
  });
  
  return { previous };
},
```

### 3.2 Version Conflict Handling

**Scenario:** Two browser tabs open, both editing same consultation

**Flow:**
1. Tab A saves draft (version token: 2025-01-15T10:00:00Z)
2. Tab B tries to save draft (version token: 2025-01-15T10:00:00Z)
3. Server rejects Tab B (version conflict - Tab A already updated)
4. Tab B receives 409 Conflict
5. Tab B rolls back optimistic update
6. Tab B refetches latest consultation
7. Tab B shows "Consultation was updated. Please refresh."

**Implementation:**
```typescript
onError: (err, variables, context) => {
  // Rollback
  if (context?.previous) {
    queryClient.setQueryData(['consultation', variables.appointmentId], context.previous);
  }
  
  // Handle version conflict
  if (err.code === 'VERSION_CONFLICT') {
    // Refetch latest
    queryClient.invalidateQueries(['consultation', variables.appointmentId]);
    toast.error('Consultation was updated. Please refresh and try again.');
  }
},
```

---

## 4. Error Handling Strategy

### 4.1 Network Errors

**Retry Logic:**
```typescript
{
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  onError: (error) => {
    if (error instanceof NetworkError) {
      toast.error('Network error. Retrying...');
    }
  },
}
```

### 4.2 State Machine Violations

**Example:** Trying to save draft when consultation is COMPLETED

**Handling:**
```typescript
onError: (error) => {
  if (error.message.includes('IN_PROGRESS')) {
    toast.error('Cannot save draft: Consultation is not active.');
    // Refetch to get latest state
    queryClient.invalidateQueries(['consultation', appointmentId]);
  }
},
```

### 4.3 Version Conflicts

**Handling:**
```typescript
onError: (error) => {
  if (error.code === 'VERSION_CONFLICT') {
    // Refetch latest
    queryClient.invalidateQueries(['consultation', appointmentId]);
    toast.error('Consultation was updated. Please refresh and try again.');
  }
},
```

---

## 5. Auto-Save Implementation

### 5.1 Debounced Auto-Save

```typescript
const [notes, setNotes] = useState('');
const saveDraftMutation = useSaveConsultationDraft();

// Debounced auto-save (30 seconds)
const debouncedSave = useMemo(
  () => debounce((notes: string) => {
    if (consultation?.state === ConsultationState.IN_PROGRESS) {
      saveDraftMutation.mutate({
        appointmentId,
        doctorId,
        notes: { rawText: notes },
        versionToken: consultation.updatedAt.toISOString(),
      });
    }
  }, 30000),
  [saveDraftMutation, appointmentId, doctorId, consultation]
);

// Trigger on notes change
useEffect(() => {
  if (notes && consultation?.state === ConsultationState.IN_PROGRESS) {
    debouncedSave(notes);
  }
  
  return () => {
    debouncedSave.cancel();
  };
}, [notes, debouncedSave, consultation]);
```

### 5.2 Auto-Save Indicator

```typescript
const AutoSaveIndicator = () => {
  const { isPending, isSuccess, isError } = saveDraftMutation;
  
  if (isPending) {
    return <span className="text-muted-foreground">Saving...</span>;
  }
  if (isSuccess) {
    return <span className="text-green-600">Saved</span>;
  }
  if (isError) {
    return <span className="text-red-600">Save failed</span>;
  }
  return null;
};
```

---

## 6. Data Transformation

### 6.1 Minimal Transformation

**Principle:** Backend returns data in UI-ready format

**ConsultationResponseDto:**
- Already includes photo counts
- Already includes case plan status
- Already includes structured notes
- Minimal transformation needed

**PatientConsultationHistoryDto:**
- Already sorted chronologically
- Already includes summary statistics
- Already includes photo tracking
- Minimal transformation needed

### 6.2 Derived State

**Compute in components, not in hooks:**
```typescript
// ✅ Good: Compute in component
const isConsultationActive = consultation?.state === ConsultationState.IN_PROGRESS;
const canSaveDraft = isConsultationActive && consultation !== null;
const hasPhotos = (consultation?.photoCount || 0) > 0;

// ❌ Bad: Transform in hook
const transformedConsultation = useMemo(() => {
  // Don't transform - backend already returns UI-ready format
}, [consultation]);
```

---

## 7. Implementation Checklist

- [ ] Create `useConsultation` hook
- [ ] Create `useSaveConsultationDraft` hook
- [ ] Create `usePatientConsultationHistory` hook
- [ ] Implement optimistic updates for draft save
- [ ] Implement version conflict handling
- [ ] Implement debounced auto-save
- [ ] Implement auto-save indicator
- [ ] Add error boundaries
- [ ] Add retry logic
- [ ] Add cache invalidation logic
- [ ] Test network failure scenarios
- [ ] Test version conflict scenarios
- [ ] Test state machine violations

---

## Summary

The React Query hooks strategy prioritizes:
1. **Zero data loss** - Optimistic updates with rollback
2. **Network resilience** - Retry logic, error recovery
3. **State machine fidelity** - UI reflects backend state
4. **Fast doctor scanning** - Minimal transformation, backend-optimized DTOs
5. **Aesthetic surgery context** - Photo tracking, decision status, case plan linkage

The hooks follow established patterns and integrate seamlessly with the existing consultation session UI design.
