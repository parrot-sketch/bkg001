'use client';

import { FEATURE_FLAGS, type FeatureFlagKey } from '../feature-flags';

const TRUTHY = new Set(['true', '1', 'yes']);

function parseBoolean(value: string | undefined): boolean {
  if (typeof value !== 'string') return false;
  return TRUTHY.has(value.trim().toLowerCase());
}

function resolveFlagValue(key: FeatureFlagKey): boolean {
  const lsKey = `feature_flag_${FEATURE_FLAGS[key]}`;
  try {
    const stored = localStorage.getItem(lsKey);
    if (stored !== null) return stored === 'true';
  } catch {
    // localStorage unavailable
  }
  const envKey = `NEXT_PUBLIC_${FEATURE_FLAGS[key].toUpperCase()}`;
  return parseBoolean(process.env[envKey]);
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  return resolveFlagValue(key);
}
