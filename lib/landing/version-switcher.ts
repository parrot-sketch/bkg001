/**
 * Landing Page Version Switcher
 * 
 * Controls which version of the landing page to display.
 * Supports:
 * - Environment variable: NEXT_PUBLIC_LANDING_VERSION
 * - URL query parameter: ?version=1 or ?version=2
 * - Default: version 2 (premium graphics)
 */

export type LandingVersion = '1' | '2';

const DEFAULT_VERSION: LandingVersion = '2';

/**
 * Get the landing page version to use (client-side)
 * Priority: URL query param > Environment variable > Default
 */
export function getLandingVersion(searchParams?: { version?: string | null }): LandingVersion {
  // Check URL query parameter first
  if (searchParams?.version === '1' || searchParams?.version === '2') {
    return searchParams.version as LandingVersion;
  }

  // Check environment variable
  const envVersion = process.env.NEXT_PUBLIC_LANDING_VERSION;
  if (envVersion === '1' || envVersion === '2') {
    return envVersion as LandingVersion;
  }

  return DEFAULT_VERSION;
}

/**
 * Get landing page version from server-side (for SSR)
 */
export function getLandingVersionServer(searchParams?: { version?: string }): LandingVersion {
  // Check URL query parameter first
  if (searchParams?.version === '1' || searchParams?.version === '2') {
    return searchParams.version as LandingVersion;
  }

  // Check environment variable
  const envVersion = process.env.NEXT_PUBLIC_LANDING_VERSION;
  if (envVersion === '1' || envVersion === '2') {
    return envVersion as LandingVersion;
  }

  return DEFAULT_VERSION;
}
