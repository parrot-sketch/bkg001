# Doctor Schedule Integration - Implementation Checklist

**Project:** Solid Integration Between Doctor Schedule and Appointment Workflow  
**Status:** Planning & Design Complete | Implementation Ready  
**Priority:** CRITICAL - Foundation for clinic operations

---

## IMPLEMENTATION PHASES

### PHASE 1: FIX CRITICAL ISSUES (2-3 hours) ⭐ START HERE

#### Task 1.1: Change Appointment Status on Creation
**File:** `application/use-cases/ScheduleAppointmentUseCase.ts`  
**Line:** 145  

**Current Code:**
```typescript
const appointment = ApplicationAppointmentMapper.fromScheduleDto(
  dto,
  AppointmentStatus.PENDING,  // ← WRONG
  0,
);
```

**Change To:**
```typescript
const appointment = ApplicationAppointmentMapper.fromScheduleDto(
  dto,
  AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,  // ← CORRECT
  0,
);
```

**Why:** Ensures doctor explicitly confirms before time slot is locked.  
**Validation:** Run TypeScript compiler → Should have zero errors  
**Testing:** Create appointment via `/api/appointments` → Check database status

**Checklist:**
- [ ] Locate exact line in ScheduleAppointmentUseCase.ts
- [ ] Change `AppointmentStatus.PENDING` to `AppointmentStatus.PENDING_DOCTOR_CONFIRMATION`
- [ ] Save file
- [ ] Run: `npm run type-check` (verify no TypeScript errors)
- [ ] Test in database: Query newly created appointment → verify status

---

#### Task 1.2: Add Doctor Notification on Appointment Schedule
**File:** `application/use-cases/ScheduleAppointmentUseCase.ts`  
**Location:** After appointment is saved, before returning (around line 200-210)

**Add Code:**
```typescript
// Step 9: SEND DOCTOR NOTIFICATION (NEW)
// Doctor needs to know about pending confirmation
const doctor = await this.prisma.doctor.findUnique({
  where: { id: dto.doctorId },
  select: { 
    user_id: true,
    name: true,
  },
});

if (doctor?.user_id) {
  // Get doctor's email from user record
  const doctorUser = await this.prisma.user.findUnique({
    where: { id: doctor.user_id },
    select: { email: true },
  });

  if (doctorUser?.email) {
    await this.notificationService.sendEmail(
      doctorUser.email,
      'New Appointment Pending Your Confirmation',
      `
        Dear Dr. ${doctor.name},
        
        A new appointment has been scheduled pending your confirmation:
        
        Patient: ${patient.firstName} ${patient.lastName}
        Date: ${format(dto.appointmentDate, 'MMM dd, yyyy')}
        Time: ${dto.time}
        Type: ${dto.type}
        
        Please review and confirm or reject within 24 hours.
        
        Thank you,
        Healthcare Team
      `
    );
  }
}
```

**Why:** Doctor needs to know they have pending confirmations to review.  
**Dependencies:** Uses existing `notificationService` and `prisma` client  
**Testing:**
- [ ] Schedule appointment via API
- [ ] Check doctor's email inbox (or test email log)
- [ ] Verify email contains patient name, date, time

---

#### Task 1.3: Verify Enum Has PENDING_DOCTOR_CONFIRMATION Status
**File:** `domain/enums/AppointmentStatus.ts`

**Check Exists:**
```typescript
export enum AppointmentStatus {
  PENDING = 'PENDING',
  PENDING_DOCTOR_CONFIRMATION = 'PENDING_DOCTOR_CONFIRMATION',  // ← Should exist
  SCHEDULED = 'SCHEDULED',
  CHECKED_IN = 'CHECKED_IN',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}
```

**Checklist:**
- [ ] Open `domain/enums/AppointmentStatus.ts`
- [ ] Search for `PENDING_DOCTOR_CONFIRMATION`
- [ ] Verify it exists in the enum
- [ ] If missing, add it after `PENDING`

---

#### Task 1.4: Update Frontend API Client
**File:** `lib/api/frontdesk.ts`

**Add/Verify Method Exists:**
```typescript
/**
 * Schedule an appointment for a patient
 * Creates appointment with PENDING_DOCTOR_CONFIRMATION status
 */
async scheduleAppointment(dto: {
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  time: string;
  type: string;
  note?: string;
}): Promise<ApiResponse<AppointmentResponseDto>> {
  return apiClient.post('/appointments', {
    patientId: dto.patientId,
    doctorId: dto.doctorId,
    appointmentDate: dto.appointmentDate,
    time: dto.time,
    type: dto.type,
    note: dto.note,
  });
}
```

