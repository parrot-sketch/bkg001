import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, User, Stethoscope, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useCheckIn } from '@/hooks/frontdesk/useTodaysSchedule';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

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

  // Safe date parsing
  const appointmentDate = appointment.appointmentDate ? new Date(appointment.appointmentDate) : new Date();
  const timeString = appointment.time;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] gap-0 p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        {/* Header with aesthetic background */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Clock className="w-24 h-24 rotate-12" />
          </div>

          <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              Check In Patient
            </DialogTitle>
            <DialogDescription className="text-indigo-100">
              Confirm arrival and notify the medical team.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 bg-white">
          {/* Patient Card */}
          <div className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${patientName}`} />
              <AvatarFallback>{patientName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900">{patientName}</h3>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar className="w-3 h-3" />
                <span>{format(appointmentDate, 'MMMM d, yyyy')}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <Clock className="w-3 h-3" />
                <span>{timeString}</span>
              </div>
            </div>
            <div className="ml-auto px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase rounded-md border border-blue-100">
              {appointment.type}
            </div>
          </div>

          {/* Doctor Info */}
          <div className="flex items-center gap-3 p-3 text-sm text-slate-600 bg-white border border-slate-100 rounded-lg shadow-sm">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Assigned Provider</p>
              <p className="font-semibold text-slate-800">{doctorName}</p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-slate-700 font-medium">
              Arrival Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="E.g. Verified insurance, patient complaining of pain, etc."
              className="resize-none border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Warning/Info */}
          <div className="flex gap-3 items-start p-3 bg-amber-50 text-amber-800 rounded-lg text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              Checking in will update the status to <strong>CHECKED_IN</strong> and notify Dr. {doctorName.split(' ').pop()}.
              Please ensure the patient is physically present in the waiting area.
            </p>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 bg-slate-50 border-t border-slate-100">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl border-slate-200 text-slate-600 font-medium">
            Cancel
          </Button>
          <Button
            onClick={handleCheckIn}
            disabled={isPending}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-600/20"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking In...
              </>
            ) : (
              'Confirm Check-In'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
