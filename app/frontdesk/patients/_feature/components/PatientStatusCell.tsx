import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { QUEUE_STATUS_CONFIG } from '@/components/frontdesk/PatientDrawer';

interface PatientStatusCellProps {
  queueStatus: string | null;
}

/**
 * Renders the "Today" column cell showing the patient's current queue status.
 * Replaces the inline IIFE that was in the monolithic table row.
 */
export function PatientStatusCell({ queueStatus }: PatientStatusCellProps) {
  if (!queueStatus) return <span className="text-xs text-[#2c2e4b]/30">--</span>;

  const cfg = QUEUE_STATUS_CONFIG[queueStatus];
  if (!cfg) return <span className="text-xs text-[#2c2e4b]/30">--</span>;

  return (
    <Badge
      variant="outline"
      className={cn('rounded-none text-[10px] border font-semibold px-1.5 py-0.5', cfg.className)}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full mr-1', cfg.dotClassName)} />
      {cfg.label}
    </Badge>
  );
}
