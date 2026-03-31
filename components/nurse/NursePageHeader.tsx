'use client';

import { useAuth } from '@/hooks/patient/useAuth';
import { format } from 'date-fns';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export function NursePageHeader() {
    const { user } = useAuth();

    return (
        <header className="sticky top-0 z-40 -mx-4 sm:-mx-5 lg:-mx-8 xl:-mx-10 px-4 sm:px-5 lg:px-8 xl:px-10 py-3 mb-5 bg-white/80 backdrop-blur-md border-b border-slate-200/60 transition-all duration-200">
            <div className="flex items-center justify-between">
                {/* Profile Section */}
                <div className="flex items-center gap-3">
                    {/* Nurse Avatar */}
                    <div className="relative">
                        <div className="h-11 w-11 rounded-full ring-2 ring-white shadow-sm overflow-hidden bg-slate-200 flex items-center justify-center text-slate-700 text-sm font-semibold">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        {/* Online indicator */}
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
                    </div>

                    {/* Name & Context */}
                    <div className="flex flex-col">
                        <h1 className="text-base font-semibold text-slate-900 leading-tight">
                            {user?.firstName} {user?.lastName}
                        </h1>
                        <p className="text-[11px] text-slate-500 font-medium">
                            {format(new Date(), 'EEEE, MMMM d')}
                        </p>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    <NotificationBell />
                </div>
            </div>
        </header>
    );
}
