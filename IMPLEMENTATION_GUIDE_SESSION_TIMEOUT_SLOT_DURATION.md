# Implementation Guide: Consultation Room Critical Fixes

## P0 Priority: Session Timeout & Slot Duration

### 1. Session Heartbeat Implementation

#### Backend: Track Last Activity

**File**: Create `app/api/consultations/[id]/heartbeat/route.ts`

```typescript
/**
 * API Route: POST /api/consultations/:id/heartbeat
 * 
 * Track doctor activity during active consultation.
 * Prevents "abandoned session" limbo.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;
    const appointmentId = parseInt(params.id, 10);

    // 1. Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Update consultation.updated_at to NOW
    const consultation = await db.consultation.update({
      where: { appointment_id: appointmentId },
      data: {
        updated_at: new Date(),
        // Optional: track activity explicitly
        // last_activity_at: new Date(),
      },
      select: { id: true, updated_at: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        lastActivity: consultation.updated_at,
        timeoutIn: 300, // 5 minutes in seconds
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update activity' },
      { status: 500 }
    );
  }
}
```

#### Frontend: Send Heartbeat

**File**: Update `contexts/ConsultationContext.tsx`

```typescript
// Add at the top of ConsultationProvider function:
const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

// Add new effect for heartbeat:
useEffect(() => {
  if (!state.appointment || !isActive) return;

  // Send heartbeat every 30 seconds when consultation is active
  heartbeatIntervalRef.current = setInterval(async () => {
    try {
      await fetch(`/api/consultations/${state.appointment.id}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      // Silently fail — heartbeat is best-effort
      console.debug('Heartbeat failed (connection issue?)', error);
    }
  }, 30000); // Every 30 seconds

  return () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
  };
}, [state.appointment?.id, isActive]);

// Cleanup on unmount:
useEffect(() => {
  return () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
  };
}, []);
```

#### Backend: Auto-Cleanup of Stale Sessions

**File**: Create `lib/services/ConsultationCleanupService.ts`

```typescript
/**
 * Daily cleanup of abandoned consultations.
 * Runs via cron or background job.
 */
export class ConsultationCleanupService {
  static async cleanupAbandonedConsultations() {
    const STALE_THRESHOLD_MINUTES = 60; // 1 hour of inactivity
    const staleDate = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000);

    const abandoned = await db.consultation.findMany({
      where: {
        state: 'IN_PROGRESS',
        updated_at: { lt: staleDate },
        completed_at: null,
      },
      include: {
        appointment: {
          select: {
            id: true,
            patient: { select: { first_name: true, last_name: true } },
          },
        },
      },
    });

    for (const consultation of abandoned) {
      // Mark as abandoned
      await db.consultation.update({
        where: { id: consultation.id },
        data: {
          state: 'ABANDONED',
          completed_at: new Date(),
          outcome_type: 'ABANDONED', // New enum value
        },
      });

      // Mark appointment as completed so queue can move on
      await db.appointment.update({
        where: { id: consultation.appointment_id },
        data: {
          status: 'COMPLETED',
          // Calculate actual duration
          duration_minutes: Math.round(
            (new Date().getTime() - new Date(consultation.started_at!).getTime()) / 60000
          ),
        },
      });

      // Audit log
      await auditService.recordEvent({
        userId: consultation.doctor_id,
        action: 'AUTO_CLEANUP',
        model: 'Consultation',
        recordId: consultation.id.toString(),
        details: `Auto-closed abandoned consultation for ${consultation.appointment?.patient?.first_name}`,
        ipAddress: null,
        sessionId: null,
      });

      console.log(
        `[Cleanup] Marked consultation ${consultation.id} as ABANDONED ` +
        `(no activity for ${STALE_THRESHOLD_MINUTES} minutes)`
      );
    }

    return { cleaned: abandoned.length };
  }
}
```

---

### 2. Slot Duration Aware Timer

#### Frontend: Update ConsultationSessionHeader

**File**: Update `components/consultation/ConsultationSessionHeader.tsx`

```tsx
interface ConsultationSessionHeaderProps {
  patientName: string;
  consultation: ConsultationResponseDto | null;
  appointmentStatus?: string;
  userRole?: Role;
  onSaveDraft: () => void;
  onComplete: () => void;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isSaving?: boolean;
  // NEW:
  slotDurationMinutes?: number; // e.g., 30
  slotStartTime?: string; // ISO date time
}