**Checklist:**
- [ ] Open `lib/api/frontdesk.ts`
- [ ] Verify method exists (search for `scheduleAppointment`)
- [ ] If missing, add it to the frontdeskApi object
- [ ] Verify signature matches implementation

---

### PHASE 2: CREATE ENHANCED SCHEDULE DIALOG (4-6 hours)

#### Task 2.1: Create ScheduleAppointmentDialog Component
**File:** Create `components/frontdesk/ScheduleAppointmentDialog.tsx`

**Features:**
- Doctor selector with search/filter
- Date picker (calendar)
- Real-time slot loading
- Time slot grid display
- Appointment type selector
- Notes field (optional)
- [Schedule] button

**Structure:**
```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { useAvailableSlots } from '@/hooks/useAvailableSlots';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { toast } from 'sonner';

interface ScheduleAppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess?: (appointment: AppointmentResponseDto) => void;
}

export function ScheduleAppointmentDialog({
  open,
  onClose,
  patientId,
  onSuccess,
}: ScheduleAppointmentDialogProps) {
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState<string>('SURGICAL_CONSULTATION');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Load doctors on mount
  useEffect(() => {
    const loadDoctors = async () => {
      setLoadingDoctors(true);
      // TODO: Add endpoint to get all doctors
      // For now, can use available doctors from another API
      setLoadingDoctors(false);
    };
    if (open) loadDoctors();
  }, [open]);

  // Load available slots when doctor/date changes
  const { slots, loading: slotsLoading } = useAvailableSlots({
    doctorId: selectedDoctor,
    date: selectedDate,
    enabled: !!selectedDoctor && !!selectedDate,
  });

  const handleSchedule = async () => {
    // Validation
    if (!selectedDoctor) {
      toast.error('Please select a doctor');
      return;
    }
    if (!selectedSlot) {
      toast.error('Please select a time slot');
      return;
    }

    setLoading(true);
    try {
      const response = await frontdeskApi.scheduleAppointment({
        patientId,
        doctorId: selectedDoctor,
        appointmentDate: selectedDate,
        time: selectedSlot,
        type: appointmentType,
        note: notes || undefined,
      });

      if (response.success && response.data) {
        toast.success('Appointment scheduled! Doctor will confirm within 24 hours.');
        onSuccess?.(response.data);
        onClose();
      } else {
        toast.error(response.error || 'Failed to schedule appointment');
      }
    } catch (error) {
      toast.error('An error occurred while scheduling');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Doctor Selection */}
          <div>
            <label className="text-sm font-medium">Doctor</label>
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger>
                <SelectValue placeholder="Select a doctor..." />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          {selectedDoctor && (
            <div>
              <label className="text-sm font-medium">Date</label>
              <Calendar
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date || new Date());
                  setSelectedSlot(''); // Reset slot when date changes
                }}
                disabled={(date) => date < new Date()}
              />
            </div>
          )}

          {/* Time Slot Selection */}
          {selectedDoctor && selectedDate && (
            <div>
              <label className="text-sm font-medium">Time Slot</label>
              {slotsLoading ? (
                <p className="text-sm text-muted-foreground">Loading available slots...</p>
              ) : slots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <Button
                      key={slot.startTime}
                      variant={selectedSlot === slot.startTime ? 'default' : 'outline'}
                      onClick={() => setSelectedSlot(slot.startTime)}
                      className="text-sm"
                    >
                      {slot.startTime}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No available slots on this date. Please select another date.
                </p>
              )}
            </div>
          )}

          {/* Appointment Type */}
          <div>
            <label className="text-sm font-medium">Appointment Type</label>
            <Select value={appointmentType} onValueChange={setAppointmentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SURGICAL_CONSULTATION">Surgical Consultation</SelectItem>
                <SelectItem value="PRE_OP_ASSESSMENT">Pre-op Assessment</SelectItem>
                <SelectItem value="POST_OP_FOLLOWUP">Post-op Follow-up</SelectItem>
                <SelectItem value="CHECKUP">General Checkup</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special notes or requirements..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={loading || !selectedDoctor || !selectedSlot}
            >
              {loading ? 'Scheduling...' : 'Schedule Appointment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Checklist:**
- [ ] Create file at `components/frontdesk/ScheduleAppointmentDialog.tsx`
- [ ] Implement all UI elements
- [ ] Test doctor selector loads doctors
- [ ] Test date picker updates
- [ ] Test slot loading when doctor/date changes
- [ ] Test appointment scheduling API call
- [ ] Test error handling and validation

---

#### Task 2.2: Integrate into ReviewConsultationDialog
**File:** `components/frontdesk/ReviewConsultationDialog.tsx`

**Add:**
```typescript
import { ScheduleAppointmentDialog } from './ScheduleAppointmentDialog';

