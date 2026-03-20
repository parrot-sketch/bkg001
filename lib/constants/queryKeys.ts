/**
 * Query Keys Factory
 *
 * Centralized React Query key factory for consistent caching across the app.
 * All query keys should be defined here and imported from here.
 *
 * Usage:
 *   queryKey: appointmentKeys.list({ date: '2024-01-15' })
 *   queryKey: appointmentKeys.detail(id)
 */

const APPOINTMENT_KEYS = {
  all: ['appointments'] as const,
  list: (filters?: { date?: string; patientId?: string }) =>
    ['appointments', 'list', filters] as const,
  today: () => ['appointments', 'today'] as const,
  byDate: (date: string) => ['appointments', 'date', date] as const,
  byPatient: (patientId: string) => ['appointments', 'patient', patientId] as const,
  upcoming: () => ['appointments', 'upcoming'] as const,
  detail: (id: number) => ['appointments', 'detail', id] as const,
} as const;

const CONSULTATION_KEYS = {
  all: ['consultations'] as const,
  pending: () => ['consultations', 'pending'] as const,
  byId: (id: string) => ['consultations', id] as const,
} as const;

const PATIENT_KEYS = {
  all: ['patients'] as const,
  list: (filters?: { page?: number; limit?: number; search?: string }) =>
    ['patients', 'list', filters] as const,
  detail: (id: string) => ['patients', 'detail', id] as const,
  allergies: (patientId: string) => ['patients', 'allergies', patientId] as const,
  visits: (patientId: string) => ['patients', 'visits', patientId] as const,
  documents: (patientId: string) => ['patients', 'documents', patientId] as const,
  search: (query: string) => ['patients', 'search', query] as const,
} as const;

const DOCTOR_KEYS = {
  all: ['doctors'] as const,
  list: () => ['doctors', 'list'] as const,
  availability: (date?: string) => ['doctors', 'availability', date] as const,
  detail: (id: string) => ['doctors', 'detail', id] as const,
} as const;

const FRONTDESK_KEYS = {
  all: ['frontdesk'] as const,
  dashboard: () => ['frontdesk', 'dashboard'] as const,
  stats: () => ['frontdesk', 'stats'] as const,
} as const;

export const queryKeys = {
  appointments: APPOINTMENT_KEYS,
  consultations: CONSULTATION_KEYS,
  patients: PATIENT_KEYS,
  doctors: DOCTOR_KEYS,
  frontdesk: FRONTDESK_KEYS,
} as const;

export type QueryKeyFactory = typeof queryKeys;
