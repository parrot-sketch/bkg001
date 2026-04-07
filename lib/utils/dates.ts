import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns';

/**
 * Formats a date to a readable string: "Apr 6, 2026"
 */
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy');
}

/**
 * Formats a date as relative when recent, otherwise absolute.
 * e.g. "3 days ago" or "Jan 15, 2025"
 */
export function formatRelativeDate(date: string | Date): string {
  const d = new Date(date);
  const daysAgo = Math.abs(differenceInDays(new Date(), d));
  if (daysAgo <= 30) {
    return formatDistanceToNow(d, { addSuffix: true });
  }
  return format(d, 'MMM d, yyyy');
}

/**
 * Returns display info for an expiry date badge.
 */
export function formatExpiryStatus(date: string | Date): {
  label: string;
  daysUntil: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
} {
  const d = new Date(date);
  const daysUntil = differenceInDays(d, new Date());
  const isExpired = isPast(d);
  const isExpiringSoon = !isExpired && daysUntil <= 30;

  let label: string;
  if (isExpired) {
    label = `Expired ${format(d, 'MMM d, yyyy')}`;
  } else if (isExpiringSoon) {
    label = `${daysUntil}d left (${format(d, 'MMM d')})`;
  } else {
    label = format(d, 'MMM d, yyyy');
  }

  return { label, daysUntil, isExpired, isExpiringSoon };
}
