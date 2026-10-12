/**
 * Server action to trigger appointment expiry check.
 * 
 * This is called from the frontdesk dashboard on load to
 * automatically expire appointments that have passed their
 * grace period.
 */

"use server";

import { expireOverdueAppointments } from '@/domain/utils/appointment-expiry';
import { revalidateFrontdeskDashboard } from '@/actions/frontdesk/get-dashboard-data';

const MIN_INTERVAL_MS = 5 * 60 * 1000;

// Per server instance. Every dashboard mount calls this, and the grace period is
// measured in minutes, so re-scanning more often only adds database load.
let lastRunAt = 0;

export async function triggerAppointmentExpiry() {
  const now = Date.now();
  if (now - lastRunAt < MIN_INTERVAL_MS) {
    return { success: true, expiredCount: 0, skipped: true };
  }
  lastRunAt = now;

  try {
    const result = await expireOverdueAppointments();
    if (result.expiredCount > 0) {
      await revalidateFrontdeskDashboard();
    }
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
