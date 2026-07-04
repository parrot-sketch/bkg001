import { format } from 'date-fns';
import { calculateAge } from '@/lib/utils';

/**
 * Formats a patient's last-visit date for display in the table.
 * Returns `null` if no date is provided (callers render "--" or "No visits").
 */
export function formatLastVisit(lastVisitAt: string | null | undefined): string | null {
  if (!lastVisitAt) return null;
  return format(new Date(lastVisitAt), 'MMM d, yyyy');
}

/**
 * Returns a human-readable age string (e.g. "34 yrs") or `null` when
 * the date of birth is missing.
 */
export function formatPatientAge(dateOfBirth: string | null | undefined): string | null {
  if (!dateOfBirth) return null;
  return `${calculateAge(dateOfBirth)} yrs`;
}

/**
 * Builds a patient's display name from first and last name parts.
 */
export function formatPatientName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}
