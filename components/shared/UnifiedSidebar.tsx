'use client';

/**
 * UnifiedSidebar — Branded Navigation Component
 *
 * Used across ALL user roles. Config-driven via navItems + userInfo props.
 *
 * Design spec:
 * - Fixed left, 280px expanded / 64px collapsed
 * - 100vh, z-50, independent scroll
 * - Brand navy background (#2c2e4b)
 * - 8px grid spacing system
 * - Section labels: 11px uppercase, letter-spacing, muted
 * - Nav items: 42px height, 16px horizontal padding, 12px icon gap
 * - Icon size: 18px (h-[18px] w-[18px])
 * - Active state: brand-gold tint bg + 3px left indicator bar + brand-gold text
 * - Collapsed: icon-only + accessible tooltip via [title] + aria-label
 * - Mobile: overlay drawer, close on outside click and Escape key
 * - Sticky logo header + sticky sign-out footer + scrollable nav middle
 * - aria-current="page" on active link
 * - Keyboard navigable (native <a> / <button>)
 */

import Link from 'next/link';
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
  ADMIN:             { label: 'Admin',           badge: 'bg-[#caa26a]/15 text-[#caa26a] ring-1 ring-[#caa26a]/20' },
  DOCTOR:            { label: 'Doctor',          badge: 'bg-[#0c5d69]/20 text-[#0c5d69] ring-1 ring-[#0c5d69]/30' },
  NURSE:             { label: 'Nurse',           badge: 'bg-[#e7d6bf]/20 text-[#e7d6bf] ring-1 ring-[#e7d6bf]/20' },
  FRONTDESK:         { label: 'Front Desk',      badge: 'bg-[#caa26a]/15 text-[#caa26a] ring-1 ring-[#caa26a]/20' },
  PATIENT:           { label: 'Patient',         badge: 'bg-[#0c5d69]/20 text-[#0c5d69] ring-1 ring-[#0c5d69]/30' },
  LAB_TECHNICIAN:    { label: 'Lab Technician',  badge: 'bg-[#e7d6bf]/20 text-[#e7d6bf] ring-1 ring-[#e7d6bf]/20' },
  CASHIER:           { label: 'Cashier',         badge: 'bg-[#caa26a]/15 text-[#caa26a] ring-1 ring-[#caa26a]/20' },
  THEATER_TECHNICIAN:{ label: 'Theater Tech',    badge: 'bg-[#0c5d69]/20 text-[#0c5d69] ring-1 ring-[#0c5d69]/30' },
};

// ─── Section dot colour ────────────────────────────────────────────────────────

