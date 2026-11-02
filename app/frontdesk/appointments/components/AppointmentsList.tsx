import { Calendar, ClipboardList, Filter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FrontdeskAppointmentCardV2 } from '@/components/frontdesk/FrontdeskAppointmentCardV2';
import { useRouter } from 'next/navigation';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { STATUS_CHIPS } from './AppointmentsFilterBar';

interface AppointmentsListProps {
  loading: boolean;
  filteredAppointments: AppointmentResponseDto[];
  statusFilter: string;
  searchQuery: string;
  dateLabel: string;
  highlightedId: number | null;
  onClearFilters: () => void;
  viewingPastDay: boolean;
  onBookAppointment: () => void;
  onRecordPastVisit: () => void;
}

export function AppointmentsList({
  loading,
  filteredAppointments,
  statusFilter,
  searchQuery,
  dateLabel,
  highlightedId,
  onClearFilters,
  viewingPastDay,
  onBookAppointment,
  onRecordPastVisit,
}: AppointmentsListProps) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#e7d6bf]">
          {loading
            ? 'Loading…'
            : `${filteredAppointments.length} appointment${filteredAppointments.length !== 1 ? 's' : ''}`}
          {statusFilter !== 'ALL' && (
            <span className="ml-1 font-normal text-[#e7d6bf]/70">
              ({STATUS_CHIPS.find((c) => c.key === statusFilter)?.label})
            </span>
          )}
        </p>
        {filteredAppointments.length > 0 && (
          <p className="text-[11px] text-[#e7d6bf]/70">Sorted by scheduled time</p>
        )}
      </div>

      {loading ? (
        <AppointmentsSkeleton />
      ) : filteredAppointments.length === 0 ? (
        <EmptyState
          hasFilters={!!searchQuery || statusFilter !== 'ALL'}
          dateLabel={dateLabel}
          viewingPastDay={viewingPastDay}
          onClearFilters={onClearFilters}
          onBookAppointment={onBookAppointment}
          onRecordPastVisit={onRecordPastVisit}
        />
      ) : (
        <div className="divide-y divide-[#e7d6bf]/70 border border-[#e7d6bf]/80 bg-white">
          {filteredAppointments.map((appointment: AppointmentResponseDto) => (
            <div
              key={appointment.id}
              className={
                highlightedId === appointment.id ? 'bg-[#caa26a]/10' : undefined
              }
            >
              <FrontdeskAppointmentCardV2
                appointment={appointment}
                variant="row"
                onAction={(action) => {
                  if (action === 'details') {
                    router.push(`/frontdesk/appointments/${appointment.id}`);
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  hasFilters,
  dateLabel,
  viewingPastDay,
  onClearFilters,
  onBookAppointment,
  onRecordPastVisit,
}: {
  hasFilters: boolean;
  dateLabel: string;
  viewingPastDay: boolean;
  onClearFilters: () => void;
  onBookAppointment: () => void;
  onRecordPastVisit: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-[#e7d6bf]/50 bg-[#2c2e4b]/40 px-6 py-14">
      <Calendar className="mb-4 h-8 w-8 text-[#caa26a]" />
      <h3 className="mb-1 text-sm font-semibold text-white">
        {hasFilters
          ? 'No matching appointments'
          : viewingPastDay
            ? `No visits recorded for ${dateLabel.toLowerCase()}`
            : `No appointments ${dateLabel.toLowerCase()}`}
      </h3>
      <p className="mb-5 max-w-sm text-center text-xs leading-relaxed text-[#e7d6bf]">
        {hasFilters
          ? 'Adjust filters or clear search to see the full day board.'
          : viewingPastDay
            ? 'If patients were seen but never entered, record the past visit here without leaving this page.'
            : 'Book on this date without leaving the appointments board.'}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="h-8 rounded-md border-white/25 bg-transparent text-xs text-[#e7d6bf] hover:bg-white/10 hover:text-white"
          >
            <Filter className="mr-1.5 h-3 w-3" />
            Clear filters
          </Button>
        )}
        {viewingPastDay ? (
          <Button
            size="sm"
            onClick={onRecordPastVisit}
            className="h-8 rounded-md bg-[#005f73] px-3 text-xs font-semibold text-white hover:bg-[#003b53]"
          >
            <ClipboardList className="mr-1.5 h-3 w-3" />
            Record past visit
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onBookAppointment}
            className="h-8 rounded-md bg-[#caa26a] px-3 text-xs font-semibold text-[#2c2e4b] hover:bg-[#b8913e]"
          >
            <Plus className="mr-1.5 h-3 w-3" />
            Book appointment
          </Button>
        )}
      </div>
    </div>
  );
}

function AppointmentsSkeleton() {
  return (
    <div className="divide-y divide-[#e7d6bf]/60 border border-[#e7d6bf]/70 bg-white">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}
