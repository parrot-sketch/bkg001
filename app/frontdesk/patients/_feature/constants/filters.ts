import { CalendarClock, Clock3 } from 'lucide-react';
import type { QuickFilter } from '../types/patient-page';

/** Maximum number of recently-viewed patients stored in localStorage. */
export const RECENT_MAX = 8;

/** Quick-filter definitions rendered as chips in the toolbar. */
export const QUICK_FILTERS: ReadonlyArray<{
  readonly key: QuickFilter;
  readonly label: string;
  readonly icon: React.ElementType;
}> = [
  { key: 'today', label: 'Today', icon: CalendarClock },
  { key: 'thisMonth', label: 'This Month', icon: Clock3 },
] as const;
