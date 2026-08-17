# Frontdesk Surgical Case Scheduling — Implementation Plan

## Objective
Enable frontdesk and theater-tech users to schedule surgical cases directly, bypassing the doctor-confirm auto-creation flow. Support custom typed values for procedure and team fields in addition to select options.

---

## 1. New API Endpoint

**File**: `app/api/frontdesk/surgical-cases/route.ts` (create new)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { SurgicalCaseStatus } from '@prisma/client';
import { createSurgicalCaseFromPatient } from '@/application/services/theater-tech/CreateSurgicalCaseFromPatientService';

export interface ScheduleProcedureRequest {
  patientId: string;
  procedureName: string;
  procedureDate: string;
  urgency: 'ELECTIVE' | 'URGENT' | 'EMERGENCY';
  primarySurgeonDoctorId?: string;
  diagnosis?: string;
  procedureCategory?: string;
  primaryOrRevision?: string;
  admissionType?: string;
  appointmentId?: number;
}

export interface ScheduleProcedureResponse {
  surgicalCaseId: string;
  status: string;
  patientName: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const user = authResult.user;
    if (user.role !== Role.FRONTDESK && user.role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Only frontdesk can schedule procedures' },
        { status: 403 }
      );
    }

    const body: ScheduleProcedureRequest = await request.json();
    const { patientId, procedureName, procedureDate, urgency, primarySurgeonDoctorId, diagnosis, procedureCategory, primaryOrRevision, admissionType, appointmentId } = body;

    if (!patientId || !procedureName || !procedureDate || !urgency) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: patientId, procedureName, procedureDate, urgency' },
        { status: 400 }
      );
    }

    const patient = await db.patient.findUnique({
      where: { id: patientId },
      select: { id: true, first_name: true, last_name: true },
    });

    if (!patient) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }

    if (appointmentId) {
      const existing = await db.surgicalCase.findUnique({
        where: { appointment_id: appointmentId },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json(
          { success: true, data: { surgicalCaseId: existing.id, status: SurgicalCaseStatus.READY_FOR_WARD_PREP, patientName: `${patient.first_name} ${patient.last_name}` } },
          { status: 200 }
        );
      }
    }

    const procedureDateObj = new Date(procedureDate);
    const created = await createSurgicalCaseFromPatient(db, {
      patientId,
      createdByUserId: user.userId,
      primarySurgeonDoctorId,
      appointmentId,
      procedureDate: procedureDateObj,
      procedureName,
      status: SurgicalCaseStatus.READY_FOR_WARD_PREP,
    });

    if (diagnosis || procedureCategory || primaryOrRevision || admissionType) {
      await db.surgicalCase.update({
        where: { id: created.surgicalCaseId },
        data: {
          ...(diagnosis ? { diagnosis } : {}),
          ...(procedureCategory ? { procedure_category: procedureCategory } : {}),
          ...(primaryOrRevision ? { primary_or_revision: primaryOrRevision } : {}),
          ...(admissionType ? { admission_type: admissionType } : {}),
        },
      });
    }

    const patientName = `${patient.first_name} ${patient.last_name}`.trim() || 'Unknown Patient';

    return NextResponse.json(
      {
        success: true,
        data: {
          surgicalCaseId: created.surgicalCaseId,
          status: SurgicalCaseStatus.READY_FOR_WARD_PREP,
          patientName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] POST /api/frontdesk/surgical-cases - Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to schedule procedure' },
      { status: 500 }
    );
  }
}
```

---

## 2. Update Frontdesk API Client

**File**: `lib/api/frontdesk.ts`

Add to the `frontdeskApi` object:

```typescript
/**
 * Schedule a new surgical case from frontdesk
 */
async scheduleSurgicalCase(dto: ScheduleProcedureRequest): Promise<{ success: boolean; data?: ScheduleProcedureResponse; error?: string }> {
    return apiClient.post<ScheduleProcedureResponse>('/frontdesk/surgical-cases', dto);
},
```

Also add the import for the DTO type at the top:
```typescript
export interface ScheduleProcedureRequest {
    patientId: string;
    procedureName: string;
    procedureDate: string;
    urgency: 'ELECTIVE' | 'URGENT' | 'EMERGENCY';
    primarySurgeonDoctorId?: string;
    diagnosis?: string;
    procedureCategory?: string;
    primaryOrRevision?: string;
    admissionType?: string;
    appointmentId?: number;
}

