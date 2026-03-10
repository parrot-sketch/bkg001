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
    <header className="mb-8 p-6 bg-white border border-slate-100/60 rounded-[2rem] shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Doctor Avatar */}
        <div className="relative">
          <div className="h-14 w-14 rounded-[1.25rem] ring-4 ring-slate-50 shadow-sm overflow-hidden">
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-indigo-700 text-white text-lg font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
          {/* Online indicator */}
          <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 ring-4 ring-white" />
        </div>

        {/* Name & Context */}
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dr. {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-1">
            {format(new Date(), 'EEEE, MMMM do')}
          </p>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        <NotificationBell />
      </div>
    </header>
  );
}
