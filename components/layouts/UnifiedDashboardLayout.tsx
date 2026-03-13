'use client';

import { useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { ClinicalDashboardShell } from '@/components/layouts/ClinicalDashboardShell';
import { cn } from '@/lib/utils';

export type Role = 'ADMIN' | 'DOCTOR' | 'NURSE' | 'FRONTDESK' | 'PATIENT' | 'LAB_TECHNICIAN' | 'CASHIER' | 'THEATER_TECHNICIAN';

export interface RoleConfig {
    role: Role;
    allowedRoles: Role[];
    sidebarComponent: React.ComponentType<{ isOpen: boolean; onClose: () => void }>;
    navItems: NavItem[];
    dashboardHref: string;
    showHeader?: boolean;
    headerComponent?: React.ComponentType;
    variant?: 'default' | 'immersive';
}

interface UnifiedDashboardLayoutProps {
    children: ReactNode;
    config: RoleConfig;
    onLogout: () => void;
    userInfo: UserInfo;
    className?: string;
}

export function UnifiedDashboardLayout({
    children,
    config,
    onLogout,
    userInfo,
    className
}: UnifiedDashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuthContext();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Check if current route is a consultation session (for doctor)
    const isConsultationSession = pathname?.includes('/consultations/') && pathname?.includes('/session');
    const isImmersive = config.variant === 'immersive' || isConsultationSession;

    // Auth validation
    useEffect(() => {
        if (!mounted || authLoading) return;

        // If this layout has specific role requirements
        if (config.allowedRoles && config.allowedRoles.length > 0) {
            if (!user) {
                router.replace('/login');
                return;
            }
            
            if (!config.allowedRoles.includes(user.role as Role)) {
                toast.error(`Access Denied: ${config.role} privileges required`);
                // Redirect to appropriate dashboard based on role
                const roleDashboardMap: Record<Role, string> = {
                    'ADMIN': '/admin/dashboard',
                    'DOCTOR': '/doctor/dashboard',
                    'NURSE': '/nurse/dashboard',
                    'FRONTDESK': '/frontdesk/patients',
                    'PATIENT': '/patient/dashboard',
                    'LAB_TECHNICIAN': '/lab/dashboard',
                    'CASHIER': '/cashier/dashboard',
                    'THEATER_TECHNICIAN': '/theater-tech/dashboard',
                };
                router.replace(roleDashboardMap[user.role as Role] || '/login');
            }
        }
    }, [mounted, authLoading, user, config.allowedRoles, router, config.role]);

    // Loading state
    if (!mounted || authLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="animate-pulse flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <div className="h-4 w-32 bg-slate-100 rounded" />
                </div>
            </div>
        );
    }

    // Auth check failed
    if (config.allowedRoles && config.allowedRoles.length > 0) {
        if (!user || !config.allowedRoles.includes(user.role as Role)) {
            return null;
        }
    }

    const SidebarComponent = config.sidebarComponent;

    return (
        <div className={cn("flex h-screen overflow-hidden bg-background", className)}>
            {/* Mobile Menu Button - Consistent positioning */}
            <button
                onClick={() => setSidebarOpen(true)}
                className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-lg bg-card border border-border shadow-lg hover:bg-muted transition-colors"
                aria-label="Open sidebar"
            >
                <Menu className="h-5 w-5 text-foreground" />
            </button>

            {/* Sidebar */}
            <SidebarComponent isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Content Area */}
            <div className="flex-1 lg:ml-72 flex flex-col min-w-0 h-full overflow-hidden">
                <ClinicalDashboardShell variant={isImmersive ? 'immersive' : 'default'}>
                    {children}
                </ClinicalDashboardShell>
            </div>
        </div>
    );
}

// Re-export for convenience
export { UnifiedSidebar, ClinicalDashboardShell };