// In component state:
const [showScheduleDialog, setShowScheduleDialog] = useState(false);

// In action buttons (when action === 'approve'):
<Button
  variant="default"
  onClick={() => setShowScheduleDialog(true)}
>
  Schedule Appointment
</Button>

// Add dialog near the end:
{showScheduleDialog && (
  <ScheduleAppointmentDialog
    open={showScheduleDialog}
    onClose={() => setShowScheduleDialog(false)}
    patientId={selectedAppointment?.patientId || ''}
    onSuccess={(appointment) => {
      handleReviewSuccess();
      setShowScheduleDialog(false);
    }}
  />
)}
```

**Checklist:**
- [ ] Import ScheduleAppointmentDialog
- [ ] Add state for showing dialog
- [ ] Add button to open dialog (only for APPROVED status)
- [ ] Render dialog component
- [ ] Test dialog opens/closes
- [ ] Test appointment creation through dialog

---

### PHASE 3: CREATE DOCTOR PENDING CONFIRMATIONS (3-4 hours)

#### Task 3.1: Create PendingAppointmentsList Component
**File:** Create `components/doctor/PendingAppointmentsList.tsx`

**Features:**
- List appointments with PENDING_DOCTOR_CONFIRMATION status
- Show patient name, date, time, appointment type
- [CONFIRM] and [REJECT] buttons
- Rejection reason dialog
- Loading and empty states
- Auto-refresh capability

**Implementation:**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Clock, User, AlertCircle } from 'lucide-react';
import { doctorApi } from '@/lib/api/doctor';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface PendingAppointmentsListProps {
  onConfirm?: () => void;
}

export function PendingAppointmentsList({ onConfirm }: PendingAppointmentsListProps) {
  const [appointments, setAppointments] = useState<AppointmentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const loadPendingAppointments = async () => {
    setLoading(true);
    try {
      const response = await doctorApi.getPendingAppointments();
      if (response.success && response.data) {
        // Filter for PENDING_DOCTOR_CONFIRMATION status
        const pending = response.data.filter(
          (apt) => apt.status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION
        );
        setAppointments(pending);
      }
    } catch (error) {
      console.error('Failed to load pending appointments:', error);
      toast.error('Failed to load pending appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingAppointments();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadPendingAppointments, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleConfirm = async (appointmentId: number) => {
    setConfirming(true);
    try {
      const response = await doctorApi.confirmAppointment(appointmentId, 'confirm');
      if (response.success) {
        toast.success('Appointment confirmed!');
        setAppointments((prev) => prev.filter((a) => a.id !== appointmentId));
        onConfirm?.();
      } else {
        toast.error(response.error || 'Failed to confirm appointment');
      }
    } catch (error) {
      console.error('Error confirming appointment:', error);
      toast.error('An error occurred while confirming');
    } finally {
      setConfirming(false);
    }
  };

  const handleRejectClick = (appointmentId: number) => {
    setSelectedId(appointmentId);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const handleReject = async () => {
    if (!selectedId) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setRejecting(true);
    try {
      const response = await doctorApi.confirmAppointment(selectedId, 'reject', {
        rejectionReason,
      });
      if (response.success) {
        toast.success('Appointment rejected. Patient has been notified.');
        setAppointments((prev) => prev.filter((a) => a.id !== selectedId));
        setShowRejectDialog(false);
        onConfirm?.();
      } else {
        toast.error(response.error || 'Failed to reject appointment');
      }
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      toast.error('An error occurred while rejecting');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Confirmations</CardTitle>
              <CardDescription>
                {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} awaiting
                your confirmation
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadPendingAppointments} disabled={loading}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No pending confirmations</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Patient Info */}
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <p className="font-semibold truncate">
                          {appointment.patientId}
                        </p>
                      </div>

                      {/* Date/Time */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {format(new Date(appointment.appointmentDate), 'MMM dd, yyyy')} at{' '}
                          {appointment.time}
                        </span>
                      </div>

                      {/* Type */}
                      <p className="text-sm text-muted-foreground">
                        Type: {appointment.type}
                      </p>

                      {/* Note if exists */}
                      {appointment.note && (
                        <p className="text-sm mt-2 text-foreground italic">
                          Note: {appointment.note}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleConfirm(appointment.id)}
                        disabled={confirming}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectClick(appointment.id)}
                        disabled={rejecting}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Appointment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this appointment. The patient will be notified.
            </p>

            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Doctor is out of country, Date conflicts with surgery, etc."
              rows={4}
            />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(false)}
                disabled={rejecting}
              >
                Cancel
              </Button>
              <Button onClick={handleReject} disabled={rejecting || !rejectionReason.trim()}>
                {rejecting ? 'Rejecting...' : 'Reject Appointment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

**Checklist:**
- [ ] Create file at `components/doctor/PendingAppointmentsList.tsx`
- [ ] Implement list UI with appointment details
- [ ] Add confirm button functionality
- [ ] Add reject button with reason dialog
- [ ] Test loading pending appointments
- [ ] Test confirm action
- [ ] Test reject action with reason
- [ ] Test error handling and notifications

---

#### Task 3.2: Integrate into Doctor Dashboard
**File:** Update relevant doctor dashboard/appointments page

**Add:**
```typescript
import { PendingAppointmentsList } from '@/components/doctor/PendingAppointmentsList';

