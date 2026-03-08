'use client';

import { cn } from '@/lib/utils';

interface AppointmentStatsProps {
    stats: {
        total: number;
        needsAction: number;
        inProgress: number;
        completed: number;
        upcoming: number;
        avgDuration: number;
    };
    loading: boolean;
}

export function AppointmentStats({ stats, loading }: AppointmentStatsProps) {
    const statItems = [
        { label: 'In Progress', value: stats.inProgress, color: 'text-violet-700', bg: 'bg-violet-50' },
        { label: 'Needs Action', value: stats.needsAction, color: 'text-orange-700', bg: 'bg-orange-50' },
        { label: 'Avg Duration', value: `${stats.avgDuration}m`, color: 'text-blue-700', bg: 'bg-blue-50' },
        { label: 'Completed', value: stats.completed, color: 'text-emerald-700', bg: 'bg-emerald-50' },
        { label: 'Today', value: stats.total, color: 'text-slate-900', bg: 'bg-white' },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {statItems.map((stat) => (
                <div
                    key={stat.label}
                    className={cn(
                        "px-4 py-3 rounded-xl border border-slate-100 text-center",
                        stat.bg
                    )}
                >
                    <p className={cn("text-xl font-bold leading-none", stat.color)}>
                        {loading ? '–' : stat.value}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">{stat.label}</p>
                </div>
            ))}
        </div>
    );
}
