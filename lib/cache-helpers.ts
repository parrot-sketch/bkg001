/**
 * Cache Invalidation Helpers
 * 
 * Helper functions for invalidating React Query cache across modules.
 * Ensures both frontdesk, doctor, and nurse module caches are invalidated
 * when shared entities are modified.
 */

import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/constants/queryKeys';

export type SharedEntityType = 'patient' | 'appointment' | 'surgicalCase' | 'theaterBooking';

export function invalidateSharedEntity(
  queryClient: QueryClient,
  entity: SharedEntityType,
  id: string
): void {
  switch (entity) {
    case 'patient':
      queryClient.invalidateQueries({ queryKey: queryKeys.shared.patient(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.patients() });
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.nurse.clinicQueue('today') });
      break;
    case 'appointment':
      queryClient.invalidateQueries({ queryKey: queryKeys.shared.appointment(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.todaysSchedule() });
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.appointments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.nurse.clinicQueue('today') });
      break;
    case 'surgicalCase':
      queryClient.invalidateQueries({ queryKey: queryKeys.shared.surgicalCase(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaterQueue() });
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.cases() });
      queryClient.invalidateQueries({ queryKey: queryKeys.nurse.wardPrep() });
      queryClient.invalidateQueries({ queryKey: queryKeys.nurse.theatreSupport('today') });
      queryClient.invalidateQueries({ queryKey: queryKeys.nurse.recovery() });
      break;
    case 'theaterBooking':
      queryClient.invalidateQueries({ queryKey: queryKeys.shared.theaterBooking(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaters() });
      queryClient.invalidateQueries({ queryKey: queryKeys.nurse.theatreSupport('today') });
      break;
  }
}

export function invalidateFrontdeskDashboard(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.dashboard() });
}

export function invalidateDoctorDashboard(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.doctor.dashboard() });
}

export function invalidateNurseDashboard(queryClient: QueryClient, userId?: string): void {
  if (userId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.nurse.dashboard(userId) });
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.nurse.clinicQueue('today') });
  queryClient.invalidateQueries({ queryKey: queryKeys.nurse.wardPrep() });
  queryClient.invalidateQueries({ queryKey: queryKeys.nurse.theatreSupport('today') });
  queryClient.invalidateQueries({ queryKey: queryKeys.nurse.recovery() });
}

export function invalidatePatientJourneyCache(
  queryClient: QueryClient,
  patientId: string,
  appointmentId?: string,
  caseId?: string
): void {
  if (patientId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.shared.patient(patientId) });
  }
  if (appointmentId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.shared.appointment(String(appointmentId)) });
  }
  if (caseId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.shared.surgicalCase(caseId) });
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.nurse.clinicQueue('today') });
  queryClient.invalidateQueries({ queryKey: queryKeys.nurse.wardPrep() });
  queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.dashboard() });
  queryClient.invalidateQueries({ queryKey: queryKeys.doctor.dashboard() });
}

export function invalidatePreOpCompletion(
  queryClient: QueryClient,
  caseId: string,
  nurseUserId?: string
): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.nurse.wardPrep() });
  queryClient.invalidateQueries({ queryKey: queryKeys.nurse.wardPrepDetail(caseId) });
  if (nurseUserId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.nurse.dashboard(nurseUserId) });
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaterQueue() });
  queryClient.invalidateQueries({ queryKey: queryKeys.doctor.cases() });
  queryClient.invalidateQueries({ queryKey: queryKeys.shared.surgicalCase(caseId) });
}

export function invalidateTheaterBooking(
  queryClient: QueryClient,
  caseId: string,
  bookingDate: string
): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.nurse.theatreSupport(bookingDate) });
  queryClient.invalidateQueries({ queryKey: queryKeys.nurse.wardPrep() });
  queryClient.invalidateQueries({ queryKey: queryKeys.shared.surgicalCase(caseId) });
}

export function invalidateSurgeryComplete(
  queryClient: QueryClient,
  caseId: string,
  nurseUserId?: string
): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.nurse.recovery() });
  queryClient.invalidateQueries({ queryKey: queryKeys.nurse.theatreSupport('today') });
  queryClient.invalidateQueries({ queryKey: queryKeys.doctor.cases() });
  queryClient.invalidateQueries({ queryKey: queryKeys.shared.surgicalCase(caseId) });
  if (nurseUserId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.nurse.dashboard(nurseUserId) });
  }
}

export function invalidateDischarge(
  queryClient: QueryClient,
  patientId: string,
  caseId: string,
  nurseUserId?: string
): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.shared.patient(patientId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.shared.patients() });
  queryClient.invalidateQueries({ queryKey: queryKeys.shared.surgicalCase(caseId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.nurse.recovery() });
  queryClient.invalidateQueries({ queryKey: queryKeys.nurse.clinicQueue('today') });
  if (nurseUserId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.nurse.dashboard(nurseUserId) });
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.dashboard() });
  queryClient.invalidateQueries({ queryKey: queryKeys.doctor.dashboard() });
}

export function invalidateSurgicalPlanBilling(
  queryClient: QueryClient,
  caseId: string
): void {
  // Invalidates both the plan data and the specific plan cache
  queryClient.invalidateQueries({ queryKey: queryKeys.surgicalPlan.plan(caseId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.shared.surgicalCase(caseId) });
}