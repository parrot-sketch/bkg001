'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, subDays, isBefore, startOfDay } from 'date-fns';
import { ClipboardList, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PatientCombobox } from '@/components/frontdesk/PatientCombobox';
import { patientApi } from '@/lib/api/patient';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { PAST_VISIT_MAX_DAYS } from '@/application/dtos/RecordPastVisitRequest';
import { queryKeys } from '@/lib/constants/queryKeys';

interface RecordPastVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPatientId?: string | null;
  initialPatientName?: string | null;
  /** Prefer this when it falls inside the allowed past window */
  preferredDate?: Date;
  onSuccess?: (visitDate: Date) => void;
}

const APPOINTMENT_TYPES = [
  'Initial Consultation',
  'Follow-up',
  'Routine Checkup',
  'Procedure',
  'Emergency',
  'Other',
] as const;

function toDateInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function defaultPastDate(preferred?: Date): Date {
  const today = startOfDay(new Date());
  const earliest = subDays(today, PAST_VISIT_MAX_DAYS);
  const yesterday = subDays(today, 1);

  if (preferred) {
    const preferredDay = startOfDay(preferred);
    if (isBefore(preferredDay, today) && !isBefore(preferredDay, earliest)) {
      return preferredDay;
    }
  }
  return yesterday;
}

export function RecordPastVisitDialog({
  open,
  onOpenChange,
  initialPatientId,
  initialPatientName,
  preferredDate,
  onSuccess,
}: RecordPastVisitDialogProps) {
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [visitDate, setVisitDate] = useState(() => toDateInputValue(defaultPastDate(preferredDate)));
  const [visitTime, setVisitTime] = useState('10:00');
  const [type, setType] = useState<string>('Initial Consultation');
  const [lateEntryNote, setLateEntryNote] = useState('');
  const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minDate = useMemo(
    () => toDateInputValue(subDays(startOfDay(new Date()), PAST_VISIT_MAX_DAYS)),
    [],
  );
  const maxDate = useMemo(
    () => toDateInputValue(subDays(startOfDay(new Date()), 1)),
    [],
  );

  useEffect(() => {
    if (!open) return;

    setVisitDate(toDateInputValue(defaultPastDate(preferredDate)));
    setVisitTime('10:00');
    setType('Initial Consultation');
    setLateEntryNote('');
    setSelectedDoctorId('');

    if (initialPatientId) {
      setSelectedPatient({
        id: initialPatientId,
        firstName: initialPatientName?.split(' ')[0] || '',
        lastName: initialPatientName?.split(' ').slice(1).join(' ') || '',
        fileNumber: '',
        fullName: initialPatientName || '',
        dateOfBirth: new Date(),
        age: 0,
        gender: '',
        email: '',
        phone: '',
        address: '',
        maritalStatus: '',
        emergencyContactName: '',
        emergencyContactNumber: '',
        relation: '',
        hasPrivacyConsent: true,
        hasServiceConsent: true,
        hasMedicalConsent: true,
      } as PatientResponseDto);
    } else {
      setSelectedPatient(null);
    }
  }, [open, initialPatientId, initialPatientName, preferredDate]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    async function fetchDoctors() {
      setLoadingDoctors(true);
      try {
        const response = await patientApi.getAllDoctors();
        if (!cancelled && response.success && response.data) {
          setDoctors(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch doctors:', error);
      } finally {
        if (!cancelled) setLoadingDoctors(false);
      }
    }
    void fetchDoctors();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return;
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }
    if (!selectedDoctorId) {
      toast.error('Please select a doctor');
      return;
    }
    if (!visitDate || !visitTime) {
      toast.error('Please choose the visit date and time');
      return;
    }
    if (!type) {
      toast.error('Please select an appointment type');
      return;
    }
    if (lateEntryNote.trim().length < 5) {
      toast.error('Please explain why this visit is being recorded late');
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedTime = visitTime.length === 5 ? visitTime : visitTime.slice(0, 5);
      const result = await frontdeskApi.recordPastVisit({
        patientId: selectedPatient.id,
        doctorId: selectedDoctorId,
        appointmentDate: visitDate,
        time: normalizedTime,
        type,
        lateEntryNote: lateEntryNote.trim(),
      });

      if (!result.success) {
        toast.error(result.error || 'Could not record past visit.');
        return;
      }

      const recordedDate = new Date(`${visitDate}T12:00:00`);
      toast.success('Past visit recorded as completed.');
      onOpenChange(false);
      onSuccess?.(recordedDate);
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments.list() });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.byDate(visitDate),
      });
    } catch (error) {
      console.error('Failed to record past visit:', error);
      toast.error('An error occurred while recording the past visit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md animate-in fade-in-0 zoom-in-95 duration-200 bg-white border border-[#e7d6bf] border-t-4 border-t-[#005f73]">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-[#2c2e4b]">
            <div className="h-8 w-8 rounded-lg bg-[#005f73]/10 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-[#005f73]" />
            </div>
            Record past visit
          </DialogTitle>
          <DialogDescription className="text-xs text-[#2c2e4b]/60">
            For visits that already happened but were never entered. Creates a completed
            record for the last {PAST_VISIT_MAX_DAYS} days — no queue, no doctor confirmation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#2c2e4b]">Patient</Label>
            <PatientCombobox
              value={selectedPatient?.id || ''}
              onSelect={(_patientId, patient) => {
                setSelectedPatient(patient || null);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#2c2e4b]">Doctor</Label>
            <select
              className="w-full h-9 px-3 rounded-lg border border-[#e7d6bf] bg-white text-sm text-[#2c2e4b] focus:outline-none focus:ring-2 focus:ring-[#caa26a]/30 focus:border-[#caa26a]"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              disabled={loadingDoctors}
            >
              <option value="">{loadingDoctors ? 'Loading...' : 'Select doctor'}</option>
              {doctors.map((doctor) => {
                const docName = doctor.name || `${doctor.firstName} ${doctor.lastName}`;
                const displayName =
                  doctor.title && !docName.toLowerCase().startsWith(doctor.title.toLowerCase())
                    ? `${doctor.title} ${docName}`
                    : docName;
                return (
                  <option key={doctor.id} value={doctor.id}>
                    {displayName} — {doctor.specialization || 'General'}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#2c2e4b]">Visit date</Label>
              <input
                type="date"
                min={minDate}
                max={maxDate}
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#e7d6bf] bg-white text-sm text-[#2c2e4b] focus:outline-none focus:ring-2 focus:ring-[#caa26a]/30 focus:border-[#caa26a]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#2c2e4b]">Visit time</Label>
              <input
                type="time"
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#e7d6bf] bg-white text-sm text-[#2c2e4b] focus:outline-none focus:ring-2 focus:ring-[#caa26a]/30 focus:border-[#caa26a]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#2c2e4b]">Appointment type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="border-[#e7d6bf] text-xs h-9 rounded-lg">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_TYPES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#2c2e4b]">
              Why was this not recorded earlier? <span className="text-[#9b2226]">*</span>
            </Label>
            <Textarea
              rows={3}
              value={lateEntryNote}
              onChange={(e) => setLateEntryNote(e.target.value)}
              placeholder="e.g. Saturday clinic was busy; paper notes entered on Monday"
              className="border-[#e7d6bf] text-xs rounded-lg resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="h-8 px-3 text-xs rounded-lg border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-8 px-3 text-xs rounded-lg bg-[#005f73] hover:bg-[#003b53] text-white shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              'Record visit'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
