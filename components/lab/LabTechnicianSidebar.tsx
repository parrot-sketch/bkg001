'use client';

/**
 * Lab Technician Sidebar Navigation
 * 
 * Uses the UnifiedSidebar component for consistent design.
 */

import { LayoutDashboard, FileText, Users, User, TestTube, ClipboardList } from 'lucide-react';
import { UnifiedSidebar, NavItem, UserInfo } from '@/components/shared/UnifiedSidebar';
import { useAuth } from '@/hooks/patient/useAuth';

const navItems: NavItem[] = [
    {
        name: 'Dashboard',
        href: '/lab/dashboard',
        icon: LayoutDashboard,
    },
    {
        name: 'Lab Requests',
        href: '/lab/requests',
        icon: ClipboardList,
    },
    {
        name: 'Test Results',
        href: '/lab/results',
        icon: TestTube,
    },
    {
        name: 'Patients',
        href: '/lab/patients',
        icon: Users,
    },
    {
        name: 'My Profile',
        href: '/lab/profile',
        icon: User,
    },
];

interface LabTechnicianSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LabTechnicianSidebar({ isOpen, onClose }: LabTechnicianSidebarProps) {
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
            role: 'LAB_TECHNICIAN',
        }
        : null;

    return (
        <UnifiedSidebar
            isOpen={isOpen}
            onClose={onClose}
            navItems={navItems}
            userInfo={userInfo}
            onLogout={handleLogout}
            dashboardHref="/lab/dashboard"
        />
    );
}