export interface ScheduleProcedureResponse {
    surgicalCaseId: string;
    status: string;
    patientName: string;
}
```

---

## 3. Create ScheduleProcedureDialog

**File**: `components/frontdesk/ScheduleProcedureDialog.tsx` (create new)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { queryKeys } from '@/lib/constants/queryKeys';

interface ScheduleProcedureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ScheduleProcedureDialog({ open, onOpenChange, onSuccess }: ScheduleProcedureDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [customProcedure, setCustomProcedure] = useState('');
  const [customTeamMember, setCustomTeamMember] = useState('');

  const [formData, setFormData] = useState({
    patientId: '',
    procedureName: '',
    procedureDate: format(new Date(), 'yyyy-MM-dd'),
    urgency: 'ELECTIVE' as 'ELECTIVE' | 'URGENT' | 'EMERGENCY',
    primarySurgeonDoctorId: '',
    diagnosis: '',
    procedureCategory: '',
    primaryOrRevision: '',
    admissionType: '',
  });

  useEffect(() => {
    if (open) {
      loadPatients();
      loadDoctors();
    }
  }, [open]);

  const loadPatients = async () => {
    try {
      const response = await frontdeskApi.getPatients({ page: 1, limit: 50, q: searchQuery });
      if (response.success && response.data) {
        setPatients(response.data);
      }
    } catch (error) {
      console.error('Failed to load patients:', error);
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await frontdeskApi.getDoctorsAvailability(new Date(), new Date());
      if (response.success && response.data) {
        setDoctors(response.data);
      }
    } catch (error) {
      console.error('Failed to load doctors:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId || !formData.procedureName || !formData.procedureDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await frontdeskApi.scheduleSurgicalCase({
        ...formData,
        procedureDate: new Date(formData.procedureDate).toISOString(),
      });

      if (response.success && response.data) {
        toast.success(`Surgical case scheduled for ${response.data.patientName}`);
        onOpenChange(false);
        onSuccess?.();
        queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaterQueue() });
        queryClient.invalidateQueries({ queryKey: queryKeys.shared.surgicalCases() });
        resetForm();
      } else {
        toast.error(response.error || 'Failed to schedule procedure');
      }
    } catch (error) {
      toast.error('Failed to schedule procedure');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      procedureName: '',
      procedureDate: format(new Date(), 'yyyy-MM-dd'),
      urgency: 'ELECTIVE',
      primarySurgeonDoctorId: '',
      diagnosis: '',
      procedureCategory: '',
      primaryOrRevision: '',
      admissionType: '',
    });
    setSelectedPatient(null);
    setCustomProcedure('');
    setCustomTeamMember('');
  };

  const handlePatientSelect = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    setSelectedPatient(patient);
    setFormData(prev => ({ ...prev, patientId }));
  };

  const handleProcedureChange = (value: string) => {
    if (value === '__custom__') {
      setFormData(prev => ({ ...prev, procedureName: customProcedure }));
    } else {
      setFormData(prev => ({ ...prev, procedureName: value }));
    }
  };

  const commonProcedures = [
    'Rhinoplasty',
    'Blepharoplasty',
    'Facelift',
    'Liposuction',
    'Breast Augmentation',
    'Tummy Tuck',
    'Liposuction with Fat Transfer',
    'Gynecomastia Surgery',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Procedure</DialogTitle>
          <DialogDescription>
            Create a new surgical case and schedule it for the selected date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient">Patient *</Label>
            <Select value={formData.patientId} onValueChange={handlePatientSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map(patient => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName} {patient.fileNumber ? `(${patient.fileNumber})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPatient && (
              <p className="text-xs text-slate-500">
                {selectedPatient.email} • {selectedPatient.phone || 'No phone'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="procedure">Procedure Name *</Label>
            <Select value={formData.procedureName} onValueChange={handleProcedureChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select or type a procedure" />
              </SelectTrigger>
              <SelectContent>
                {commonProcedures.map(proc => (
                  <SelectItem key={proc} value={proc}>{proc}</SelectItem>
                ))}
                <SelectItem value="__custom__">Custom procedure...</SelectItem>
              </SelectContent>
            </Select>
            {formData.procedureName && !commonProcedures.includes(formData.procedureName) && (
              <Input
                value={customProcedure}
                onChange={(e) => {
                  setCustomProcedure(e.target.value);
                  setFormData(prev => ({ ...prev, procedureName: e.target.value }));
                }}
                placeholder="Enter custom procedure name"
                className="mt-2"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="procedureDate">Procedure Date *</Label>
              <Input
                id="procedureDate"
                type="date"
                value={formData.procedureDate}
                onChange={(e) => setFormData(prev => ({ ...prev, procedureDate: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency *</Label>
              <Select value={formData.urgency} onValueChange={(value: 'ELECTIVE' | 'URGENT' | 'EMERGENCY') => setFormData(prev => ({ ...prev, urgency: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ELECTIVE">Elective</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="surgeon">Primary Surgeon</Label>
            <Select value={formData.primarySurgeonDoctorId} onValueChange={(value) => setFormData(prev => ({ ...prev, primarySurgeonDoctorId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a surgeon" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map(doctor => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name} {doctor.specialization ? `(${doctor.specialization})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Input
              id="diagnosis"
              value={formData.diagnosis}
              onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
              placeholder="Enter diagnosis"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="procedureCategory">Category</Label>
              <Select value={formData.procedureCategory} onValueChange={(value) => setFormData(prev => ({ ...prev, procedureCategory: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COSMETIC">Cosmetic</SelectItem>
                  <SelectItem value="RECONSTRUCTIVE">Reconstructive</SelectItem>
                  <SelectItem value="AESTHETIC">Aesthetic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admissionType">Admission Type</Label>
              <Select value={formData.admissionType} onValueChange={(value) => setFormData(prev => ({ ...prev, admissionType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAYCASE">Daycase</SelectItem>
                  <SelectItem value="OVERNIGHT">Overnight</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling...' : 'Schedule Procedure'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 4. Add Button to Frontdesk Dashboard

**File**: `app/frontdesk/dashboard/FrontdeskDashboardClient.tsx`

Add state and dialog near the top of the component:
```typescript
const [scheduleProcedureOpen, setScheduleProcedureOpen] = useState(false);
```

Add the button in the sidebar (after the "Add Patient to Queue" button):
```typescript
<Button
  onClick={() => setScheduleProcedureOpen(true)}
  className="w-full bg-[#102F52] hover:bg-[#0B2743] text-white font-medium shadow-sm rounded-lg h-9"
>
  <CalendarIcon className="mr-2 h-4 w-4" />
  Schedule Procedure
</Button>
```

Add the dialog at the bottom with other dialogs:
```typescript
<ScheduleProcedureDialog
  open={scheduleProcedureOpen}
  onOpenChange={setScheduleProcedureOpen}
  onSuccess={() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaterQueue() });
    queryClient.invalidateQueries({ queryKey: queryKeys.shared.surgicalCases() });
  }}
/>
```

---

## 5. Add Button to Theater-Tech Dashboard

**File**: `app/theater-tech/dashboard/[caseId]/page.tsx`

Add a "Schedule New Procedure" button at the top of the page, near the back button:
```typescript
<Button variant="default" size="sm" asChild className="hidden">
  <Link href="/frontdesk/theater-scheduling">
    <CalendarIcon className="h-4 w-4 mr-2" />
    Schedule New Procedure
  </Link>
</Button>
```

Note: Theater techs should be redirected to frontdesk scheduling or given their own scheduling interface. For now, the button can link to the frontdesk page if they have access, or we can create a separate theater-tech scheduling page.

---

## 6. Update Theater Scheduling Queue

**File**: `app/api/frontdesk/theater-scheduling/route.ts`

Update the use case call to include more statuses:
```typescript
// Change from READY_FOR_THEATER_BOOKING only to:
const result = await useCase.getSchedulingQueue({ 
  page: safePage, 
  limit: safeLimit,
  statuses: ['READY_FOR_WARD_PREP', 'IN_WARD_PREP', 'READY_FOR_THEATER_BOOKING']
});
```

---

## 7. Remove Doctor-Confirm Auto-Creation

**File**: `app/api/appointments/[id]/confirm/route.ts`

Comment out or remove lines 123-156 (the surgical case auto-creation block):
```typescript
// REMOVED: Doctor confirm no longer auto-creates surgical cases
// Frontdesk now schedules procedures directly via /api/frontdesk/surgical-cases
```

---

## 8. Required Imports

Add to any files that need new components:
```typescript
import { ScheduleProcedureDialog } from '@/components/frontdesk/ScheduleProcedureDialog';
import { CalendarIcon } from 'lucide-react';
```

---

## Testing Checklist

- [ ] Frontdesk can open "Schedule Procedure" dialog from dashboard
- [ ] Theater-tech can access scheduling from their dashboard
- [ ] Custom procedure names can be typed and saved
- [ ] Custom team members can be typed and saved
- [ ] Surgical case is created with READY_FOR_WARD_PREP status
- [ ] Case appears in theater scheduling queue
- [ ] Nurse can see the case in ward prep
- [ ] Doctor-confirm no longer auto-creates cases
- [ ] Existing cases still work normally

---

## Notes

- The `createSurgicalCaseFromPatient` service already handles staff invites and notifications for the primary surgeon
- The theater scheduling queue hook needs updating to accept multiple statuses
- Consider adding a similar scheduling dialog for theater-tech dashboard with pre-populated surgeon/team fields
- The procedure and team fields support both select options and custom typed values
