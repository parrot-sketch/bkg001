'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus } from 'lucide-react';

import { PatientCombobox } from '@/components/frontdesk/PatientCombobox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { getDefaultAvailabilityDateRange, useDoctorsAvailability } from '@/hooks/schedule/useDoctorAvailability';

export function QuickBookAppointmentDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { open, onOpenChange } = props;
  const { openBookingDialog, lastSuccessNonce } = useBookAppointmentStore();

  const [patientId, setPatientId] = useState('');
  const [patient, setPatient] = useState<PatientResponseDto | undefined>(undefined);
  const [showDoctorPicker, setShowDoctorPicker] = useState(false);
  const [doctorId, setDoctorId] = useState('');

  const { startDate, endDate } = useMemo(() => getDefaultAvailabilityDateRange(), []);
  const { data: doctors = [], isLoading: loadingDoctors } = useDoctorsAvailability(startDate, endDate, {
    enabled: open,
  });

  const selectableDoctors = useMemo(() => {
    return doctors.filter((d) => d.workingDays?.some((wd) => wd.isAvailable));
  }, [doctors]);

  const canContinue = patientId.trim().length > 0;

  const reset = () => {
    setPatientId('');
    setPatient(undefined);
    setDoctorId('');
    setShowDoctorPicker(false);
  };

  useEffect(() => {
    if (!open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    onOpenChange(false);
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSuccessNonce]);

  const handleContinue = () => {
    if (!canContinue) return;
    openBookingDialog({
      initialPatientId: patientId,
      initialPatient: patient,
      ...(doctorId ? { initialDoctorId: doctorId, lockDoctor: true } : {}),
      source: AppointmentSource.FRONTDESK_SCHEDULED,
      bookingChannel: BookingChannel.DASHBOARD,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-base text-[#121c1d] flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#0c5d69]/10 flex items-center justify-center">
              <CalendarPlus className="h-3.5 w-3.5 text-[#0c5d69]" />
            </div>
            Book appointment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <PatientCombobox
            value={patientId}
            onSelect={(id, p) => {
              setPatientId(id);
              setPatient(p);
            }}
          />

          {!showDoctorPicker ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-7 px-0 text-xs text-[#0c5d69]/70 hover:text-[#0c5d69]"
              onClick={() => setShowDoctorPicker(true)}
            >
              + Doctor (optional)
            </Button>
          ) : (
            <div className="space-y-2">
              <Select value={doctorId} onValueChange={(v) => setDoctorId(v === '__any__' ? '' : v)}>
                <SelectTrigger className="h-9 rounded-xl bg-white border-slate-200 focus:ring-[#0c5d69]/30 focus:border-[#0c5d69]">
                  <SelectValue placeholder={loadingDoctors ? 'Loading doctors…' : 'Doctor (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Any available doctor</SelectItem>
                  {selectableDoctors.map((d) => (
                    <SelectItem key={d.doctorId} value={d.doctorId}>
                      {d.doctorName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-7 px-0 text-xs text-slate-400 hover:text-slate-600"
                  onClick={() => setShowDoctorPicker(false)}
                >
                  Hide doctor
                </Button>
                {doctorId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
                    onClick={() => setDoctorId('')}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue}
              className="h-9 bg-[#0c5d69] hover:bg-[#0a4f59] text-white transition-colors duration-200"
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
