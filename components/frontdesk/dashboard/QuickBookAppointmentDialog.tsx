'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus } from 'lucide-react';

import { PatientCombobox } from '@/components/frontdesk/PatientCombobox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { patientApi } from '@/lib/api/patient';

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
  const [doctors, setDoctors] = useState<DoctorResponseDto[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingDoctors(true);
    patientApi.getAllDoctors().then((res) => {
      if (!cancelled && res.success && res.data) {
        setDoctors(res.data);
      }
      if (!cancelled) setLoadingDoctors(false);
    }).catch(() => {
      if (!cancelled) setLoadingDoctors(false);
    });
    return () => { cancelled = true; };
  }, [open]);

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
      <DialogContent className="sm:max-w-[520px] bg-white border border-[#e7d6bf]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[#2c2e4b] flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#e7d6bf]/30 flex items-center justify-center">
              <CalendarPlus className="h-3.5 w-3.5 text-[#caa26a]" />
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
              className="h-7 px-0 text-xs text-[#caa26a] hover:text-[#2c2e4b]"
              onClick={() => setShowDoctorPicker(true)}
            >
              + Doctor (optional)
            </Button>
          ) : (
            <div className="space-y-2">
              <Select value={doctorId} onValueChange={(v) => setDoctorId(v === '__any__' ? '' : v)}>
                <SelectTrigger className="h-9 rounded-lg bg-white border-[#e7d6bf] focus:ring-[#caa26a]/30 focus:border-[#caa26a]">
                  <SelectValue placeholder={loadingDoctors ? 'Loading doctors…' : 'Doctor (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Any available doctor</SelectItem>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name || `${d.firstName} ${d.lastName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-7 px-0 text-xs text-[#2c2e4b]/40 hover:text-[#2c2e4b]"
                  onClick={() => setShowDoctorPicker(false)}
                >
                  Hide doctor
                </Button>
                {doctorId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-[#2c2e4b]/60 hover:text-[#2c2e4b]"
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
              className="h-9 border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue}
              className="h-9 bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] transition-colors duration-200 shadow-sm"
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
