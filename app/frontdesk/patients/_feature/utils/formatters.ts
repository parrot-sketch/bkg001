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
 * Converts a string to Title Case, capitalizing the first letter of each word
 * (including handling hyphenated names like Mary-Jane or Jean-Paul).
 */
export function toTitleCase(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map((word) => {
      return word
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('-');
    })
    .join(' ');
}

/**
 * Builds a patient's display name from first and last name parts, normalizing the casing.
 */
export function formatPatientName(firstName: string, lastName: string): string {
  return `${toTitleCase(firstName)} ${toTitleCase(lastName)}`;
}
