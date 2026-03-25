/**
 * Cache Invalidation Helpers
 * 
 * Helper functions for invalidating React Query cache across modules.
 * Ensures both frontdesk and doctor module caches are invalidated
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
      break;
    case 'appointment':
      queryClient.invalidateQueries({ queryKey: queryKeys.shared.appointment(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.todaysSchedule() });
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.appointments() });
      break;
    case 'surgicalCase':
      queryClient.invalidateQueries({ queryKey: queryKeys.shared.surgicalCase(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaterQueue() });
      queryClient.invalidateQueries({ queryKey: queryKeys.doctor.cases() });
      break;
    case 'theaterBooking':
      queryClient.invalidateQueries({ queryKey: queryKeys.shared.theaterBooking(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.theaters() });
      break;
  }
}

export function invalidateFrontdeskDashboard(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.frontdesk.dashboard() });
}

export function invalidateDoctorDashboard(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.doctor.dashboard() });
}