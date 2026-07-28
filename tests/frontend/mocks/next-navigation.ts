/**
 * Next.js Navigation Mocks
 *
 * Provides mock implementations for next/navigation hooks and functions.
 * Use for testing components that consume the App Router navigation API.
 */

import { vi } from 'vitest';

export const mockUseRouter = () => ({
  push: vi.fn(() => Promise.resolve()),
  replace: vi.fn(() => Promise.resolve()),
  prefetch: vi.fn(() => Promise.resolve()),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
});

export const mockUsePathname = () => '/';

export const mockUseSearchParams = () => new URLSearchParams();

export const mockUseParams = () => ({});

export const mockNextNavigation = () => ({
  useRouter: vi.fn(mockUseRouter),
  usePathname: vi.fn(mockUsePathname),
  useSearchParams: vi.fn(mockUseSearchParams),
  useParams: vi.fn(mockUseParams),
  push: vi.fn(() => Promise.resolve()),
  replace: vi.fn(() => Promise.resolve()),
  redirect: vi.fn(),
  notFound: vi.fn(),
  permanentRedirect: vi.fn(),
});