export function ConsultationSessionHeader({
  patientName,
  consultation,
  appointmentStatus,
  userRole,
  onSaveDraft,
  onComplete,
  autoSaveStatus,
  isSaving = false,
  slotDurationMinutes = 30, // default
  slotStartTime, // NEW
}: ConsultationSessionHeaderProps) {
  const [now, setNow] = useState(new Date());
  const [showOverrunWarning, setShowOverrunWarning] = useState(false);

  useEffect(() => {
    if (!startedAt || !slotStartTime) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [startedAt, slotStartTime]);

  // Calculate slot end time
  const slotEndTime = useMemo(() => {
    if (!slotStartTime || !slotDurationMinutes) return null;
    const start = new Date(slotStartTime);
    const end = new Date(start.getTime() + slotDurationMinutes * 60000);
    return end;
  }, [slotStartTime, slotDurationMinutes]);

  // Calculate elapsed and remaining
  const timing = useMemo(() => {
    if (!startedAt || !slotEndTime) return null;

    const elapsedMs = now.getTime() - new Date(startedAt).getTime();
    const remainingMs = slotEndTime.getTime() - now.getTime();

    const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    const eHours = Math.floor(elapsedSeconds / 3600);
    const eMinutes = Math.floor((elapsedSeconds % 3600) / 60);
    const eSeconds = elapsedSeconds % 60;

    const rMinutes = Math.floor(remainingSeconds / 60);
    const rSeconds = remainingSeconds % 60;

    const isOverrunning = remainingSeconds < 0;
    const overrunSeconds = isOverrunning ? Math.floor(-remainingMs / 1000) : 0;

    return {
      elapsed: eHours > 0 
        ? `${eHours}h ${eMinutes.toString().padStart(2, '0')}m`
        : `${eMinutes}:${eSeconds.toString().padStart(2, '0')}`,
      remaining: isOverrunning
        ? null
        : `${rMinutes}:${rSeconds.toString().padStart(2, '0')}`,
      overrun: isOverrunning
        ? `+${Math.floor(overrunSeconds / 60)}:${(overrunSeconds % 60).toString().padStart(2, '0')}`
        : null,
      percentUsed: Math.round((elapsedSeconds / (slotDurationMinutes * 60)) * 100),
      isWarning: !isOverrunning && rMinutes <= 5,
      isOverrunning,
    };
  }, [startedAt, slotEndTime, now, slotDurationMinutes]);

  if (!timing) return null;

  return (
    <header className="border-b border-slate-200 bg-white/70 backdrop-blur-xl">
      {/* ... existing header content ... */}
      
      {/* Enhanced timer section */}
      <div className="flex items-center gap-3 mt-0.5">
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5"
        >
          {/* Elapsed time */}
          <span className="text-[11px] font-medium text-slate-500">
            {timing.elapsed}
          </span>

          {/* Remaining or overrun */}
          {timing.remaining && (
            <>
              <span className="text-slate-300">/</span>
              <span className={cn(
                "text-[11px] font-medium",
                timing.isWarning ? "text-amber-600" : "text-slate-500"
              )}>
                {timing.remaining}
              </span>
            </>
          )}

          {timing.overrun && (
            <>
              <span className="text-slate-300">/</span>
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                OVERRUN {timing.overrun}
              </Badge>
            </>
          )}
        </motion.div>

        {/* Progress bar */}
        <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            layoutId="timer-progress"
            className={cn(
              "h-full rounded-full transition-colors",
              timing.isOverrunning
                ? "bg-red-500"
                : timing.isWarning
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            )}
            style={{ width: `${Math.min(timing.percentUsed, 100)}%` }}
          />
        </div>

        <AutoSaveIndicator status={autoSaveStatus} isSaving={isSaving} />
      </div>

      {/* Overrun warning modal */}
      {timing.isOverrunning && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2 bg-red-50 border-b border-red-200 text-center"
        >
          <p className="text-sm font-semibold text-red-700">
            ⚠️ Consultation is running {timing.overrun} over scheduled time.
            <Button
              size="sm"
              variant="link"
              onClick={onComplete}
              className="text-red-700 underline"
            >
              Complete now
            </Button>
          </p>
        </motion.div>
      )}

      {timing.isWarning && !timing.isOverrunning && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-center"
        >
          <p className="text-xs font-medium text-amber-700">
            📍 {timing.remaining} remaining — wrap up consultation
          </p>
        </motion.div>
      )}
    </header>
  );
}
```

#### Update Consumption: ConsultationSessionPage

**File**: Update `app/doctor/consultations/[appointmentId]/session/page.tsx`

```tsx
<ConsultationSessionHeader
  patientName={patientName}
  consultation={consultation}
  appointmentStatus={appointment?.status}
  userRole={Role.DOCTOR}
  onSaveDraft={saveDraft}
  onComplete={openCompleteDialog}
  autoSaveStatus={autoSaveStatus}
  isSaving={isSaving}
  slotDurationMinutes={appointment?.slot_duration || 30} // ADD THIS
  slotStartTime={
    appointment?.slot_start_time
      ? new Date(appointment.slot_start_time).toISOString()
      : undefined // ADD THIS
  }