const sectionDot: Record<string, string> = {
  Overview:        'bg-[#caa26a]',
  'Patient Care':  'bg-[#0c5d69]',
  Staff:           'bg-[#e7d6bf]',
  Operations:      'bg-[#caa26a]',
  Planning:        'bg-[#0c5d69]',
  Catalog:         'bg-[#caa26a]',
  Inventory:       'bg-[#e7d6bf]',
  Clinical:        'bg-[#0c5d69]',
  Analytics:       'bg-[#caa26a]',
  'Billing & Finance': 'bg-[#caa26a]',
  Account:         'bg-[#e7d6bf]',
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
      <aside className="fixed left-0 top-0 z-50 h-screen w-[280px] bg-[#2c2e4b] border-r border-[#e7d6bf]/10">
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 rounded-xl bg-[#e7d6bf]/20 animate-pulse" />
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
          'focus-visible:ring-2 focus-visible:ring-[#caa26a]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#2c2e4b]',
          collapsed
            ? 'justify-center w-10 h-10 mx-auto'
            : 'gap-3 px-3 py-[9px]',
          // State colours
          isActive
            ? 'bg-[#caa26a]/12 text-white font-semibold'
            : 'text-white/80 hover:bg-[#caa26a]/10 hover:text-white',
        )}
      >
        {/* ── Left active indicator bar ─────────────────────────────────── */}
        {isActive && (
          <span
            aria-hidden="true"
            className={cn(
              'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-[#caa26a]',
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
            isActive ? 'text-[#caa26a]' : 'text-white/60 group-hover:text-white',
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
                   typeof item.badge === 'number' && item.badge > 0 && 'animate-pulse',
                   isActive
                     ? 'bg-[#caa26a]/15 text-[#caa26a]'
                     : 'bg-white/10 text-white/80',
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
          className="fixed inset-0 z-40 bg-[#2c2e4b]/70 backdrop-blur-sm lg:hidden"
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
          'bg-[#2c2e4b] border-r border-[#e7d6bf]/10',
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
            'shrink-0 flex items-center border-b border-[#e7d6bf]/10 transition-all duration-200',
            collapsed ? 'h-16 justify-center px-2' : 'h-16 justify-between px-4',
          )}
        >
          <Link
            href={dashboardHref}
            prefetch={false}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 min-w-0 rounded-lg',
              'outline-none focus-visible:ring-2 focus-visible:ring-[#caa26a]/40',
              collapsed && 'gap-0',
            )}
            aria-label="Go to dashboard"
          >
            <div className="h-8 w-8 shrink-0 rounded-lg bg-white border border-[#e7d6bf] flex items-center justify-center shadow-sm">
              <img
                src="/logo.png"
                alt="Nairobi Sculpt logo"
                width={22}
                height={22}
                className="h-[22px] w-auto object-contain"
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[14px] font-bold text-white leading-tight tracking-tight truncate">
                  Nairobi Sculpt
                </span>
                <span className="text-[10px] text-[#e7d6bf]/60 uppercase tracking-[0.12em] font-medium">
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
              className="hidden lg:flex items-center justify-center h-7 w-7 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#caa26a]/40"
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
              className="hidden lg:flex items-center justify-center h-7 w-7 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#caa26a]/40"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          )}

          {/* Close button — mobile only */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="lg:hidden flex items-center justify-center h-7 w-7 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#caa26a]/40"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* ═══ NAV — scrollable middle ══════════════════════════════════════════ */}
        <nav
          aria-label="Site navigation"
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#e7d6bf]/20',
            'flex flex-col py-5',
            // More breathing room + clearer hierarchy across long menus
            collapsed ? 'gap-4' : 'gap-9',
          )}
        >
          {/* Single-section fallback label (e.g. Patient sidebar) */}
          {!hasGroups && !collapsed && (
            <div className="px-6 pt-1">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40 leading-none">
                  Navigation
                </span>
                <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
              </div>
            </div>
          )}

          {navGroups.map((group, idx) => {
            const isAccount = hasGroups && group.title.trim().toLowerCase() === 'account';
            const showGroupDivider = hasGroups && !collapsed && idx !== 0;

            return (
              <div
                key={group.title || '__default__'}
                className={cn(
                  'px-3',
                  // Use available height: keep account/actions visually anchored near the bottom
                  isAccount && !collapsed && 'mt-auto pt-4',
                )}
              >
                {showGroupDivider && (
                  <div
                    className={cn('h-px bg-[#e7d6bf]/10', isAccount ? 'my-3' : 'my-4')}
                    aria-hidden="true"
                  />
                )}
                {/* Section label */}
                {hasGroups && group.title && !collapsed && (
                  <div className="flex items-center gap-3 px-3 pt-0.5 mb-4">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-1.5 w-1.5 rounded-full shrink-0',
                        sectionDot[group.title] ?? 'bg-[#e7d6bf]',
                      )}
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 leading-none">
                      {group.title}
                    </span>
                    <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
                  </div>
                )}

                {/* Divider separator in collapsed mode */}
                {hasGroups && group.title && collapsed && (
                  <div className="mb-2 border-t border-[#e7d6bf]/10" aria-hidden="true" />
                )}

                {/* Items */}
                <div className={cn(collapsed ? 'space-y-2' : 'space-y-2')}>
                  {group.items.map(renderNavItem)}
                </div>
              </div>
            );
          })}
        </nav>

        {/* ═══ FOOTER — sticky user info + sign out ════════════════════════════ */}
        <div className="shrink-0 border-t border-[#e7d6bf]/10">
          {/* User identity card (expanded only) */}
          {!collapsed && userInfo && role && (
            <div className="px-4 py-3 flex items-center gap-3 min-w-0">
              {/* Avatar */}
              <div className="h-8 w-8 shrink-0 rounded-lg bg-[#2c2e4b] border border-[#e7d6bf]/20 flex items-center justify-center text-[12px] font-bold text-[#caa26a] ring-1 ring-[#e7d6bf]/10">
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
                'focus-visible:ring-2 focus-visible:ring-[#caa26a]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#2c2e4b]',
                'text-white/60 hover:text-red-400 hover:bg-red-500/10',
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