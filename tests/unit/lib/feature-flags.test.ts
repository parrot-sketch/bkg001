/**
 * Feature Flag Registry Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isFeatureEnabled, getAllFlags, FEATURE_FLAGS, type FeatureFlagKey } from '@/shared-kernel/feature-flags';

describe('lib/feature-flags', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('returns all known flag keys', () => {
    const keys = Object.keys(FEATURE_FLAGS);
    expect(keys).toEqual([
      'USE_DRAFT_SERVICE',
      'USE_SESSION_SERVICE',
      'USE_QUEUE_SERVICE',
      'USE_PATIENT_CONTEXT',
      'USE_DOCUMENTATION_PROVIDER',
      'USE_BILLING_PROVIDER',
      'USE_SESSION_PROVIDER',
      'USE_QUEUE_PROVIDER',
      'USE_NOTIFICATION_PROVIDER',
    ]);
  });

  it.each(Object.keys(FEATURE_FLAGS) as FeatureFlagKey[])('returns false for "%s" when env var is unset', (key) => {
    expect(isFeatureEnabled(key)).toBe(false);
  });

  it('returns true when NEXT_PUBLIC env var is "true"', () => {
    process.env.NEXT_PUBLIC_USE_DRAFT_SERVICE = 'true';
    expect(isFeatureEnabled('USE_DRAFT_SERVICE')).toBe(true);
  });

  it('returns true when NEXT_PUBLIC env var is "1"', () => {
    process.env.NEXT_PUBLIC_USE_DRAFT_SERVICE = '1';
    expect(isFeatureEnabled('USE_DRAFT_SERVICE')).toBe(true);
  });

  it('returns true when NEXT_PUBLIC env var is "yes"', () => {
    process.env.NEXT_PUBLIC_USE_DRAFT_SERVICE = 'yes';
    expect(isFeatureEnabled('USE_DRAFT_SERVICE')).toBe(true);
  });

  it.each(['True', 'TRUE', 'Yes', 'YES', '1 '])('is case-insensitive for "%s"', (val) => {
    process.env.NEXT_PUBLIC_USE_DRAFT_SERVICE = val;
    expect(isFeatureEnabled('USE_DRAFT_SERVICE')).toBe(true);
  });

  it('returns false for invalid values', () => {
    process.env.NEXT_PUBLIC_USE_DRAFT_SERVICE = 'garbage';
    expect(isFeatureEnabled('USE_DRAFT_SERVICE')).toBe(false);
  });

  it('returns false for empty string', () => {
    process.env.NEXT_PUBLIC_USE_DRAFT_SERVICE = '';
    expect(isFeatureEnabled('USE_DRAFT_SERVICE')).toBe(false);
  });

  it('getAllFlags returns false defaults for all flags when no env vars set', () => {
    const flags = getAllFlags();
    for (const key of Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]) {
      expect(flags[key]).toBe(false);
    }
  });

  it('getAllFlags returns true for flags with env vars set', () => {
    process.env.NEXT_PUBLIC_USE_DRAFT_SERVICE = 'true';
    process.env.NEXT_PUBLIC_USE_SESSION_SERVICE = '1';
    const flags = getAllFlags();
    expect(flags.USE_DRAFT_SERVICE).toBe(true);
    expect(flags.USE_SESSION_SERVICE).toBe(true);
    expect(flags.USE_QUEUE_SERVICE).toBe(false);
  });
});
