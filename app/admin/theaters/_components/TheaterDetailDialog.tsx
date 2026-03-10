'use client';

import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, startOfDay } from 'date-fns';
import { 
    Calendar, 
    Clock, 
    Plus, 
    User, 
    Stethoscope, 
    MapPin,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Theater, TheaterBooking } from './types';

interface TheaterDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theater: Theater | null;
  onBookSlot: () => void;
}

const CASE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  PLANNING: 'bg-slate-100 text-slate-600',
  READY_FOR_SCHEDULING: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  SCHEDULED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  IN_PREP: 'bg-slate-100 text-slate-700',
  IN_THEATER: 'bg-indigo-600 text-white shadow-sm',
  RECOVERY: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  COMPLETED: 'bg-slate-50 text-slate-400',
  CANCELLED: 'bg-rose-50 text-rose-400 border-rose-100',
};

export function TheaterDetailDialog({
  open,
  onOpenChange,
  theater,
  onBookSlot,
}: TheaterDetailDialogProps) {
  if (!theater) return null;

  const bookings = theater.bookings || [];
  
  // Sort bookings by time
  const sortedBookings = [...bookings].sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border-none shadow-2xl">
        <div 
            className="h-1.5 w-full sticky top-0 z-10" 
            style={{ backgroundColor: theater.color_code || '#475569' }} 
        />
        
        <div className="p-8">
            <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-slate-100">
                <div>
                    <div className="flex items-center gap-3">
                        <div 
                            className="p-2.5 rounded-xl text-white shadow-sm"
                            style={{ backgroundColor: theater.color_code || '#475569' }}
                        >
                            <MapPin className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-2xl font-bold text-slate-900">{theater.name}</DialogTitle>
                    </div>
                    <DialogDescription className="mt-1 font-medium text-slate-500">
                        Room Allocation & Surgical Timeline
                    </DialogDescription>
                </div>
                <Button 
                    onClick={onBookSlot} 
                    className="rounded-xl bg-slate-900 hover:bg-slate-800 px-6 font-bold shadow-lg shadow-slate-900/10"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    New Booking
                </Button>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
                {/* Information Sidebar */}
                <div className="lg:col-span-1 space-y-8">
                    <section>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Theater Specifications</h4>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Classification</span>
                                <Badge variant="outline" className="w-fit rounded-lg bg-slate-50 border-slate-200 text-slate-700 font-bold px-3 py-1">
                                    {theater.type.replace('_', ' ')}
                                </Badge>
                            </div>
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Availability</span>
                                <div className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                                    <Clock className="h-4 w-4 text-slate-400" />
                                    {theater.operational_hours || '24/7 Connectivity'}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Equipment & Capabilities</h4>
                        <div className="flex flex-wrap gap-2">
                            {theater.capabilities ? JSON.parse(theater.capabilities).map((cap: string) => (
                                <Badge key={cap} variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 border-none">
                                    {cap}
                                </Badge>
                            )) : <span className="text-xs text-slate-400 italic">No special specs defined</span>}
                        </div>
                    </section>

                    {theater.notes && (
                      <section className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 text-slate-300" />
                            Operational Note
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">{theater.notes}</p>
                      </section>
                    )}
                </div>

                {/* Timeline / Schedule */}
                <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-8">
                        <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-slate-400" />
                            Case Schedule
                        </h4>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-4 py-1.5 rounded-full">
                            {format(new Date(), 'EEEE, MMMM do')}
                        </span>
                    </div>

                    {sortedBookings.length === 0 ? (
                        <div className="py-24 flex flex-col items-center justify-center text-center rounded-[2rem] bg-slate-50/50 border border-dashed border-slate-200">
                            <Clock className="h-10 w-10 text-slate-300 mb-4 opacity-50" />
                            <h5 className="font-bold text-slate-900">Room Clear</h5>
                            <p className="text-sm text-slate-500 max-w-[200px] mt-1 font-medium leading-relaxed">
                                No surgical cases scheduled for today.
                            </p>
                        </div>
                    ) : (
                        <div className="relative space-y-6">
                            {/* Vertical line connector */}
                            <div className="absolute left-6 top-10 bottom-10 w-px bg-slate-100 z-0" />
                            
                            {sortedBookings.map((booking) => (
                                <div key={booking.id} className="relative z-10 flex gap-8 group">
                                    <div className="flex flex-col items-center shrink-0 pt-1">
                                        <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center shadow-sm group-hover:border-slate-400 transition-colors">
                                           <span className="font-mono text-[10px] font-bold text-slate-900">
                                                {format(new Date(booking.start_time), 'HH:mm')}
                                           </span>
                                           <div className="h-1.5 w-px bg-slate-200 my-0.5" />
                                           <span className="font-mono text-[9px] font-bold text-slate-400">
                                                {format(new Date(booking.end_time), 'HH:mm')}
                                           </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm transition-all hover:shadow-md hover:border-slate-200">
                                        <div className="flex justify-between items-start mb-4">
                                            <Badge variant="secondary" className={cn("rounded-lg px-2.5 py-0.5 font-bold text-[9px] uppercase tracking-wider border", CASE_STATUS_COLORS[booking.surgical_case.status])}>
                                                {booking.surgical_case.status.replace(/_/g, ' ')}
                                            </Badge>
                                        </div>
                                        
                                        <h5 className="font-bold text-slate-900 text-lg leading-snug mb-5">
                                            {booking.surgical_case.procedure_name || 'General Surgery'}
                                        </h5>
                                        
                                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Patient</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-slate-50 flex items-center justify-center">
                                                        <User className="h-3 w-3 text-slate-400" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700">
                                                        {booking.surgical_case.patient.last_name}, {booking.surgical_case.patient.first_name}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Primary Surgeon</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-slate-50 flex items-center justify-center">
                                                        <Stethoscope className="h-3 w-3 text-slate-400" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700">
                                                        Dr. {booking.surgical_case.primary_surgeon.name}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
