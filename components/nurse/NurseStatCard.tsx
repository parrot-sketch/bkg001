'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface NurseStatCardProps {
    title: string;
    value: string | number;
    subtitle: string;
    icon: LucideIcon;
    color: 'indigo' | 'emerald' | 'amber' | 'blue' | 'slate' | 'teal' | 'rose' | 'purple';
    pulse?: boolean;
    loading?: boolean;
}

export function NurseStatCard({ title, value, subtitle, icon: Icon, color, pulse, loading }: NurseStatCardProps) {
    const colorClasses: Record<string, string> = {
        indigo: "text-indigo-600 bg-indigo-50/80",
        emerald: "text-emerald-600 bg-emerald-50/80",
        amber: "text-amber-600 bg-amber-50/80",
        blue: "text-sky-600 bg-sky-50/80",
        slate: "text-slate-600 bg-slate-100/80",
        teal: "text-teal-600 bg-teal-50/80",
        rose: "text-rose-600 bg-rose-50/80",
        purple: "text-purple-600 bg-purple-50/80",
    };

    const borderAccents: Record<string, string> = {
        indigo: "hover:border-indigo-200",
        emerald: "hover:border-emerald-200",
        amber: "hover:border-amber-200",
        blue: "hover:border-sky-200",
        slate: "hover:border-slate-300",
        teal: "hover:border-teal-200",
        rose: "hover:border-rose-200",
        purple: "hover:border-purple-200",
    };

    const pulseColors: Record<string, string> = {
        indigo: "bg-indigo-500",
        emerald: "bg-emerald-500",
        amber: "bg-amber-500",
        blue: "bg-sky-500",
        slate: "bg-slate-500",
        teal: "bg-teal-500",
        rose: "bg-rose-500",
        purple: "bg-purple-500",
    };

    return (
        <Card className={cn(
            "group relative border-slate-200/60 shadow-sm transition-all hover:shadow-md duration-200 overflow-hidden rounded-xl bg-white",
            borderAccents[color]
        )}>
            <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</CardTitle>
                    <div className={cn("p-2 rounded-lg transition-transform group-hover:scale-105", colorClasses[color])}>
                        <Icon className="h-4 w-4" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
                <div className="flex items-baseline gap-2">
                    {loading ? (
                        <div className="h-7 w-12 bg-slate-100 animate-pulse rounded" />
                    ) : (
                        <span className="text-3xl font-bold text-slate-800 tracking-tight">{value}</span>
                    )}
                    {pulse && !loading && <span className={cn("h-2.5 w-2.5 rounded-full animate-pulse self-center", pulseColors[color] || "bg-emerald-500")} />}
                </div>
                <p className="text-xs font-medium text-slate-500 mt-1">{subtitle}</p>
            </CardContent>
        </Card>
    );
}
