import { Calendar, Filter, Plus, Loader2 } from 'lucide-react';
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
}

export function AppointmentsList({
  loading,
  filteredAppointments,
  statusFilter,
  searchQuery,
  dateLabel,
  highlightedId,
  onClearFilters,
}: AppointmentsListProps) {
  const router = useRouter();

  return (
    <div className="space-y-2.5">
      {/* List header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold text-[#2c2e4b]/50 uppercase tracking-wider">
          {loading
            ? 'Loading...'
            : `${filteredAppointments.length} appointment${filteredAppointments.length !== 1 ? 's' : ''}`}
          {statusFilter !== 'ALL' && (
            <span className="text-[#2c2e4b]/50 font-normal ml-1">
              ({STATUS_CHIPS.find((c) => c.key === statusFilter)?.label})
            </span>
          )}
        </p>
        {filteredAppointments.length > 0 && (
          <p className="text-[10px] text-[#2c2e4b]/50">
            Sorted by scheduled time
          </p>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <AppointmentsSkeleton />
      ) : filteredAppointments.length === 0 ? (
        <EmptyState
          hasFilters={!!searchQuery || statusFilter !== 'ALL'}
          dateLabel={dateLabel}
          onClearFilters={onClearFilters}
        />
      ) : (
        <div className="space-y-2">
          {filteredAppointments.map((appointment: AppointmentResponseDto) => (
            <FrontdeskAppointmentCardV2
              key={appointment.id}
              appointment={appointment}
              onAction={(action) => {
                if (action === 'details') {
                  router.push(`/frontdesk/appointments/${appointment.id}`);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Empty state */
function EmptyState({
  hasFilters,
  dateLabel,
  onClearFilters,
}: {
  hasFilters: boolean;
  dateLabel: string;
  onClearFilters: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-[#e7d6bf] bg-[#e7d6bf]/5">
      <div className="h-16 w-16 rounded-2xl bg-[#e7d6bf]/20 flex items-center justify-center mb-5">
        <Calendar className="h-8 w-8 text-[#caa26a]" />
      </div>
      <h3 className="text-sm font-semibold text-[#2c2e4b] mb-1">
        {hasFilters ? 'No matching appointments' : `No appointments ${dateLabel.toLowerCase()}`}
      </h3>
      <p className="text-xs text-[#2c2e4b]/60 mb-5 text-center max-w-xs">
        {hasFilters
          ? 'Try adjusting your filters or search query'
          : 'Appointments booked for this date will appear here'}
      </p>
      <div className="flex items-center gap-2">
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30 hover:border-[#caa26a]/60 rounded-lg"
          >
            <Filter className="h-3 w-3 mr-1.5" />
            Clear Filters
          </Button>
        )}
        <Button
          onClick={() => router.push('/frontdesk/patients?mode=book')}
          size="sm"
          className="bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] rounded-lg"
        >
          <Plus className="h-3 w-3 mr-1.5" />
          Book Appointment
        </Button>
      </div>
    </div>
  );
}

/** Loading skeleton */
function AppointmentsSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100">
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
