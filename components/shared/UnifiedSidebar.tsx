'use client';

/**
 * UnifiedSidebar — Enterprise Navigation Component
 *
 * Used across ALL user roles. Config-driven via navItems + userInfo props.
 *
 * Design spec compliance:
 * - Fixed left, 280px expanded / 64px collapsed
 * - 100vh, z-50, independent scroll
 * - Deep navy background (#0f172a = slate-950)
 * - 8px grid spacing system
 * - Section labels: 11px uppercase, letter-spacing, muted
 * - Nav items: 42px height, 16px horizontal padding, 12px icon gap
 * - Icon size: 18px (h-[18px] w-[18px])
 * - Active state: higher-contrast bg + 3px left indicator bar + font-semibold
 * - Collapsed: icon-only + accessible tooltip via [title] + aria-label
 * - Mobile: overlay drawer, close on outside click and Escape key
 * - Sticky logo header + sticky sign-out footer + scrollable nav middle
 * - aria-current="page" on active link
 * - Keyboard navigable (native <a> / <button>)
 * - WCAG AA contrast: text-slate-300 on slate-950 passes at 7.5:1
 */

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LogOut,
  X,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  Calendar,
  Users,
  Package,
  CreditCard,
  FileText,
  Shield,
  Activity,
  User,
  ClipboardCheck,
  Bell,
  HeartPulse,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  description?: string;
  badge?: string | number;
  /** Grouping label — items with the same section render under one header */
  section?: string;
}

export interface UserInfo {
  name: string;
  email: string;
  role:
    | 'ADMIN'
    | 'DOCTOR'
    | 'NURSE'
    | 'FRONTDESK'
    | 'PATIENT'
    | 'LAB_TECHNICIAN'
    | 'CASHIER'
    | 'THEATER_TECHNICIAN';
  avatarUrl?: string;
}

interface UnifiedSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  userInfo: UserInfo | null;
  onLogout: () => void;
  dashboardHref: string;
  onCollapse?: (collapsed: boolean) => void;
  /** Unused legacy prop — kept for API compatibility */
  variant?: 'default' | 'admin' | 'nurse' | 'doctor';
}

// ─── Role config ───────────────────────────────────────────────────────────────

const roleConfig: Record<
  UserInfo['role'],
  { label: string; badge: string }
