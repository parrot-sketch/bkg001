/**
 * Server action to trigger appointment expiry check.
 * 
 * This is called from the frontdesk dashboard on load to
 * automatically expire appointments that have passed their
 * grace period.
 */

"use server";

import { expireOverdueAppointments } from '@/domain/utils/appointment-expiry';

export async function triggerAppointmentExpiry() {
  try {
    const result = await expireOverdueAppointments();
    return {
      success: true,
      expiredCount: result.expiredCount,
      errors: result.errors,
    };
  } catch (error) {
    console.error('[triggerAppointmentExpiry]', error);
    return {
      success: false,
      expiredCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
