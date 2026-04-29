'use client';

import { useEffect, useMemo, useState } from 'react';
import { PatientCombobox } from '@/components/frontdesk/PatientCombobox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { CalendarPlus } from 'lucide-react';
import { getDefaultAvailabilityDateRange, useDoctorsAvailability } from '@/hooks/schedule/useDoctorAvailability';

export function QuickBookAppointmentPanel() {
  const { openBookingDialog, lastSuccessNonce } = useBookAppointmentStore();
  const [patientId, setPatientId] = useState<string>('');
  const [patient, setPatient] = useState<PatientResponseDto | undefined>(undefined);
  const [doctorId, setDoctorId] = useState<string>('');
  const [showDoctorPicker, setShowDoctorPicker] = useState(false);

  const { startDate, endDate } = useMemo(() => getDefaultAvailabilityDateRange(), []);
  const { data: doctors = [] } = useDoctorsAvailability(startDate, endDate, { enabled: true });

  const selectableDoctors = useMemo(() => {
    return doctors.filter((d) => d.workingDays?.some((wd) => wd.isAvailable));
  }, [doctors]);

  const canBook = useMemo(() => patientId.trim().length > 0, [patientId]);

  useEffect(() => {
    // After a successful booking (wizard completed), reset Quick Book to prevent accidental double-booking.
    setPatientId('');
    setPatient(undefined);
    setDoctorId('');
    setShowDoctorPicker(false);
  }, [lastSuccessNonce]);

  const handleOpen = () => {
    if (!canBook) return;
    openBookingDialog({
      initialPatientId: patientId,
      initialPatient: patient,
      ...(doctorId
        ? { initialDoctorId: doctorId, lockDoctor: true }
        : {}),
      source: AppointmentSource.FRONTDESK_SCHEDULED,
      bookingChannel: BookingChannel.DASHBOARD,
    });
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-slate-700">
        Quick book
      </div>
      <div className="grid grid-cols-1 gap-2">
        <PatientCombobox
          value={patientId}
          onSelect={(id, p) => {
            setPatientId(id);
            setPatient(p);
          }}
        />
        {!showDoctorPicker ? (
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-7 px-0 text-xs text-slate-500 hover:text-slate-700"
              onClick={() => setShowDoctorPicker(true)}
            >
              Doctor (optional)
            </Button>
            {doctorId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-600 hover:text-slate-800"
                onClick={() => setDoctorId('')}
              >
                Clear
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-1">
            <Select value={doctorId} onValueChange={(v) => setDoctorId(v === '__any__' ? '' : v)}>
              <SelectTrigger className="h-9 rounded-xl bg-white">
                <SelectValue placeholder="Doctor (optional)" />
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
                className="h-7 px-0 text-xs text-slate-500 hover:text-slate-700"
                onClick={() => setShowDoctorPicker(false)}
              >
                Hide doctor
              </Button>
              {doctorId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-slate-600 hover:text-slate-800"
                  onClick={() => setDoctorId('')}
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        )}
        <Button
          type="button"
          size="sm"
          onClick={handleOpen}
          disabled={!canBook}
          className="h-9 justify-center bg-slate-900 hover:bg-slate-800 text-white"
        >
          <CalendarPlus className="h-4 w-4 mr-2" />
          Book appointment
        </Button>
      </div>
    </div>
  );
}
