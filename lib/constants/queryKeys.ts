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

const DOCTOR_DASHBOARD_KEYS = {
  all: ['doctor'] as const,
  dashboard: () => [...DOCTOR_DASHBOARD_KEYS.all, 'dashboard'] as const,
  profile: (id: string) => [...DOCTOR_DASHBOARD_KEYS.all, 'profile', id] as const,
  appointments: (date?: string) => [...DOCTOR_DASHBOARD_KEYS.all, 'appointments', date] as const,
  cases: () => [...DOCTOR_DASHBOARD_KEYS.all, 'cases'] as const,
  queue: () => [...DOCTOR_DASHBOARD_KEYS.all, 'queue'] as const,
  availability: () => [...DOCTOR_DASHBOARD_KEYS.all, 'availability'] as const,
} as const;

const NOTIFICATION_KEYS = {
  all: ['notifications'] as const,
  unread: () => [...NOTIFICATION_KEYS.all, 'unread'] as const,
} as const;

const NURSE_KEYS = {
  all: ['nurse'] as const,
  dashboard: (userId: string) => [...NURSE_KEYS.all, 'dashboard', userId] as const,
  clinicQueue: (date: string) => [...NURSE_KEYS.all, 'clinic-queue', date] as const,
  wardPrep: (filters?: { page?: number; limit?: number; status?: string; readiness?: string }) =>
    [...NURSE_KEYS.all, 'ward-prep', filters ?? {}] as const,
  wardPrepDetail: (caseId: string) => [...NURSE_KEYS.all, 'ward-prep', 'detail', caseId] as const,
  theatreSupport: (date: string) => [...NURSE_KEYS.all, 'theatre-support', date] as const,
  intraOpRecord: (caseId: string) => [...NURSE_KEYS.all, 'intra-op-record', caseId] as const,
  recovery: () => [...NURSE_KEYS.all, 'recovery'] as const,
  postOpRecord: (caseId: string) => [...NURSE_KEYS.all, 'post-op-record', caseId] as const,
  notifications: (userId: string) => [...NURSE_KEYS.all, 'notifications', userId] as const,
} as const;

const FRONTDESK_KEYS = {
  all: ['frontdesk'] as const,
  dashboard: (userId?: string) => ['frontdesk', 'dashboard', userId ?? 'default'] as const,
  todaysSchedule: (date?: string) => ['frontdesk', 'schedule', 'today', date ?? 'current'] as const,
  queue: () => ['frontdesk', 'queue'] as const,
  checkedInAwaitingAssignment: () => ['frontdesk', 'checked-in-awaiting-assignment'] as const,
  liveQueueBoard: () => ['frontdesk', 'live-queue-board'] as const,
  stats: () => ['frontdesk', 'stats'] as const,
  theaterQueue: () => ['frontdesk', 'theater-queue'] as const,
  theaters: (date?: string) => ['frontdesk', 'theaters', date ?? 'all'] as const,
  pendingPayments: (filters?: { status?: string }) => 
    ['frontdesk', 'payments', 'pending', filters ?? {}] as const,
  intakeSession: (sessionId: string) => ['frontdesk', 'intake', sessionId] as const,
  intakePendingCount: () => ['frontdesk', 'intake', 'pending', 'count'] as const,
  patients: (filters?: { page?: number; limit?: number; search?: string }) =>
    ['frontdesk', 'patients', filters ?? {}] as const,
  patientStats: () => ['frontdesk', 'patient-stats'] as const,
} as const;

const SHARED_KEYS = {
  all: ['shared'] as const,
  patient: (id: string) => ['shared', 'patient', id] as const,
  patients: (filters?: { page?: number; limit?: number; search?: string }) => 
    ['shared', 'patients', filters ?? {}] as const,
  appointment: (id: string) => ['shared', 'appointment', id] as const,
  appointments: (filters?: { date?: string; status?: string }) => 
    ['shared', 'appointments', filters ?? {}] as const,
  surgicalCase: (id: string) => ['shared', 'surgical-case', id] as const,
  surgicalCases: (filters?: { status?: string; surgeonId?: string }) => 
    ['shared', 'surgical-cases', filters ?? {}] as const,
  theaterBooking: (id: string) => ['shared', 'theater-booking', id] as const,
  notifications: (userId: string) => ['shared', 'notifications', userId] as const,
  doctors: () => ['shared', 'doctors'] as const,
} as const;

const SURGICAL_PLAN_KEYS = {
  all: ['surgical-case-plan'] as const,
  plan: (caseId: string) => ['surgical-case-plan', caseId] as const,
  timeline: (caseId: string) => ['surgical-case-timeline', caseId] as const,
} as const;

const CALENDAR_KEYS = {
  all: ['calendar'] as const,
  events: (doctorId: string) => ['calendar', doctorId, 'events'] as const,
} as const;

export const queryKeys = {
  appointments: APPOINTMENT_KEYS,
  consultations: CONSULTATION_KEYS,
  patients: PATIENT_KEYS,
  doctors: DOCTOR_KEYS,
  doctor: DOCTOR_DASHBOARD_KEYS,
  notifications: NOTIFICATION_KEYS,
  nurse: NURSE_KEYS,
  frontdesk: FRONTDESK_KEYS,
  shared: SHARED_KEYS,
  surgicalPlan: SURGICAL_PLAN_KEYS,
  calendar: CALENDAR_KEYS,
} as const;

export type QueryKeyFactory = typeof queryKeys;
