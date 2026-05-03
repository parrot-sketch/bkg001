'use client';

/**
 * UnifiedHeader — shared top navigation bar for all authenticated roles.
 *
 * Design rationale:
 * - The sidebar is slate-950 (dark navy). The header must be visually
 *   connected — not a cold white bar floating above dark content.
 * - Solution: white background with a 3px brand-primary top border and a
 *   very subtle bottom border (border-slate-200). The left edge of the
 *   header aligns with the sidebar's right edge, so the sidebar's accent
 *   colour "bleeds" across into the header top strip.
 * - Breadcrumbs use slate-900 for the active segment and slate-400 for
 *   parent segments — consistent with sidebar section label language.
 * - Avatar fallback uses slate-800 bg + white text matching sidebar dark theme.
 *
 * Props:
 *   roleName       — shown as the root breadcrumb label e.g. "Doctor"
 *   roleLabel      — badge label inside the profile dropdown e.g. "Doctor"
 *   roleBadgeCls   — Tailwind classes for the role badge colour
 *   profileHref    — link for "My Profile" menu item
 *   onMenuClick    — callback for the mobile hamburger button
 *   searchPlaceholder — optional; omit to hide search input
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { useEffect, useState } from 'react';
import {
  ChevronRight, HelpCircle, Menu, Search, User,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UnifiedHeaderProps {
  /** First breadcrumb label — typically the role name e.g. "Doctor" */
  roleName: string;
  /** Badge text in the profile dropdown */
  roleLabel: string;
  /** Tailwind colour classes for the role badge pill */
  roleBadgeCls: string;
  /** "/doctor/profile", "/theater-tech/profile", etc. */
  profileHref: string;
  /** Mobile hamburger callback */
  onMenuClick?: () => void;
  /** Search box placeholder; omit to hide search */
  searchPlaceholder?: string;
}

// ─── Segment label prettifier ──────────────────────────────────────────────────

const LABEL_OVERRIDES: Record<string, string> = {
  'theater-tech': 'Theater Tech',
  'frontdesk':    'Front Desk',
  'surgical-cases': 'Surgical Cases',
  'ward-prep':    'Ward Prep',
  'dayboard':     'Dayboard',
  'theater':      'Theater',
  // add more as needed
};

function toLabel(segment: string): string {
  return (
    LABEL_OVERRIDES[segment] ??
    segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UnifiedHeader({
  roleName,
  roleLabel,
  roleBadgeCls,
  profileHref,
  onMenuClick,
  searchPlaceholder,
}: UnifiedHeaderProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const segments = pathname.split('/').filter(Boolean);

  // Build breadcrumbs — skip UUIDs and pure numeric segments for cleanliness
  const breadcrumbs = segments
    .filter(s => !/^[0-9a-f-]{36}$/.test(s) && !/^\d+$/.test(s))
    .map((segment, i, arr) => ({
      label: toLabel(segment),
      isLast: i === arr.length - 1,
    }));

  // Initials for avatar
  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || '??';

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';

  // SSR skeleton
  if (!mounted) {
    return (
      <div
        className="h-14 shrink-0 border-b border-slate-200 bg-white"
        style={{ borderTop: '3px solid #1E3A5F' }}
      />
    );
  }

  return (
    <header
      className={cn(
        'shrink-0 sticky top-0 z-30',
        'flex h-14 w-full items-center justify-between',
        'bg-white border-b border-slate-200',
        'px-4 sm:px-6',
      )}
      // 3px brand-primary top strip visually connects to sidebar's nav accent
      style={{ borderTop: '3px solid #1E3A5F' }}
    >

      {/* ── Left: hamburger + breadcrumbs ──────────────────────────────────── */}
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">

        {/* Mobile hamburger */}
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            className={cn(
              'lg:hidden flex items-center justify-center h-8 w-8 rounded-lg -ml-1',
              'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
              'transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
            )}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        )}

        {/* Breadcrumb trail */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm overflow-hidden">
          <span className="text-slate-400 font-medium hidden sm:inline shrink-0">{roleName}</span>

          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1 min-w-0">
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" aria-hidden />
              <span
                className={cn(
                  'truncate font-medium',
                  crumb.isLast
                    ? 'text-slate-900'
                    : 'text-slate-400',
                )}
              >
                {crumb.label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* ── Right: search + notifications + avatar ─────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Search (optional) */}
        {searchPlaceholder && (
          <div className="hidden md:flex items-center relative">
            <Search
              className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none"
              aria-hidden
            />
            <input
              type="search"
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className={cn(
                'pl-8 pr-3 py-1.5 h-8 w-52 rounded-lg text-[13px]',
                'bg-slate-50 border border-slate-200',
                'text-slate-900 placeholder-slate-400',
                'outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/40',
                'transition-all',
              )}
            />
          </div>
        )}

        {/* Divider */}
        {searchPlaceholder && (
          <div className="hidden md:block h-5 w-px bg-slate-200 mx-1" aria-hidden />
        )}

        {/* Notification bell */}
        <NotificationBell />

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              aria-label="Open profile menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-brand-primary text-white text-[11px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-slate-900 leading-tight">{displayName}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                <span className={cn('mt-1 inline-flex self-start items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', roleBadgeCls)}>
                  {roleLabel}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={profileHref} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" aria-hidden />
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <HelpCircle className="mr-2 h-4 w-4" aria-hidden />
              Help Centre
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
              onClick={() => logout()}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
