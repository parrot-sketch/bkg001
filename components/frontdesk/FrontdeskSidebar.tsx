'use client';

/**
 * Frontdesk Sidebar Navigation
 * 
 * Clean, elegant sidebar navigation for the Frontdesk Dashboard.
 * Mobile-responsive with toggle menu functionality.
 * Reflects Nairobi Sculpt branding with minimal, professional design.
 */

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, UserPlus, User, LogOut, Menu, X, Users } from 'lucide-react';
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
    name: 'Assistant Console',
    href: '/frontdesk/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Sessions',
    href: '/frontdesk/appointments',
    icon: Calendar,
  },
  {
    name: 'Patients',
    href: '/frontdesk/patients',
    icon: Users,
  },
  {
    name: 'Client Intake',
    href: '/frontdesk/patient-intake',
    icon: UserPlus,
  },
  {
    name: 'Profile',
    href: '/frontdesk/profile',
    icon: User,
  },
];

interface FrontdeskSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function FrontdeskSidebar({ isOpen = false, onClose }: FrontdeskSidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleLinkClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-64 border-r border-border bg-card transition-transform duration-300 ease-in-out',
          // Mobile: slide in/out from left
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: always visible
          'lg:translate-x-0',
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Brand */}
          <div className="flex h-16 items-center justify-between border-b border-border px-6">
            <Link href="/frontdesk/dashboard" className="flex items-center space-x-2" onClick={handleLinkClick}>
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
            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Info */}
          {user && (
            <div className="border-b border-border px-6 py-4">
              <p className="text-sm font-medium text-foreground">{user.firstName || user.email}</p>
              <p className="text-xs text-muted-foreground">Surgical Assistant</p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
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
