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
        { 
            label: 'In Progress', 
            value: stats.inProgress, 
            color: 'text-stone-900',
            subColor: 'text-stone-500',
            borderColor: 'border-stone-200',
            iconBg: 'bg-stone-100',
        },
        { 
            label: 'Needs Action', 
            value: stats.needsAction, 
            color: 'text-amber-700',
            subColor: 'text-amber-600',
            borderColor: 'border-amber-200/60',
            iconBg: 'bg-amber-50',
        },
        { 
            label: 'Avg Duration', 
            value: `${stats.avgDuration}m`, 
            color: 'text-stone-900',
            subColor: 'text-stone-500',
            borderColor: 'border-stone-200',
            iconBg: 'bg-stone-100',
        },
        { 
            label: 'Completed', 
            value: stats.completed, 
            color: 'text-emerald-800',
            subColor: 'text-emerald-600',
            borderColor: 'border-emerald-200/60',
            iconBg: 'bg-emerald-50',
        },
        { 
            label: 'Today', 
            value: stats.total, 
            color: 'text-stone-900',
            subColor: 'text-stone-500',
            borderColor: 'border-stone-900/10',
            iconBg: 'bg-stone-50',
            isPrimary: true,
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            {statItems.map((stat) => (
                <div
                    key={stat.label}
                    className={cn(
                        "relative px-4 py-3.5 rounded-lg border transition-all duration-200",
                        stat.borderColor,
                        stat.isPrimary ? "bg-white shadow-sm" : "bg-white/60"
                    )}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <p className={cn("text-2xl font-semibold tracking-tight", stat.color)}>
                                {loading ? '–' : stat.value}
                            </p>
                            <p className={cn("text-[11px] font-medium mt-1.5 tracking-wide", stat.subColor)}>
                                {stat.label}
                            </p>
                        </div>
                        {!stat.isPrimary && (
                            <div className={cn("w-8 h-8 rounded-md flex items-center justify-center", stat.iconBg)}>
                                <div className={cn("w-1.5 h-1.5 rounded-full", 
                                    stat.label === 'In Progress' && "bg-violet-500",
                                    stat.label === 'Needs Action' && "bg-amber-500",
                                    stat.label === 'Avg Duration' && "bg-stone-400",
                                    stat.label === 'Completed' && "bg-emerald-500"
                                )} />
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
