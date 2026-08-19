import { format } from 'date-fns';
import { calculateAge } from '@/lib/utils';

export function formatLastVisit(lastVisitAt: string | null | undefined): string | null {
  if (!lastVisitAt) return null;
  return format(new Date(lastVisitAt), 'MMM d, yyyy');
}

export function formatPatientAge(dateOfBirth: string | null | undefined): string | null {
  if (!dateOfBirth) return null;
  return `${calculateAge(dateOfBirth)} yrs`;
}

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

export function formatPatientName(firstName: string, lastName: string): string {
  return `${toTitleCase(firstName)} ${toTitleCase(lastName)}`;
}
