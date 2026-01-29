'use client';

/**
 * Doctor Sidebar Navigation
 * 
 * Clean, elegant sidebar navigation for the Doctor Dashboard.
 * Reflects Nairobi Sculpt branding with minimal, professional design.
 * Mobile-responsive with toggle functionality.
 */

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, FileText, Users, User, LogOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/patient/useAuth';
import { useEffect } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/doctor/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Appointments',
    href: '/doctor/appointments',
    icon: Calendar,
  },
  {
    name: 'Consultations',
    href: '/doctor/consultations',
    icon: FileText,
  },
  {
    name: 'Patients',
    href: '/doctor/patients',
    icon: Users,
  },
  {
    name: 'Profile',
    href: '/doctor/profile',
    icon: User,
  },
];

interface DoctorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DoctorSidebar({ isOpen, onClose }: DoctorSidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [pathname]);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        ></div>
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0" // Always visible on large screens but remains 'fixed'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Brand */}
          <div className="flex h-16 items-center justify-between border-b border-border px-6">
            <Link href="/doctor/dashboard" className="flex items-center space-x-2" onClick={onClose}>
              <Image
                src="https://res.cloudinary.com/dcngzaxlv/image/upload/v1768807323/logo_tw2voz.png"
                alt="Nairobi Sculpt Logo"
                width={32}
                height={32}
                className="h-8 w-auto object-contain"
                priority
              />
              <span className="text-lg font-semibold text-foreground font-playfair-display">Nairobi Sculpt</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Info */}
          {user && (
            <div className="border-b border-border px-6 py-4">
              <p className="text-sm font-medium text-foreground">
                Dr. {user.firstName || user.email}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose} // Close sidebar on navigation
                  className={cn(
                    'flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="border-t border-border p-4">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="mr-3 h-5 w-5" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
