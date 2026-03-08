'use client';

import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import Link from 'next/link';
import { format } from 'date-fns';

interface DashboardHeaderProps {
  user: any;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 -mx-4 sm:-mx-5 lg:-mx-8 xl:-mx-10 px-4 sm:px-5 lg:px-8 xl:px-10 py-3 mb-5 bg-white/80 backdrop-blur-md border-b border-slate-100/60">
      <div className="flex items-center justify-between">
        {/* Profile Section */}
        <div className="flex items-center gap-3">
          {/* Doctor Avatar */}
          <div className="relative">
            <div className="h-11 w-11 rounded-full ring-2 ring-white shadow-sm overflow-hidden">
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-teal-600 to-teal-700 text-white text-sm font-semibold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            </div>
            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>

          {/* Name & Context */}
          <div className="flex flex-col">
            <h1 className="text-base font-semibold text-slate-900 leading-tight">
              Dr. {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <NotificationBell />

          {/* Quick Profile Link */}
          <link href="/doctor/profile" as="doctor-profile" />
          <Link href="/doctor/profile">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100">
              <User className="h-4 w-4 text-slate-500" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
