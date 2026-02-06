'use client';

/**
 * Unified Sidebar Component
 * 
 * A consistent, professional sidebar used across all user roles.
 * Features:
 * - Role-specific badge with color coding
 * - Mobile-responsive with overlay
 * - Well-spaced navigation items
 * - Clean visual hierarchy
 */

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

export interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    description?: string;
}

export interface UserInfo {
    name: string;
    email: string;
    role: 'ADMIN' | 'DOCTOR' | 'NURSE' | 'FRONTDESK' | 'PATIENT' | 'LAB_TECHNICIAN' | 'CASHIER';
}

interface UnifiedSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    navItems: NavItem[];
    userInfo: UserInfo | null;
    onLogout: () => void;
    dashboardHref: string;
}

const roleConfig = {
    ADMIN: {
        label: 'Admin',
        badgeColor: 'bg-blue-600 text-white',
        accentColor: 'from-blue-600 to-blue-700',
    },
    DOCTOR: {
        label: 'Doctor',
        badgeColor: 'bg-violet-600 text-white',
        accentColor: 'from-violet-600 to-violet-700',
    },
    NURSE: {
        label: 'Nurse',
        badgeColor: 'bg-emerald-600 text-white',
        accentColor: 'from-emerald-600 to-emerald-700',
    },
    FRONTDESK: {
        label: 'Front Desk',
        badgeColor: 'bg-amber-600 text-white',
        accentColor: 'from-amber-600 to-amber-700',
    },
    PATIENT: {
        label: 'Patient',
        badgeColor: 'bg-indigo-600 text-white',
        accentColor: 'from-indigo-600 to-indigo-700',
    },
    LAB_TECHNICIAN: {
        label: 'Lab Tech',
        badgeColor: 'bg-teal-600 text-white',
        accentColor: 'from-teal-600 to-teal-700',
    },
    CASHIER: {
        label: 'Cashier',
        badgeColor: 'bg-rose-600 text-white',
        accentColor: 'from-rose-600 to-rose-700',
    },
};

export function UnifiedSidebar({
    isOpen,
    onClose,
    navItems,
    userInfo,
    onLogout,
    dashboardHref,
}: UnifiedSidebarProps) {
    const pathname = usePathname();

    // Close sidebar when navigating on mobile
    useEffect(() => {
        if (isOpen) {
            onClose();
        }
    }, [pathname]);

    const roleInfo = userInfo ? roleConfig[userInfo.role] : null;

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed left-0 top-0 z-50 h-screen w-72 bg-slate-900 transition-transform duration-300 ease-in-out',
                    isOpen ? 'translate-x-0' : '-translate-x-full',
                    'lg:translate-x-0'
                )}
            >
                <div className="flex h-full flex-col">
                    {/* Logo Section */}
                    <div className="flex h-20 items-center justify-between px-6 border-b border-slate-800">
                        <Link
                            href={dashboardHref}
                            className="flex items-center gap-3"
                            onClick={onClose}
                        >
                            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                <Image
                                    src="https://res.cloudinary.com/dcngzaxlv/image/upload/v1768807323/logo_tw2voz.png"
                                    alt="Logo"
                                    width={28}
                                    height={28}
                                    className="h-7 w-auto object-contain"
                                    priority
                                />
                            </div>
                            <span className="text-lg font-bold text-white tracking-tight">
                                Nairobi Sculpt
                            </span>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden text-slate-400 hover:text-white hover:bg-slate-800"
                            onClick={onClose}
                            aria-label="Close menu"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* User Info Section */}
                    {userInfo && roleInfo && (
                        <div className="px-6 py-5 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "h-11 w-11 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm",
                                    roleInfo.accentColor
                                )}>
                                    {userInfo.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">
                                        {userInfo.name}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">
                                        {userInfo.email}
                                    </p>
                                </div>
                            </div>
                            <Badge
                                className={cn(
                                    'mt-3 text-[10px] font-bold uppercase tracking-wider border-0',
                                    roleInfo.badgeColor
                                )}
                            >
                                {roleInfo.label}
                            </Badge>
                        </div>
                    )}

                    {/* Navigation Section */}
                    <nav className="flex-1 overflow-y-auto px-4 py-6">
                        <div className="space-y-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive =
                                    pathname === item.href || pathname?.startsWith(item.href + '/');

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={onClose}
                                        className={cn(
                                            'group flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-200',
                                            isActive
                                                ? 'bg-white text-slate-900 shadow-lg shadow-white/10'
                                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                        )}
                                    >
                                        <Icon className={cn(
                                            "h-5 w-5 flex-shrink-0 transition-colors",
                                            isActive ? "text-slate-900" : "text-slate-400 group-hover:text-white"
                                        )} />
                                        <span className="flex-1">{item.name}</span>
                                        {isActive && (
                                            <ChevronRight className="h-4 w-4 text-slate-400" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Footer / Logout Section */}
                    <div className="p-4 border-t border-slate-800">
                        <Button
                            variant="ghost"
                            onClick={onLogout}
                            className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl py-3 h-auto"
                        >
                            <LogOut className="h-5 w-5" />
                            <span className="font-medium">Sign Out</span>
                        </Button>
                    </div>
                </div>
            </aside>
        </>
    );
}
