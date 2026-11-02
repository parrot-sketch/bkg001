import Link from 'next/link';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { FrontdeskPatientVisit } from '@/utils/services/patient-visits';
import { FrontdeskVisitHistoryFilters } from '@/components/frontdesk/patient/FrontdeskVisitHistoryFilters';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PENDING_DOCTOR_CONFIRMATION: 'Awaiting doctor',
  SCHEDULED: 'Scheduled',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked in',
  READY_FOR_CONSULTATION: 'Ready',
  IN_CONSULTATION: 'In consultation',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No show',
};

function statusClass(status: string) {
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'text-[#9b2226]';
  if (status === 'COMPLETED') return 'text-[#005f73]';
  return 'text-[#2c2e4b]';
}

interface FrontdeskPatientVisitHistoryProps {
  patientId: string;
  visits: FrontdeskPatientVisit[];
  totalVisits: number;
  selectedDate?: string | null;
}

export function FrontdeskPatientVisitHistory({
  patientId,
  visits,
  totalVisits,
  selectedDate,
}: FrontdeskPatientVisitHistoryProps) {
  const hasDateFilter = Boolean(selectedDate);

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-[#e7d6bf] bg-[#e7d6bf]/30 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-[#2c2e4b]">Visit history</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <FrontdeskVisitHistoryFilters
            patientId={patientId}
            selectedDate={selectedDate}
            filteredCount={visits.length}
            totalCount={totalVisits}
          />
          <span className="text-xs font-medium text-[#2c2e4b]/60">
            {hasDateFilter
              ? `${visits.length} on ${format(new Date(`${selectedDate}T12:00:00`), 'd MMM yyyy')}`
              : `${totalVisits} visit${totalVisits === 1 ? '' : 's'}`}
          </span>
        </div>
      </div>

      {visits.length === 0 ? (
        <div className="px-5 py-10">
          <p className="text-sm font-medium text-[#2c2e4b]">
            {hasDateFilter ? 'No visits on this date' : 'No visits yet'}
          </p>
          <p className="mt-1 text-sm text-[#2c2e4b]/55">
            {hasDateFilter
              ? 'Try another date, or clear the filter to see the full history.'
              : "Visits appear here after the patient is added to a doctor's queue or booked for an appointment."}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-[#e7d6bf] hover:bg-transparent">
              {['Date', 'Time', 'Visit', 'Clinician', 'Reason', 'Status'].map((column) => (
                <TableHead key={column} className="h-9 bg-[#e7d6bf]/30 px-5 text-[11px] font-semibold uppercase tracking-wider text-[#005f73]">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.map((visit) => (
              <TableRow key={visit.id} className="border-[#e7d6bf] hover:bg-[#e7d6bf]/30">
                <TableCell className="px-5 py-2.5 font-medium tabular-nums text-[#2c2e4b]">
                  <Link href={`/frontdesk/appointments/${visit.id}`} className="hover:underline">
                    {format(visit.date, 'd MMM yyyy')}
                  </Link>
                </TableCell>
                <TableCell className="px-5 py-2.5 tabular-nums text-[#2c2e4b]">{visit.time || '—'}</TableCell>
                <TableCell className="px-5 py-2.5 text-[#2c2e4b]">{visit.type || 'Visit'}</TableCell>
                <TableCell className="px-5 py-2.5 text-[#2c2e4b]">
                  {visit.doctorName
                    ? `${visit.doctorName}${visit.doctorSpecialization ? ` · ${visit.doctorSpecialization}` : ''}`
                    : '—'}
                </TableCell>
                <TableCell className="max-w-[16rem] truncate px-5 py-2.5 text-[#2c2e4b]">{visit.reason || '—'}</TableCell>
                <TableCell className={`px-5 py-2.5 text-sm font-medium ${statusClass(visit.status)}`}>
                  {STATUS_LABELS[visit.status] ?? visit.status}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
