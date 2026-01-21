'use client';

/**
 * Patient Sidebar Navigation
 * 
 * Clean, elegant sidebar navigation for the Patient Dashboard.
 * Reflects Nairobi Sculpt branding with minimal, professional design.
 */

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, FileText, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/patient/useAuth';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/patient/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Appointments',
    href: '/patient/appointments',
    icon: Calendar,
  },
  {
    name: 'Consultations',
    href: '/patient/consultations',
    icon: FileText,
  },
  {
    name: 'Profile',
    href: '/patient/profile',
    icon: User,
  },
];

interface PatientSidebarProps {
  onNavigate?: () => void;
}

export function PatientSidebar({ onNavigate }: PatientSidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <aside className="h-screen w-64 flex-shrink-0 border-r border-border bg-white transition-transform">
      <div className="flex h-full flex-col">
        {/* Logo/Brand - Hidden on mobile, shown on desktop */}
        <div className="hidden lg:flex h-16 items-center border-b border-border px-6">
          <Link href="/patient/dashboard" className="flex items-center space-x-2" onClick={onNavigate}>
            <Image
              src="https://res.cloudinary.com/dcngzaxlv/image/upload/v1768807323/logo_tw2voz.png"
              alt="Nairobi Sculpt Logo"
              width={32}
              height={32}
              className="h-8 w-auto object-contain"
              priority
            />
            <span className="text-lg font-semibold text-slate-900 font-playfair-display">Nairobi Sculpt</span>
          </Link>
        </div>

        {/* Mobile Header Spacer */}
        <div className="lg:hidden h-16 border-b border-border" />

        {/* User Info */}
        {user && (
          <div className="border-b border-border px-6 py-4">
            <p className="text-sm font-medium text-slate-900">{user.firstName || user.email}</p>
            <p className="text-xs text-gray-600">{user.email}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 lg:py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 touch-manipulation',
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-slate-900 active:bg-gray-200',
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="border-t border-border p-3 lg:p-4">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start h-11 lg:h-10 text-gray-700 hover:bg-gray-100 hover:text-slate-900 active:bg-gray-200 transition-colors touch-manipulation"
          >
            <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