/>
```

---

### 3. Queue Patient Switch Safety

#### Update ConsultationContext

**File**: Update `contexts/ConsultationContext.tsx`

```typescript
const switchToPatient = useCallback(async (appointmentId: number) => {
  // If there are unsaved changes, save them first
  if (state.workflow.isDirty) {
    try {
      // Show saving toast
      toast.loading('Saving notes...');
      
      // Wait for save to complete
      await new Promise<void>((resolve) => {
        // Use mutation's onSuccess callback
        saveDraftMutation.mutate(
          {
            appointmentId: state.appointment!.id,
            doctorId: state.doctorId!,
            notes: {
              rawText: generateFullText(state.notes),
              structured: state.notes,
            },
          },
          {
            onSuccess: () => {
              toast.dismiss(); // Clear loading toast
              toast.success('Notes saved');
              resolve();
            },
            onError: (error) => {
              toast.dismiss();
              // Ask user: continue anyway?
              const shouldContinue = confirm(
                'Failed to save notes. Continue to next patient?'
              );
              if (shouldContinue) {
                resolve();
              } else {
                throw error;
              }
            },
          }
        );
      });
    } catch (error) {
      console.error('Failed to save before switch:', error);
      return; // Don't switch if save failed and user said no
    }
  }

  // Now safe to switch
  await loadAppointment(appointmentId);
}, [state.workflow.isDirty, state.notes, state.appointment, state.doctorId, saveDraftMutation, loadAppointment]);
```

#### Add Confirmation Modal

**File**: Create `components/consultation/PatientSwitchConfirmation.tsx`

```tsx
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle } from 'lucide-react';

interface PatientSwitchConfirmationProps {
  open: boolean;
  currentPatient: string;
  nextPatient: string;
  hasUnsavedChanges: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PatientSwitchConfirmation({
  open,
  currentPatient,
  nextPatient,
  hasUnsavedChanges,
  onConfirm,
  onCancel,
  isLoading = false,
}: PatientSwitchConfirmationProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Switch to Next Patient?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              You are currently with <strong>{currentPatient}</strong>
            </p>
            {hasUnsavedChanges && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-900">
                  ⚠️ You have unsaved notes which will be saved before switching.
                </p>
              </div>
            )}
            <p>
              Ready to see <strong>{nextPatient}</strong>?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-3 justify-end">
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            {isLoading ? 'Switching...' : 'Switch to Next'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## Database Migration Required

Add new enum value for `ConsultationState`:

```sql
-- Add new state to consultation_state enum
ALTER TYPE "ConsultationState" ADD VALUE 'ABANDONED' AFTER 'COMPLETED';

-- Add new outcome type value
ALTER TYPE "ConsultationOutcomeType" ADD VALUE 'ABANDONED' AFTER 'REFERRAL_NEEDED';

-- Create index for cleanup queries
CREATE INDEX idx_consultation_state_updated_at 
ON "Consultation"(state, updated_at) 
WHERE state = 'IN_PROGRESS';
```

---

## Testing Checklist

### Unit Tests
- [ ] `ConsultationCleanupService.cleanupAbandonedConsultations()`
- [ ] Timer calculation logic (remaining time)
- [ ] Slot duration edge cases

### Integration Tests
- [ ] POST `/api/consultations/{id}/heartbeat` works
- [ ] Abandoned consultation marked after timeout
- [ ] Patient switch saves notes before loading new patient

### E2E Tests
- [ ] Doctor starts session → timer shows remaining time
- [ ] Doctor exceeds slot → warning appears
- [ ] Doctor switches patient → notes auto-save
- [ ] Session abandoned → next patient can start

---

## Rollout Plan

**Phase 1 (Week 1):**
- Deploy heartbeat infrastructure (backend only)
- No UI changes yet (feature hidden)
- Monitor abandoned session rates

**Phase 2 (Week 2):**
- Deploy slot-aware timer UI
- Test with 5-10 doctors
- Collect feedback on warnings

**Phase 3 (Week 3):**
- Deploy cleanup service (runs 2x daily)
- Train doctors on new timer behavior
- Monitor for issues

**Phase 4 (Week 4):**
- Deploy queue switch safety
- Full rollout to all doctors
- Monitor production metrics

---

## Metrics to Track

```
Key Metrics:
- Average consultation duration vs. slot duration
- % consultations exceeding slot
- Average overrun time (when exceeded)
- Abandoned consultation cleanup count
- Doctor satisfaction with timer
- Queue throughput improvement
```

