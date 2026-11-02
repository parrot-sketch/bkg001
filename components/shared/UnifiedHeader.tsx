/**
 * Responsive fix for 1920×1200 viewport:
 * - Breadcrumb role name: text-sm → text-xs (more compact vertical density)
 */

/**
 * UnifiedHeader — shared top navigation bar for all authenticated roles.
 *
 * The header uses the same navy as the sidebar so the two read as one frame.
 * Champagne is only the quiet edge under that frame. The page photograph
 * stays in the content area below.
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
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { useEffect, useState } from 'react';
import {
  ChevronRight, HelpCircle, Menu, User,
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
import { HeaderSearch } from '@/components/shared/HeaderSearch';
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
  /** Root dashboard href for the role breadcrumb, e.g. "/doctor/dashboard" */
  rootHref: string;
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

const ROOT_SEGMENTS = new Set(Object.keys(LABEL_OVERRIDES));

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
  rootHref,
  onMenuClick,
  searchPlaceholder,
}: UnifiedHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const segments = pathname.split('/').filter(Boolean);

  const breadcrumbs = segments
    .filter((s, i) => i > 0 && !/^[0-9a-f-]{36}$/.test(s) && !/^\d+$/.test(s) && !ROOT_SEGMENTS.has(s))
    .map((segment, i, arr) => ({
      label: toLabel(segment),
      href: '/' + segments.slice(0, segments.indexOf(segment) + 1).join('/'),
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
      <div className="h-14 shrink-0 border-b border-[#e7d6bf]/30 bg-[#2c2e4b]" />
    );
  }

  return (
    <header
      className={cn(
        'shrink-0 sticky top-0 z-30',
        'flex h-14 w-full items-center justify-between',
        'bg-[#2c2e4b] border-b border-[#e7d6bf]/30',
        'px-4 sm:px-6',
      )}
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
              'text-[#e7d6bf] hover:text-white hover:bg-white/10',
              'transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-primary',
            )}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        )}

        {/* Breadcrumb trail */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs overflow-hidden">
          <Link
            href={rootHref}
            className="text-[#e7d6bf]/70 font-medium hidden sm:inline shrink-0 hover:text-white transition-colors"
          >
            {roleName}
          </Link>

          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1 min-w-0">
              <ChevronRight className="h-3.5 w-3.5 text-[#e7d6bf]/40 shrink-0" aria-hidden />
              {crumb.isLast ? (
                <span className="truncate font-medium text-white">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate font-medium text-[#e7d6bf]/70 hover:text-white transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* ── Right: search + notifications + avatar ─────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Search (optional) */}
        {searchPlaceholder && <HeaderSearch placeholder={searchPlaceholder} />}

        {/* Divider */}
        {searchPlaceholder && (
          <div className="hidden md:block h-5 w-px bg-[#e7d6bf]/30 mx-1" aria-hidden />
        )}

        {/* Notification bell */}
        <NotificationBell />

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-[#e7d6bf]/50"
              aria-label="Open profile menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#e7d6bf] text-[#2c2e4b] text-[11px] font-bold">
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
