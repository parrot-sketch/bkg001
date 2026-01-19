'use client';

/**
 * Nurse Sidebar Navigation
 * 
 * Clean, elegant sidebar navigation for the Nurse Dashboard.
 * Reflects Nairobi Sculpt branding with minimal, professional design.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, User, LogOut } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/patient/useAuth';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/nurse/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Patients',
    href: '/nurse/patients',
    icon: Users,
  },
  {
    name: 'Pre/Post-op',
    href: '/nurse/pre-post-op',
    icon: FileText,
  },
  {
    name: 'Profile',
    href: '/nurse/profile',
    icon: User,
  },
];

export function NurseSidebar() {
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
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card transition-transform">
      <div className="flex h-full flex-col">
        {/* Logo/Brand */}
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/nurse/dashboard" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg nairobi-gradient">
              <span className="text-lg font-bold text-white">NS</span>
            </div>
            <span className="text-lg font-semibold text-foreground">Nairobi Sculpt</span>
          </Link>
        </div>

        {/* User Info */}
        {user && (
          <div className="border-b border-border px-6 py-4">
            <p className="text-sm font-medium text-foreground">Nurse {user.firstName || user.email}</p>
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
  );
}
