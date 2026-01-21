'use client';

/**
 * Client Portal Layout
 * 
 * Layout for authenticated users who have NOT yet become patients.
 * Clean, onboarding-focused design without clinical dashboard elements.
 * 
 * Purpose: Bridge between public website and patient portal.
 * Users are authenticated but haven't entered clinical workflow yet.
 * 
 * Header includes Dashboard link for authenticated patients.
 */

import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/patient/useAuth';
import { Button } from '@/components/ui/button';
import { LayoutDashboard } from 'lucide-react';

interface PortalLayoutProps {
  children: ReactNode;
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Simple Header - No sidebar, but Dashboard link for authenticated users */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/portal/welcome" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <Image
                src="/logo.png"
                alt="Nairobi Sculpt Logo"
                width={40}
                height={40}
                className="h-10 w-auto object-contain"
                priority
              />
              <span className="font-playfair-display text-xl font-bold text-slate-900">
                Nairobi Sculpt
              </span>
            </Link>

            {/* Dashboard Link - Only visible for authenticated users */}
            {!isLoading && isAuthenticated && (
              <Link href="/patient/dashboard">
                <Button variant="ghost" size="sm" className="text-slate-700 hover:text-teal-600 hover:bg-teal-50">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}
