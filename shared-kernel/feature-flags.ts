/**
 * Feature Flag Registry
 *
 * Single source of truth for Phase 2 modernization feature flags.
 * Reads from NEXT_PUBLIC_ environment variables.
 * Defaults to false for all flags.
 *
 * Consumers must not read process.env directly.
 */

export const FEATURE_FLAGS = {
  USE_DRAFT_SERVICE: 'use_draft_service',
  USE_SESSION_SERVICE: 'use_session_service',
  USE_QUEUE_SERVICE: 'use_queue_service',
  USE_PATIENT_CONTEXT: 'use_patient_context',
  USE_DOCUMENTATION_PROVIDER: 'use_documentation_provider',
  USE_BILLING_PROVIDER: 'use_billing_provider',
  USE_SESSION_PROVIDER: 'use_session_provider',
  USE_QUEUE_PROVIDER: 'use_queue_provider',
  USE_NOTIFICATION_PROVIDER: 'use_notification_provider',
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
export type FeatureFlagValue = typeof FEATURE_FLAGS[FeatureFlagKey];

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

const TRUTHY = new Set(['true', '1', 'yes']);

function parseBoolean(value: string | undefined): boolean {
  if (typeof value !== 'string') return false;
  return TRUTHY.has(value.trim().toLowerCase());
}

function getFeatureFlag(key: FeatureFlagValue): boolean {
  const envKey = `NEXT_PUBLIC_${key.toUpperCase()}`;
  return parseBoolean(process.env[envKey]);
}

export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  return getFeatureFlag(FEATURE_FLAGS[key]);
}

export function getAllFlags(): Readonly<FeatureFlags> {
  const result = {} as FeatureFlags;
  for (const key of Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]) {
    result[key] = isFeatureEnabled(key);
  }
  return result;
}
