/**
 * Simplified Doctor Availability At A Glance
 * 
 * Shows which doctors are on duty today.
 * Booking goes through doctor confirmation/approval,
 * so we only need to show basic availability status.
 * 
 * Branded with Nairobi Sculpt light palette.
 */

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDoctorsAvailability } from '@/hooks/schedule/useDoctorAvailability';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import type { DoctorAvailabilityResponseDto } from '@/application/dtos/DoctorAvailabilityResponseDto';
import { Stethoscope } from 'lucide-react';

export function DoctorAvailabilityAtAGlance() {
  const { openBookingDialog } = useBookAppointmentStore();
  const today = useMemo(() => new Date(), []);
  const { data: doctors = [], isLoading, error } = useDoctorsAvailability(today, today);

  const rows = useMemo(() => {
    return doctors
      .map((d) => ({
        doctor: d,
        status: d.isAvailable ? 'AVAILABLE' : 'OFF',
      }))
      .sort((a, b) => {
        const order = { AVAILABLE: 0, OFF: 1 };
        return order[a.status] - order[b.status] || a.doctor.doctorName.localeCompare(b.doctor.doctorName);
      });
  }, [doctors]);

  return (
    <section className="border border-[#e7d6bf] bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[#e7d6bf] flex items-center justify-between bg-white">
        <div className="text-sm font-semibold text-[#2c2e4b] flex items-center gap-2">
          <div className="h-8 w-8 border border-[#e7d6bf] bg-[#e7d6bf]/30 flex items-center justify-center">
            <Stethoscope className="h-4 w-4 text-[#caa26a]" />
          </div>
          Doctor availability
        </div>
        <div className="text-xs text-[#2c2e4b]/60 font-medium">{format(new Date(), 'EEE, MMM d')}</div>
      </div>

      <div className="p-3">
        {isLoading ? (
          <div className="text-xs text-[#2c2e4b]/40 py-2 px-1">Loading…</div>
        ) : error ? (
          <div className="text-xs text-[#2c2e4b]/60 py-2 px-1">Unable to load availability.</div>
        ) : rows.length === 0 ? (
          <div className="text-xs text-[#2c2e4b]/40 py-2 px-1">No doctors found.</div>
        ) : (
          <div className="space-y-1">
            {rows.map(({ doctor, status }) => (
              <div
                key={doctor.doctorId}
                className="flex items-center justify-between gap-3 border border-[#e7d6bf]/60 rounded-lg px-3 py-2 bg-white hover:bg-[#e7d6bf]/10 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#2c2e4b] truncate">{doctor.doctorName}</div>
                  <div className="text-[10px] text-[#2c2e4b]/50 truncate">{doctor.specialization}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={
                      status === 'AVAILABLE'
                        ? 'rounded-none text-[10px] border-[#e7d6bf] bg-[#e7d6bf]/20 text-[#2c2e4b] font-semibold'
                        : 'rounded-none text-[10px] border-[#e7d6bf] bg-white text-[#2c2e4b]/50 font-medium'
                    }
                  >
                    {status === 'AVAILABLE' ? 'On duty' : 'Off'}
                  </Badge>
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
