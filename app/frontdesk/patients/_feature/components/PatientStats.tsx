import { CalendarClock, Clock3, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  loading?: boolean;
  onClick?: () => void;
  active?: boolean;
  icon?: React.ElementType;
}

function StatCard({ title, value, loading = false, onClick, active = false, icon: Icon }: StatCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'border transition-all cursor-pointer select-none',
        active
          ? 'border-[#caa26a] bg-[#e7d6bf]/15 shadow-md'
          : 'border-[#e7d6bf] bg-white shadow-sm hover:shadow-md hover:border-[#caa26a]/60',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {Icon && <Icon className="h-3.5 w-3.5 text-[#caa26a]" />}
          <p className={cn('text-[10px] font-semibold uppercase tracking-wider', active ? 'text-[#caa26a]' : 'text-[#2c2e4b]/50')}>
            {title}
          </p>
        </div>
        {loading ? (
          <div className="h-7 w-12 bg-[#e7d6bf]/20 rounded animate-pulse mt-2" />
        ) : (
          <p className="text-xl font-semibold text-[#2c2e4b] tracking-tight mt-1">{value.toLocaleString()}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface PatientStatsProps {
  stats: { totalRecords: number; newToday: number; newThisMonth: number } | undefined;
  isStatsLoading: boolean;
  isLoading: boolean;
  displayedCount: number;
  isBrowseMode: boolean;
  hasActiveFilters: boolean;
  createdToday: boolean;
  createdThisMonth: boolean;
  totalRecords: number;
  onShowAll: () => void;
  onShowToday: () => void;
  onShowThisMonth: () => void;
  onShowResults: () => void;
}

/**
 * Renders the four stat cards at the top of the patient registry page.
 * Each card is clickable and acts as a quick-filter shortcut.
 */
export function PatientStats({
  stats,
  isStatsLoading,
  isLoading,
  displayedCount,
  isBrowseMode,
  hasActiveFilters,
  createdToday,
  createdThisMonth,
  totalRecords,
  onShowAll,
  onShowToday,
  onShowThisMonth,
  onShowResults,
}: PatientStatsProps) {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        title="Total Patients"
        value={stats?.totalRecords ?? 0}
        loading={isStatsLoading}
        onClick={onShowAll}
        active={!hasActiveFilters}
      />
      <StatCard
        title="New Today"
        value={stats?.newToday ?? 0}
        loading={isStatsLoading}
        onClick={onShowToday}
        active={createdToday}
        icon={CalendarClock}
      />
      <StatCard
        title="This Month"
        value={stats?.newThisMonth ?? 0}
        loading={isStatsLoading}
        onClick={onShowThisMonth}
        active={createdThisMonth}
        icon={Clock3}
      />
      <StatCard
        title={isBrowseMode ? 'Showing' : 'Results'}
        value={totalRecords}
        loading={isLoading}
        icon={Search}
        onClick={onShowResults}
        active={hasActiveFilters && !createdToday && !createdThisMonth}
      />
    </section>
  );
}
