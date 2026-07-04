import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Calendar,
    Clock,
    User,
    Stethoscope,
    Loader2,
    CheckCircle2,
    ChevronRight,
    ClipboardType
} from 'lucide-react';
import { format } from 'date-fns';
import { useCheckIn } from '@/hooks/frontdesk/use-frontdesk-dashboard';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { cn } from '@/lib/utils';

interface CheckInPopoverProps {
    appointment: AppointmentResponseDto;
    children: React.ReactNode;
}

export function CheckInPopover({ appointment, children }: CheckInPopoverProps) {
    const [open, setOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const { mutate: checkIn, isPending } = useCheckIn();

    const handleCheckIn = () => {
        checkIn(
            { appointmentId: appointment.id, notes },
            {
                onSuccess: () => {
                    setNotes('');
                    setOpen(false);
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
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 overflow-hidden border border-[#e7d6bf] shadow-xl rounded-xl bg-white" align="end" sideOffset={8}>
                {/* Header */}
                <div className="bg-[#e7d6bf]/15 p-4 border-b border-[#e7d6bf] flex items-start justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-[#2c2e4b]">{patientName}</h3>
                        <p className="text-xs text-[#2c2e4b]/60 font-medium flex items-center gap-1.5 mt-0.5">
                            <ClipboardType className="w-3 h-3 text-[#caa26a]" />
                            {appointment.type || 'General Consultation'}
                        </p>
                    </div>
                    <div className="bg-[#e7d6bf]/30 text-[#2c2e4b] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        Ready
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {/* Quick Context */}
                    <div className="flex gap-4 text-xs">
                        <div className="flex-1 space-y-1">
                            <div className="text-[#2c2e4b]/40 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#caa26a]" /> Time
                            </div>
                            <div className="font-medium text-[#2c2e4b]">{timeString}</div>
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="text-[#2c2e4b]/40 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1">
                                <Stethoscope className="w-3 h-3 text-[#caa26a]" /> Provider
                            </div>
                            <div className="font-medium text-[#2c2e4b] truncate max-w-[100px]" title={doctorName}>
                                {doctorName.replace('Dr. ', '')}
                            </div>
                        </div>
                    </div>

                    {/* Notes Input */}
                    <div className="space-y-2">
                        <Label htmlFor="popover-notes" className="text-xs font-semibold text-[#2c2e4b]">
                            Arrival Notes <span className="text-[10px] font-normal text-[#2c2e4b]/50">(Optional)</span>
                        </Label>
                        <Textarea
                            id="popover-notes"
                            placeholder="Any immediate observations..."
                            className="min-h-[60px] resize-none border-[#e7d6bf] text-sm p-3 focus:ring-[#caa26a]/30 focus:border-[#caa26a] text-[#2c2e4b] placeholder:text-[#2c2e4b]/30"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-1">
                        <Button
                            onClick={handleCheckIn}
                            disabled={isPending}
                            className="w-full bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] font-semibold rounded-lg shadow-sm h-10"
                        >
                            {isPending ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Processing...</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Confirm Arrival</span>
                                </div>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="w-full text-[#2c2e4b]/50 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/30 h-8 text-xs font-semibold"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