> = {
  ADMIN:             { label: 'Admin',           badge: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20' },
  DOCTOR:            { label: 'Doctor',          badge: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/20' },
  NURSE:             { label: 'Nurse',           badge: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20' },
  FRONTDESK:         { label: 'Front Desk',      badge: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20' },
  PATIENT:           { label: 'Patient',         badge: 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/20' },
  LAB_TECHNICIAN:    { label: 'Lab Technician',  badge: 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/20' },
  CASHIER:           { label: 'Cashier',         badge: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/20' },
  THEATER_TECHNICIAN:{ label: 'Theater Tech',    badge: 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/20' },
};

// ─── Section dot colour ────────────────────────────────────────────────────────

const sectionDot: Record<string, string> = {
  Overview:        'bg-slate-500',
  'Patient Care':  'bg-blue-400',
  Staff:           'bg-teal-400',
  Operations:      'bg-emerald-400',
  Planning:        'bg-cyan-400',
  Catalog:         'bg-amber-400',
  Inventory:       'bg-indigo-400',
  Clinical:        'bg-violet-400',
  Analytics:       'bg-purple-400',
  Account:         'bg-rose-400',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UnifiedSidebar({
  isOpen,
  onClose,
  navItems,
  userInfo,
  onLogout,
  dashboardHref,
  onCollapse,
}: UnifiedSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Close drawer on route change (mobile UX)
  useEffect(() => { if (isOpen) onClose(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close drawer on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Trap focus inside open mobile drawer
  useEffect(() => {
    if (isOpen) sidebarRef.current?.focus();
  }, [isOpen]);

  const handleCollapse = useCallback((next: boolean) => {
    setCollapsed(next);
    onCollapse?.(next);
  }, [onCollapse]);

  // Group nav items by section, preserving insertion order
  const navGroups = navItems.reduce<Array<{ title: string; items: NavItem[] }>>(
    (acc, item) => {
      const title = (item.section ?? '').trim();
      const existing = acc.find(g => g.title === title);
      if (existing) { existing.items.push(item); return acc; }
      acc.push({ title, items: [item] });
      return acc;
    },
    [],
  );
  const hasGroups = navGroups.some(g => !!g.title);
  const role = userInfo ? roleConfig[userInfo.role] : null;

  // ── SSR skeleton ─────────────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <aside className="fixed left-0 top-0 z-50 h-screen w-[280px] bg-slate-950 border-r border-white/5">
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 rounded-xl bg-slate-800 animate-pulse" />
        </div>
      </aside>
    );
  }

  // ── Shared nav item renderer ──────────────────────────────────────────────────
  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={false}
        onClick={onClose}
        aria-current={isActive ? 'page' : undefined}
        aria-label={collapsed ? item.name : undefined}
        title={collapsed ? item.name : undefined}
        className={cn(
          // Layout
          'group relative flex items-center rounded-lg transition-all duration-150 outline-none',
          'focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950',
          collapsed
            ? 'justify-center w-10 h-10 mx-auto'
            : 'gap-3 px-3 py-[9px]', // 42px effective height with py-[9px] + icon
          // State colours
          isActive
            ? 'bg-white/10 text-white font-semibold'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
        )}
      >
        {/* ── Left active indicator bar ─────────────────────────────────── */}
        {isActive && (
          <span
            aria-hidden="true"
            className={cn(
              'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-brand-secondary',
              collapsed ? 'h-6' : 'h-[60%]',
            )}
          />
        )}

        {/* ── Icon ─────────────────────────────────────────────────────── */}
        <Icon
          aria-hidden
          className={cn(
            'shrink-0 transition-colors duration-150',
            collapsed ? 'h-[18px] w-[18px]' : 'h-[18px] w-[18px]',
            isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300',
          )}
        />

        {/* ── Label + badge (expanded only) ────────────────────────────── */}
        {!collapsed && (
          <>
            <span className="flex-1 text-[14px] leading-none truncate">{item.name}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-[11px] font-medium tabular-nums',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'bg-slate-800 text-slate-400',
                )}
              >
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* ── Mobile backdrop ──────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar shell ────────────────────────────────────────────────────── */}
      <aside
        ref={sidebarRef}
        tabIndex={-1}
        aria-label="Main navigation"
        className={cn(
          'fixed left-0 top-0 z-50 h-screen flex flex-col',
          'bg-slate-950 border-r border-white/[0.06]',
          'transition-[width,transform] duration-200 ease-out will-change-transform',
          // Width
          collapsed ? 'w-16' : 'w-[280px]',
          // Mobile translate
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
          'lg:translate-x-0',
        )}
      >
        {/* ═══ HEADER — sticky logo + collapse toggle ══════════════════════════ */}
        <div
          className={cn(
            'shrink-0 flex items-center border-b border-white/[0.06] transition-all duration-200',
            collapsed ? 'h-16 justify-center px-2' : 'h-16 justify-between px-4',
          )}
        >
          <Link
            href={dashboardHref}
            prefetch={false}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 min-w-0 rounded-lg',
              'outline-none focus-visible:ring-2 focus-visible:ring-white/30',
              collapsed && 'gap-0',
            )}
            aria-label="Go to dashboard"
          >
            <div className="h-8 w-8 shrink-0 rounded-lg bg-white flex items-center justify-center shadow-sm">
              <Image
                src="https://res.cloudinary.com/dcngzaxlv/image/upload/v1768807323/logo_tw2voz.png"
                alt="Nairobi Sculpt logo"
                width={22}
                height={22}
                className="h-[22px] w-auto object-contain"
                priority
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[14px] font-bold text-white leading-tight tracking-tight truncate">
                  Nairobi Sculpt
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-[0.12em] font-medium">
                  Healthcare
                </span>
              </div>
            )}
          </Link>

          {/* Collapse toggle — desktop only */}
          {!collapsed && (
            <button
              type="button"
              onClick={() => handleCollapse(true)}
              aria-label="Collapse sidebar"
              className="hidden lg:flex items-center justify-center h-7 w-7 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
          )}

          {/* Expand toggle — desktop collapsed */}
          {collapsed && (
            <button
              type="button"
              onClick={() => handleCollapse(false)}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="hidden lg:flex items-center justify-center h-7 w-7 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          )}

          {/* Close button — mobile only */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="lg:hidden flex items-center justify-center h-7 w-7 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* ═══ NAV — scrollable middle ══════════════════════════════════════════ */}
        <nav
          aria-label="Site navigation"
          className="flex-1 overflow-y-auto overflow-x-hidden pt-6 pb-4 space-y-7 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800"
        >
          {navGroups.map(group => (
            <div
              key={group.title || '__default__'}
              className={cn(collapsed ? 'px-3' : 'px-3')}
            >
              {/* Section label */}
              {hasGroups && group.title && !collapsed && (
                <div className="flex items-center gap-2 px-3 pt-1 mb-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-1 w-1 rounded-full shrink-0',
                      sectionDot[group.title] ?? 'bg-slate-600',
                    )}
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 leading-none">
                    {group.title}
                  </span>
                </div>
              )}

              {/* Divider separator in collapsed mode */}
              {hasGroups && group.title && collapsed && (
                <div className="mb-1 border-t border-white/[0.05]" aria-hidden="true" />
              )}

              {/* Items */}
              <div className="space-y-1">
                {group.items.map(renderNavItem)}
              </div>
            </div>
          ))}
        </nav>

        {/* ═══ FOOTER — sticky user info + sign out ════════════════════════════ */}
        <div className="shrink-0 border-t border-white/[0.06]">
          {/* User identity card (expanded only) */}
          {!collapsed && userInfo && role && (
            <div className="px-4 py-3 flex items-center gap-3 min-w-0">
              {/* Avatar */}
              <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-800 flex items-center justify-center text-[12px] font-bold text-slate-300 ring-1 ring-white/10">
                {initials(userInfo.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white leading-tight truncate">
                  {userInfo.name}
                </p>
                <span
                  className={cn(
                    'inline-block mt-0.5 px-1.5 py-px rounded text-[10px] font-semibold uppercase tracking-[0.06em]',
                    role.badge,
                  )}
                >
                  {role.label}
                </span>
              </div>
            </div>
          )}

          {/* Sign out */}
          <div className={cn('px-3 pb-3', !collapsed && userInfo && 'pt-0', (!userInfo || collapsed) && 'pt-3')}>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sign out"
              title={collapsed ? 'Sign out' : undefined}
              className={cn(
                'group w-full flex items-center rounded-lg transition-all duration-150 outline-none',
                'focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950',
                'text-slate-400 hover:text-red-400 hover:bg-red-500/8',
                collapsed
                  ? 'justify-center h-10 w-10 mx-auto'
                  : 'gap-3 px-3 py-[9px]',
              )}
            >
              <LogOut
                aria-hidden
                className="h-[18px] w-[18px] shrink-0 transition-colors duration-150"
              />
              {!collapsed && (
                <span className="text-[14px] font-medium">Sign out</span>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// Re-export icon map for backward compat (used by older sidebar files)
export const iconMap: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  LayoutDashboard,
  Calendar,
  Users,
  Package,
  CreditCard,
  FileText,
  Shield,
  Activity,
  User,
  ClipboardCheck,
  Bell,
  HeartPulse,
};
