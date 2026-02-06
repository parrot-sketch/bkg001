'use client';

/**
 * Cashier Sidebar Navigation
 * 
 * Uses the UnifiedSidebar component for consistent design.
 */

import { LayoutDashboard, CreditCard, FileText, Users, BarChart3, User } from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

const navItems: NavItem[] = [
    {
        name: 'Dashboard',
        href: '/cashier/dashboard',
        icon: LayoutDashboard,
    },
    {
        name: 'Payments',
        href: '/cashier/payments',
        icon: CreditCard,
    },
    {
        name: 'Invoices',
        href: '/cashier/invoices',
        icon: FileText,
    },
    {
        name: 'Patients',
        href: '/cashier/patients',
        icon: Users,
    },
    {
        name: 'Reports',
        href: '/cashier/reports',
        icon: BarChart3,
    },
    {
        name: 'My Profile',
        href: '/cashier/profile',
        icon: User,
    },
];

interface CashierSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CashierSidebar({ isOpen, onClose }: CashierSidebarProps) {
    const { logout, user } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const userInfo: UserInfo | null = user
        ? {
            name: user.firstName || user.email,
            email: user.email,
            role: 'CASHIER',
        }
        : null;

    return (
        <UnifiedSidebar
            isOpen={isOpen}
            onClose={onClose}
            navItems={navItems}
            userInfo={userInfo}
            onLogout={handleLogout}
            dashboardHref="/cashier/dashboard"
        />
    );
}
