'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NurseStatCardProps {
    title: string;
    value: string | number;
    subtitle: string;
    color: 'indigo' | 'emerald' | 'amber' | 'blue' | 'slate' | 'teal' | 'rose' | 'purple';
    pulse?: boolean;
    loading?: boolean;
}

export function NurseStatCard({ title, value, subtitle, color, pulse, loading }: NurseStatCardProps) {
    const pulseColor = "bg-slate-400";

    return (
        <Card className={cn(
            "group relative shadow-sm transition-all hover:shadow-md duration-200 overflow-hidden rounded-xl bg-white border border-slate-200/80 hover:border-slate-300"
        )}>
            <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 tracking-wide">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-2">
                <div className="flex items-baseline gap-2">
                    {loading ? (
                        <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
                    ) : (
                        <span className="text-4xl font-bold text-slate-900 tracking-tight">{value}</span>
                    )}
                    {pulse && !loading && <span className={cn("h-2 w-2 rounded-full animate-pulse self-center", pulseColor)} />}
                </div>
                <p className="text-xs text-slate-600 mt-3 font-medium">{subtitle}</p>
            </CardContent>
        </Card>
    );
}
