/**
 * API Request Normalization
 * 
 * Handles conversion between frontend formats (snake_case) and internal types (camelCase).
 * This provides backward compatibility and type safety at API boundaries.
 * 
 * Why this exists:
 * - Frontend forms may send snake_case (from Zod schemas)
 * - Internal types use camelCase (TypeScript convention)
 * - Database uses snake_case (Prisma convention)
 * 
 * This normalization layer ensures:
 * - Type safety at boundaries
 * - Backward compatibility
 * - Clean domain layer
 * - Zero runtime errors from field name mismatches
 */

import type { CreateAppointmentRequest } from '@/types/api-requests';

/**
 * Normalizes appointment request data from any format to CreateAppointmentRequest
 * 
 * Handles both snake_case (from forms/Zod) and camelCase (from API clients)
 * 
 * @param data - Raw request data (may be snake_case or camelCase)
 * @returns Normalized CreateAppointmentRequest with camelCase fields
 */
export function normalizeAppointmentRequest(
  data: Record<string, unknown>
): CreateAppointmentRequest {
  // Helper to safely get value with fallback
  const getValue = (camelKey: string, snakeKey: string): string => {
    const camelValue = data[camelKey];
    const snakeValue = data[snakeKey];
    if (typeof camelValue === 'string' && camelValue) return camelValue;
    if (typeof snakeValue === 'string' && snakeValue) return snakeValue;
    return '';
  };

  const getOptionalValue = (key: string): string | undefined => {
    const value = data[key];
    return typeof value === 'string' ? value : undefined;
  };

  return {
    patientId: getValue('patientId', 'patient_id'),
    doctorId: getValue('doctorId', 'doctor_id'),
    appointmentDate: getValue('appointmentDate', 'appointment_date'),
    time: getValue('time', 'time'),
    type: getOptionalValue('type'),
    note: getOptionalValue('note'),
    reason: getOptionalValue('reason'),
  };
}

/**
 * Type guard to check if data has appointment request fields
 */
export function isAppointmentRequestLike(
  data: unknown
): data is Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  const obj = data as Record<string, unknown>;
  
  // Check for either camelCase or snake_case patient identifier
  return (
    (typeof obj.patientId === 'string' || typeof obj.patient_id === 'string') &&
    (typeof obj.doctorId === 'string' || typeof obj.doctor_id === 'string')
  );
}