// In doctor dashboard or appointments page:
<PendingAppointmentsList
  onConfirm={() => {
    // Refresh any other dashboard data if needed
    refetchAppointments?.();
  }}
/>
```

**Checklist:**
- [ ] Find doctor dashboard/appointments page
- [ ] Import PendingAppointmentsList
- [ ] Add component to render
- [ ] Test component displays
- [ ] Test confirm/reject actions work

---

### PHASE 4: UPDATE DOCTOR API CLIENT (1 hour)

#### Task 4.1: Add getPendingAppointments Method
**File:** `lib/api/doctor.ts`

**Add:**
```typescript
/**
 * Get pending appointments awaiting confirmation
 * Returns appointments with PENDING_DOCTOR_CONFIRMATION status
 */
async getPendingAppointments(): Promise<ApiResponse<AppointmentResponseDto[]>> {
  return apiClient.get<AppointmentResponseDto[]>(
    '/appointments?status=PENDING_DOCTOR_CONFIRMATION&role=doctor'
  );
}
```

**Checklist:**
- [ ] Open `lib/api/doctor.ts`
- [ ] Add getPendingAppointments method
- [ ] Verify confirmAppointment method exists (from earlier tasks)
- [ ] Test both methods compile without errors

---

### PHASE 5: UPDATE PATIENT APPOINTMENT DISPLAY (2-3 hours)

#### Task 5.1: Update AppointmentCard Component
**File:** `components/patient/AppointmentCard.tsx`

**Add Status Display Logic:**
```typescript
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

// In component render:
{appointment.status === AppointmentStatus.PENDING_DOCTOR_CONFIRMATION && (
  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
    <Clock className="h-4 w-4 text-yellow-600" />
    <div>
      <p className="font-medium text-yellow-900">Pending Doctor Confirmation</p>
      <p className="text-sm text-yellow-700">
        We're awaiting your doctor's confirmation. You'll receive an email once confirmed.
      </p>
    </div>
  </div>
)}

{appointment.status === AppointmentStatus.SCHEDULED && (
  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
    <CheckCircle className="h-4 w-4 text-green-600" />
    <div>
      <p className="font-medium text-green-900">Appointment Confirmed</p>
      <p className="text-sm text-green-700">
        Your appointment has been confirmed. See you on {format(new Date(appointment.appointmentDate), 'MMM dd')}!
      </p>
    </div>
  </div>
)}

