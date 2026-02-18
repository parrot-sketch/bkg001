import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  AlertCircle,
  Loader2,
  MapPin,
  CheckCircle2,
  ChevronRight,
  ClipboardType
} from 'lucide-react';
import { format } from 'date-fns';
import { useCheckIn } from '@/hooks/frontdesk/useTodaysSchedule';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { cn } from '@/lib/utils';

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentResponseDto | null;
}

export function CheckInDialog({ open, onOpenChange, appointment }: CheckInDialogProps) {
  const [notes, setNotes] = useState('');
  const { mutate: checkIn, isPending } = useCheckIn();

  if (!appointment) return null;

  const handleCheckIn = () => {
    checkIn(
      { appointmentId: appointment.id, notes },
      {
        onSuccess: () => {
          setNotes('');
          onOpenChange(false);
        },
      }
    );
  };

  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : 'Unknown Patient';

  const doctorName = appointment.doctor?.name || 'Unknown Doctor';
  const appointmentDate = appointment.appointmentDate ? new Date(appointment.appointmentDate) : new Date();
  const timeString = appointment.time;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden border-0 shadow-2xl rounded-[32px] bg-white">
        {/* Minimalism & Focus: Clean Top Header */}
        <div className="relative pt-12 pb-8 px-6 text-center border-b border-slate-50">
          <div className="absolute top-4 right-4 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Session
          </div>

          {/* Centered Profile Visual */}
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-slate-100 rounded-full animate-pulse opacity-50" />
            <Avatar className="h-24 w-24 border-4 border-white shadow-xl relative z-10">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${patientName}`} />
              <AvatarFallback className="bg-slate-50 text-slate-400 text-2xl font-bold">
                {patientName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-lg border border-slate-50 z-20">
              <div className="bg-emerald-500 rounded-full p-1">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>

          <DialogHeader className="space-y-1">
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
              {patientName}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium flex items-center justify-center gap-2">
              <ClipboardType className="w-3.5 h-3.5 text-slate-400" />
              {appointment.type || 'General Consultation'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-8 py-8 space-y-8">
          {/* Clinical Context Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50 space-y-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Schedule</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-900">{format(appointmentDate, 'MMM d, yyyy')}</p>
                <p className="text-xs font-medium text-slate-500">{timeString}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50 space-y-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Stethoscope className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Provider</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-900 truncate">{doctorName.replace('Dr. ', '')}</p>
                <p className="text-xs font-medium text-slate-500">Scheduled MD</p>
              </div>
            </div>
          </div>

          {/* Interaction Area: Notes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Label htmlFor="notes" className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Arrival Clinical Notes
              </Label>
              <span className="text-[10px] font-medium text-slate-300">Optional</span>
            </div>
            <Textarea
              id="notes"
              placeholder="Record any immediate patient observations or requirements..."
              className="min-h-[100px] resize-none border-slate-100 bg-slate-50/30 focus:bg-white focus:border-slate-200 focus:ring-4 focus:ring-slate-50 transition-all rounded-[20px] text-sm p-4 placeholder:text-slate-300"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Action Footer */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handleCheckIn}
              disabled={isPending}
              className={cn(
                "w-full h-14 rounded-[20px] text-sm font-bold transition-all duration-300",
                "bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-200 hover:shadow-2xl hover:-translate-y-0.5"
              )}
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 w-full">
                  <span>Confirm Arrival</span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </div>
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-10 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-transparent"
            >
              Discard Request
            </Button>
          </div>
        </div>

        {/* Professional Footer Indicator */}
        <div className="pb-6 text-center">
          <p className="text-[10px] text-slate-300 font-medium">
            Medical Reception Console • Secure Check-In Standard
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

