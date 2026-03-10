'use client';

import { format } from 'date-fns';
import { 
  Building2, 
  Syringe, 
  Activity, 
  Clock, 
  CalendarDays, 
  ChevronRight, 
  Settings2 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Theater } from './types';

const THEATER_TYPE_META: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  MAJOR: {
    label: 'Major Operating Theater',
    icon: <Building2 className="h-4 w-4" />,
  },
  MINOR: {
    label: 'Minor Procedure Room',
    icon: <Syringe className="h-4 w-4" />,
  },
  PROCEDURE_ROOM: {
    label: 'Clinical Suite',
    icon: <Activity className="h-4 w-4" />,
  },
};

interface TheaterCardProps {
  theater: Theater;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onViewDetail: () => void;
}

export function TheaterCard({
  theater,
  onEdit,
  onDelete,
  onToggleActive,
  onViewDetail,
}: TheaterCardProps) {
  const typeMeta = THEATER_TYPE_META[theater.type] || THEATER_TYPE_META.MAJOR;
  const todayBookings = theater.bookings;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all hover:shadow-md border-slate-200 rounded-2xl bg-white flex flex-col',
        !theater.is_active && 'opacity-60 grayscale-[0.5]'
      )}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Simple Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <div 
                        className="h-2 w-2 rounded-full" 
                        style={{ backgroundColor: theater.color_code || '#475569' }} 
                    />
                    <h3 className="font-bold text-slate-900 leading-none">
                        {theater.name}
                    </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium ml-4 uppercase tracking-wider">
                    {typeMeta.icon}
                    {typeMeta.label}
                </div>
            </div>
            <Switch
                checked={theater.is_active}
                onCheckedChange={onToggleActive}
                className="scale-75 data-[state=checked]:bg-emerald-600"
            />
        </div>

        {/* Muted Detail Grid */}
        <div className="grid grid-cols-2 p-5 gap-4 border-b border-slate-100 bg-slate-50/30">
            <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Schedule Today</span>
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-700">{todayBookings.length} Cases</span>
                </div>
            </div>
            <div className="space-y-1 text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hours</span>
                <div className="flex items-center justify-end gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-700 whitespace-nowrap">
                        {theater.operational_hours || '24/7'}
                    </span>
                </div>
            </div>
        </div>

        {/* Simplified Ongoing/Next Case or Empty State */}
        <div className="px-5 py-4 flex-1">
            {todayBookings.length > 0 ? (
                <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Next Scheduled Case</span>
                    <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                        <p className="text-xs font-bold text-slate-900 truncate">
                            {todayBookings[0].surgical_case.procedure_name || 'General Procedure'}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-[11px] font-medium text-slate-500">
                                Dr. {todayBookings[0].surgical_case.primary_surgeon.name}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-indigo-600">
                                {format(new Date(todayBookings[0].start_time), 'HH:mm')}
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center py-4 text-slate-400 opacity-60">
                    <Building2 className="h-5 w-5 mb-2 stroke-[1.5px]" />
                    <span className="text-xs font-medium italic">No cases scheduled today</span>
                </div>
            )}
        </div>

        {/* Standard Actions */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-3">
            <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 rounded-xl text-xs font-bold border-slate-200 hover:bg-white transition-colors"
                onClick={onViewDetail}
            >
                View Management
                <ChevronRight className="h-3.5 w-3.5 ml-1 opacity-50" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-900"
                onClick={onEdit}
            >
                <Settings2 className="h-4 w-4" />
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