{appointment.status === AppointmentStatus.CANCELLED && (
  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
    <XCircle className="h-4 w-4 text-red-600" />
    <div>
      <p className="font-medium text-red-900">Appointment Cancelled</p>
      <p className="text-sm text-red-700">
        This appointment has been cancelled. Please contact us to reschedule.
      </p>
    </div>
  </div>
)}
```

**Checklist:**
- [ ] Open `components/patient/AppointmentCard.tsx`
- [ ] Add status-specific display for PENDING_DOCTOR_CONFIRMATION
- [ ] Add status display for SCHEDULED
- [ ] Add status display for CANCELLED
- [ ] Test all status displays
- [ ] Verify styling matches design system

---

### PHASE 6: INTEGRATION TESTING (2-3 hours)

#### Test Case 1: End-to-End Appointment Scheduling
```
Steps:
1. [ ] Patient submits consultation inquiry
2. [ ] Frontdesk approves consultation
3. [ ] Frontdesk opens Schedule Appointment dialog
4. [ ] Select doctor, date, time slot
5. [ ] Click Schedule
6. [ ] Verify appointment created with PENDING_DOCTOR_CONFIRMATION status
7. [ ] Verify doctor receives email notification
8. [ ] Verify patient sees pending status
```

#### Test Case 2: Doctor Confirmation
```
Steps:
1. [ ] Doctor logs in to dashboard
2. [ ] Sees Pending Confirmations section
3. [ ] Reviews appointment details
4. [ ] Clicks [CONFIRM]
5. [ ] Verify status changes to SCHEDULED
6. [ ] Verify time slot becomes unavailable
7. [ ] Verify patient receives confirmation email
```

#### Test Case 3: Doctor Rejection
```
Steps:
1. [ ] Doctor logs in to dashboard
2. [ ] Sees Pending Confirmations section
3. [ ] Clicks [REJECT]
4. [ ] Enters rejection reason
5. [ ] Clicks [Reject Appointment]
6. [ ] Verify status changes to CANCELLED
7. [ ] Verify time slot becomes available again
8. [ ] Verify patient receives cancellation email with reason
```

#### Test Case 4: Slot Availability
```
Steps:
1. [ ] Schedule appointment for Dr. Smith at 14:00 on Jan 26
2. [ ] Verify 14:00 slot is no longer available
3. [ ] Open schedule dialog for another patient
4. [ ] Select Dr. Smith, Jan 26
5. [ ] Verify 14:00 slot is NOT shown (already booked)
6. [ ] Verify other slots are available
```

#### Test Case 5: Error Scenarios
```
Steps:
1. [ ] Try to book past date → Error
2. [ ] Try to book unavailable doctor → Error
3. [ ] Try to book non-existent patient → Error
4. [ ] Try to reject without reason → Error
5. [ ] Network failure during booking → Proper error message
```

---

## VALIDATION CHECKLIST

### Code Quality
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No console errors in browser
- [ ] Proper error handling in all API calls
- [ ] Input validation on all forms

### Functionality
- [ ] Appointments created with correct status
- [ ] Doctor notifications sent
- [ ] Confirmation workflow works
- [ ] Time slots properly locked/freed
- [ ] Patient sees correct status

### User Experience
- [ ] Clear status messages
- [ ] Intuitive dialog flows
- [ ] Loading states visible
- [ ] Error messages helpful
- [ ] Mobile responsive

### Database
- [ ] Appointments have correct status
- [ ] Audit logs record all actions
- [ ] No data inconsistencies
- [ ] Indexes perform well

---

## ROLL OUT PLAN

### Step 1: Deploy Phase 1 (Fix + Notifications) - CRITICAL PATH
- Estimate: 2-3 hours development + testing
- Risk: Low (internal logic change)
- Rollback: Simple revert
- Monitor: Check appointment creation in production

### Step 2: Deploy Phase 2 (Schedule Dialog)
- Estimate: 4-6 hours development + testing
- Risk: Medium (new UI component)
- Rollback: Hide dialog, use simple input for now
- Monitor: Check slot loading and API calls

### Step 3: Deploy Phase 3 (Doctor Confirmations)
- Estimate: 3-4 hours development + testing
- Risk: Medium (new doctor workflow)
- Rollback: Hide pending section temporarily
- Monitor: Check confirmation API calls and email notifications

### Step 4: Deploy Phase 4-6 (API + Display Updates)
- Estimate: 3 hours development + testing
- Risk: Low (mostly display updates)
- Rollback: Simple CSS/display toggle
- Monitor: Check patient status displays

---

## SUCCESS CRITERIA

✅ **Critical Success Factors:**
- [ ] Frontdesk can book appointments with real-time availability
- [ ] Doctor receives email notification for each pending appointment
- [ ] Doctor can confirm/reject appointments from dashboard
- [ ] Time slot locked only after doctor confirms
- [ ] Patient sees clear status throughout journey
- [ ] Complete audit trail of all actions
- [ ] Zero double-booking issues

✅ **Quality Metrics:**
- [ ] Zero TypeScript compilation errors
- [ ] All tests passing
- [ ] <200ms API response times
- [ ] <100ms slot loading on fast network
- [ ] Mobile-responsive on all components
- [ ] Accessible (WCAG AA standards)

---

## SUMMARY

**Total Estimated Time:** 15-20 hours  
**Complexity:** Medium (requires coordination of multiple layers)  
**Risk:** Low-Medium (well-defined scope, clear acceptance criteria)  
**Value:** HIGH (core clinic operation depends on this)  

**Critical Path Order:**
1. Phase 1: Fix status + doctor notifications (MUST DO FIRST)
2. Phase 2: Enhanced schedule dialog (blocks Phase 3 usage)
3. Phase 3: Doctor confirmations (blocked by Phase 1)
4. Phase 4-6: Integration + display (lower priority)

**Next Step:** Start with Phase 1 Task 1.1

