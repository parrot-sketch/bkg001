/**
 * Doctors Today — today's appointment load per doctor, from the shared dashboard query.
 *
 * Branded with Nairobi Sculpt light palette: white cards, beige borders,
 * navy typography, and gold accents.
 */

import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { useDoctorsToday, type FrontdeskDoctorDay } from '@/hooks/frontdesk/use-frontdesk-dashboard';
import { Stethoscope } from 'lucide-react';
import { DoctorsTodayRowsSkeleton } from '@/components/frontdesk/FrontdeskSkeletons';

function loadLabel(doctor: FrontdeskDoctorDay): string {
  const parts: string[] = [];
  if (doctor.booked > 0) parts.push(`${doctor.booked} booked`);
  if (doctor.awaitingConfirmation > 0) parts.push(`${doctor.awaitingConfirmation} awaiting confirmation`);
  return parts.length > 0 ? parts.join(' · ') : 'No appointments today';
}

export function DoctorsTodayPanel() {
  const { openBookingDialog } = useBookAppointmentStore();
  const { data: doctors = [], isLoading, error } = useDoctorsToday();

  return (
    <section className="border border-[#e7d6bf] bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[#e7d6bf] flex items-center justify-between bg-white">
        <div className="text-sm font-semibold text-[#2c2e4b] flex items-center gap-2">
          <div className="h-8 w-8 border border-[#e7d6bf] bg-[#e7d6bf]/30 flex items-center justify-center">
            <Stethoscope className="h-4 w-4 text-[#caa26a]" />
          </div>
          Doctors today
        </div>
        <div className="text-xs text-[#2c2e4b]/60 font-medium">{format(new Date(), 'EEE, MMM d')}</div>
      </div>

      <div className="p-3">
        {isLoading ? (
          <DoctorsTodayRowsSkeleton />
        ) : error ? (
          <div className="text-xs text-[#2c2e4b]/60 py-2 px-1">Unable to load doctors.</div>
        ) : doctors.length === 0 ? (
          <div className="text-xs text-[#2c2e4b]/40 py-2 px-1">No doctors found.</div>
        ) : (
          <div className="space-y-1">
            {doctors.map((doctor) => (
              <div
                key={doctor.doctorId}
                className="flex items-center justify-between gap-3 border border-[#e7d6bf]/60 rounded-lg px-3 py-2 bg-white hover:bg-[#e7d6bf]/10 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#2c2e4b] truncate">{doctor.doctorName}</div>
                  <div className="text-[10px] text-[#2c2e4b]/50 truncate">{loadLabel(doctor)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {doctor.inConsultation && (
                    <Badge variant="outline" className="rounded-none text-[10px] border-[#caa26a]/40 bg-[#caa26a]/10 text-[#9a7709] font-semibold">
                      In consultation
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-[10px] rounded-lg bg-white border-[#caa26a]/30 text-[#caa26a] hover:bg-[#caa26a] hover:text-white hover:border-[#caa26a] transition-colors font-medium shadow-sm"
                    onClick={() =>
                      openBookingDialog({
                        initialDoctorId: doctor.doctorId,
                        lockDoctor: true,
                        source: AppointmentSource.FRONTDESK_SCHEDULED,
                        bookingChannel: BookingChannel.DASHBOARD,
                      })
                    }
                  >
                    Book
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
