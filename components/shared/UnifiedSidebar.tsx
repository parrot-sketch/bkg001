'use client';

/**
 * Unified Sidebar Component - Enhanced Version
 * 
 * A sophisticated, professional sidebar used across all user roles.
 * Features:
 * - Glass-morphism with refined color palette
 * - Smooth micro-interactions and animations
 * - Enhanced typography hierarchy
 * - Better mobile responsiveness
 * - Role-specific accent styling
 */

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut, X, ChevronRight, ChevronLeft, LayoutDashboard, Calendar, Users, Package, CreditCard, FileText, Shield, Activity, User, ClipboardCheck, Bell, HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    description?: string;
    badge?: string | number;
}

export interface UserInfo {
    name: string;
    email: string;
    role: 'ADMIN' | 'DOCTOR' | 'NURSE' | 'FRONTDESK' | 'PATIENT' | 'LAB_TECHNICIAN' | 'CASHIER' | 'THEATER_TECHNICIAN';
    avatarUrl?: string;
}

interface UnifiedSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    navItems: NavItem[];
    userInfo: UserInfo | null;
    onLogout: () => void;
    dashboardHref: string;
    variant?: 'default' | 'admin' | 'nurse' | 'doctor';
    onCollapse?: (collapsed: boolean) => void;
}

const roleConfig = {
    ADMIN: {
        label: 'Admin',
        badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        accentColor: 'from-blue-500 to-blue-600',
        iconBg: 'bg-blue-500/10 text-blue-400',
        hoverBg: 'hover:bg-blue-500/10',
    },
    DOCTOR: {
        label: 'Doctor',
        badgeColor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
        accentColor: 'from-violet-500 to-violet-600',
        iconBg: 'bg-violet-500/10 text-violet-400',
        hoverBg: 'hover:bg-violet-500/10',
    },
    NURSE: {
        label: 'Nurse',
        badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        accentColor: 'from-emerald-500 to-emerald-600',
        iconBg: 'bg-emerald-500/10 text-emerald-400',
        hoverBg: 'hover:bg-emerald-500/10',
    },
    FRONTDESK: {
        label: 'Front Desk',
        badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        accentColor: 'from-amber-500 to-amber-600',
        iconBg: 'bg-amber-500/10 text-amber-400',
        hoverBg: 'hover:bg-amber-500/10',
    },
    PATIENT: {
        label: 'Patient',
        badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        accentColor: 'from-indigo-500 to-indigo-600',
        iconBg: 'bg-indigo-500/10 text-indigo-400',
        hoverBg: 'hover:bg-indigo-500/10',
    },
    LAB_TECHNICIAN: {
        label: 'Lab Tech',
        badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
        accentColor: 'from-teal-500 to-teal-600',
        iconBg: 'bg-teal-500/10 text-teal-400',
        hoverBg: 'hover:bg-teal-500/10',
    },
    CASHIER: {
        label: 'Cashier',
        badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        accentColor: 'from-rose-500 to-rose-600',
        iconBg: 'bg-rose-500/10 text-rose-400',
        hoverBg: 'hover:bg-rose-500/10',
    },
    THEATER_TECHNICIAN: {
        label: 'Theater Tech',
        badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        accentColor: 'from-cyan-500 to-cyan-600',
        iconBg: 'bg-cyan-500/10 text-cyan-400',
        hoverBg: 'hover:bg-cyan-500/10',
    },
};

// Icon mapping for common icons to ensure consistency
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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
    const [mounted, setMounted] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close sidebar when navigating on mobile
    useEffect(() => {
        if (isOpen) {
            onClose();
        }
    }, [pathname]);

    const handleCollapse = (newState: boolean) => {
        setCollapsed(newState);
        onCollapse?.(newState);
    };

    const roleInfo = userInfo ? roleConfig[userInfo.role] : null;

    // Get initials from name
    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    if (!mounted) {
        return (
            <aside className="fixed left-0 top-0 z-50 h-screen w-72 bg-slate-950 border-r border-slate-800/50 lg:translate-x-0 -translate-x-full lg:translate-x-0">
                <div className="flex h-full items-center justify-center">
                    <div className="h-8 w-8 rounded-lg bg-slate-800 animate-pulse" />
                </div>
            </aside>
        );
    }

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-md lg:hidden animate-in fade-in duration-200"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed left-0 top-0 z-50 h-screen bg-slate-950/95 backdrop-blur-xl border-r border-slate-800/30 transition-all duration-300 ease-out',
                    collapsed ? 'w-16' : 'w-[280px]',
                    isOpen ? 'translate-x-0' : '-translate-x-full',
                    'lg:translate-x-0'
                )}
            >
                {/* Gradient Orbs - Decorative */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl" />
                </div>

                <div className="relative flex h-full flex-col">
                    {/* Logo Section */}
                    <div className={cn(
                        'flex items-center justify-between border-b border-slate-800/30 transition-all duration-300',
                        collapsed ? 'h-16 px-3' : 'h-20 px-6'
                    )}>
                        <Link
                            href={dashboardHref}
                            className={cn(
                                'flex items-center group transition-all duration-300',
                                collapsed ? 'gap-0' : 'gap-3'
                            )}
                            onClick={onClose}
                        >
                            <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-black/10 group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                                <Image
                                    src="https://res.cloudinary.com/dcngzaxlv/image/upload/v1768807323/logo_tw2voz.png"
                                    alt="Logo"
                                    width={28}
                                    height={28}
                                    className="h-7 w-auto object-contain"
                                    priority
                                />
                            </div>
                            {!collapsed && (
                                <div className="flex flex-col">
                                    <span className="text-base font-bold text-white tracking-tight">
                                        Nairobi Sculpt
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">
                                        Healthcare
                                    </span>
                                </div>
                            )}
                        </Link>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="hidden lg:flex text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg flex-shrink-0"
                                onClick={() => handleCollapse(!collapsed)}
                                aria-label="Toggle sidebar"
                            >
                                {collapsed ? (
                                    <ChevronRight className="h-4 w-4" />
                                ) : (
                                    <ChevronLeft className="h-4 w-4" />
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg flex-shrink-0"
                                onClick={onClose}
                                aria-label="Close menu"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Navigation Section */}
                    <nav className="flex-1 overflow-y-auto pt-6">
                        <div className={cn('space-y-1', collapsed ? 'px-2' : 'px-3')}>
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive =
                                    pathname === item.href || pathname?.startsWith(item.href + '/');

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={onClose}
                                        title={collapsed ? item.name : undefined}
                                        className={cn(
                                            'group flex items-center rounded-xl transition-all duration-200 relative overflow-hidden',
                                            collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3',
                                            'text-sm font-medium',
                                            isActive
                                                ? 'bg-gradient-to-r from-slate-800/80 to-slate-800/40 text-white shadow-lg shadow-black/10'
                                                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                                        )}
                                    >
                                        {/* Active indicator */}
                                        {isActive && (
                                            <div className={cn(
                                                "absolute bg-gradient-to-b from-blue-500 to-violet-500 rounded-r-full",
                                                collapsed ? 'left-0 top-0 w-1 h-full' : 'left-0 top-1/2 -translate-y-1/2 w-1 h-6'
                                            )} />
                                        )}
                                        
                                        <div className={cn(
                                            "rounded-lg flex-shrink-0 transition-all duration-200",
                                            collapsed ? 'p-2' : 'p-2',
                                            isActive
                                                ? "bg-white/10 text-white"
                                                : "bg-slate-800/50 text-slate-500 group-hover:text-white group-hover:bg-slate-700/50"
                                        )}>
                                            <Icon className={cn('transition-all', collapsed ? 'h-5 w-5' : 'h-4 w-4')} />
                                        </div>
                                        
                                        {!collapsed && (
                                            <>
                                                <span className="flex-1">{item.name}</span>
                                                
                                                {item.badge && (
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-xs font-medium",
                                                        isActive
                                                            ? "bg-white/10 text-white"
                                                            : "bg-slate-800 text-slate-400"
                                                    )}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                                
                                                {isActive && (
                                                    <ChevronRight className="h-4 w-4 text-slate-400" />
                                                )}
                                            </>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Footer / Logout Section */}
                    <div className={cn('border-t border-slate-800/30 transition-all duration-300', collapsed ? 'p-2' : 'p-4')}>
                        {!collapsed && (
                            <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-800/30 mb-3">
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-2">
                                    Quick Actions
                                </p>
                                <div className="flex gap-2">
                                    <Link
                                        href={dashboardHref}
                                        className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-slate-800/50 text-slate-400 text-xs font-medium hover:bg-slate-700/50 hover:text-white transition-all"
                                    >
                                        <LayoutDashboard className="h-3.5 w-3.5" />
                                        Dashboard
                                    </Link>
                                </div>
                            </div>
                        )}
                        
                        <Button
                            variant="ghost"
                            onClick={onLogout}
                            className={cn(
                                'group border border-transparent rounded-xl transition-all duration-200',
                                collapsed ? 'w-full flex justify-center p-3 h-auto' : 'w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 py-3 h-auto text-slate-400 hover:text-white hover:bg-red-500/10'
                            )}
                            title={collapsed ? 'Sign Out' : undefined}
                        >
                            <LogOut className="h-5 w-5 group-hover:text-red-400 transition-colors flex-shrink-0" />
                            {!collapsed && <span className="font-medium">Sign Out</span>}
                        </Button>
                        
                        {!collapsed && (
                            <p className="text-[10px] text-slate-600 text-center mt-3">
                                Nairobi Sculpt v1.0
                            </p>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}
