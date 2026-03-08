import { Calendar as CalendarIcon, Clock, ChevronRight, Sun, Sunset, Moon, Loader2, ArrowRight, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { ProfileImage } from '@/components/profile-image';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { format, startOfToday } from 'date-fns';

interface TimeSelectionProps {
  selectedDoctor: DoctorResponseDto | null;
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  loadingSlots: boolean;
  availableSlots: any[];
  categorizedSlots: {
    morning: any[];
    afternoon: any[];
    evening: any[];
  };
  selectedSlot: string | null;
  onSlotSelect: (slot: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function TimeSelection({
  selectedDoctor,
  selectedDate,
  onDateSelect,
  loadingSlots,
  availableSlots,
  categorizedSlots,
  selectedSlot,
  onSlotSelect,
  onNext,
  onBack,
}: TimeSelectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:items-start anim-fade-in-up">
      {/* Doctor Info Sidebar */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="rounded-[2rem] border-slate-100 overflow-hidden bg-white shadow-sm ring-1 ring-slate-100/50">
          <div className="h-24 bg-gradient-to-r from-brand-primary to-[#152d4a]" />
          <CardContent className="px-8 pb-8 relative">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 md:left-8 md:translate-x-0">
                <ProfileImage url={selectedDoctor?.profileImage} name={selectedDoctor?.lastName || 'Doctor'} className="h-24 w-24 rounded-2xl ring-4 ring-white shadow-xl shadow-slate-200" />
            </div>
            <div className="pt-16 text-center md:text-left">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">Dr. {selectedDoctor?.firstName} {selectedDoctor?.lastName}</h3>
              <p className="text-sm text-brand-primary/80 font-semibold uppercase tracking-[0.2em] mt-2">{selectedDoctor?.specialization}</p>
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                   <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-brand-primary/40" />
                   </div>
                   <span className="font-medium">30 mins consultation</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                   <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">
                      <Stethoscope className="h-4 w-4 text-brand-primary/40" />
                   </div>
                   <span className="font-medium">Clinical Assessment</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Button 
          variant="outline" 
          onClick={onBack}
          className="w-full rounded-2xl h-12 border-slate-200 text-slate-600 hover:bg-white hover:border-brand-primary/30 transition-all"
        >
          Change Provider
        </Button>
      </div>

      {/* Calendar & Slots */}
      <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 md:p-10 flex flex-col md:flex-row gap-12 ring-1 ring-slate-100/50">
        <div className="flex-shrink-0">
          <p className="text-xs font-semibold text-brand-primary/80 tracking-[0.2em] uppercase mb-6">
            Select Date
          </p>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onDateSelect}
            disabled={(date) => date < startOfToday()}
            className="rounded-2xl border border-slate-50 p-4"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-8">
            <p className="text-xs font-semibold text-brand-primary/80 tracking-[0.2em] uppercase">
              Available Times
            </p>
            {selectedDate && (
              <span className="text-xs font-bold text-brand-primary bg-brand-isabelline px-3 py-1.5 rounded-full">
                {format(selectedDate, 'MMM d, yyyy')}
              </span>
            )}
          </div>

          {loadingSlots ? (
            <div className="flex flex-col items-center justify-center h-60 gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
              <p className="text-xs font-medium">Checking availability...</p>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 gap-4 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
                <CalendarIcon className="h-6 w-6 text-slate-200" />
              </div>
              <div className="max-w-[200px]">
                <p className="text-sm font-bold text-slate-700">No availability</p>
                <p className="text-xs text-slate-400 mt-1">There are no slots available on this date. Please try another day.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8 max-h-[420px] overflow-y-auto pr-4 custom-scrollbar">
              {categorizedSlots.morning.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                     <Sun className="h-3.5 w-3.5 text-brand-secondary/60" /> Morning
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {categorizedSlots.morning.map(slot => (
                      <SlotButton 
                        key={typeof slot === 'string' ? slot : slot.startTime} 
                        slot={slot} 
                        active={selectedSlot === (typeof slot === 'string' ? slot : slot.startTime)} 
                        onClick={onSlotSelect} 
                      />
                    ))}
                  </div>
                </div>
              )}
              {categorizedSlots.afternoon.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                     < Sunset className="h-3.5 w-3.5 text-brand-secondary/60" /> Afternoon
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {categorizedSlots.afternoon.map(slot => (
                      <SlotButton 
                        key={typeof slot === 'string' ? slot : slot.startTime} 
                        slot={slot} 
                        active={selectedSlot === (typeof slot === 'string' ? slot : slot.startTime)} 
                        onClick={onSlotSelect} 
                      />
                    ))}
                  </div>
                </div>
              )}
              {categorizedSlots.evening.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                     <Moon className="h-3.5 w-3.5 text-slate-300" /> Evening
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {categorizedSlots.evening.map(slot => (
                      <SlotButton 
                        key={typeof slot === 'string' ? slot : slot.startTime} 
                        slot={slot} 
                        active={selectedSlot === (typeof slot === 'string' ? slot : slot.startTime)} 
                        onClick={onSlotSelect} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedSlot && (
            <Button 
              className="w-full mt-10 rounded-[1.5rem] h-14 bg-brand-primary hover:bg-brand-primary/90 text-white shadow-xl shadow-brand-primary/20 transition-all font-bold"
              onClick={onNext}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SlotButton({ slot, active, onClick }: { slot: string | { startTime: string; isAvailable: boolean }, active: boolean, onClick: (s: string) => void }) {
  const time = typeof slot === 'string' ? slot : slot.startTime;
  const isAvailable = typeof slot === 'string' ? true : slot.isAvailable;

  return (
    <button
      onClick={() => onClick(time)}
      disabled={!isAvailable}
      className={cn(
        "h-12 rounded-2xl text-sm font-bold transition-all duration-300 border-2",
        active 
          ? "bg-brand-primary border-brand-primary text-white shadow-xl shadow-brand-primary/10 scale-[1.05]" 
          : isAvailable
            ? "bg-white border-slate-50 text-slate-600 hover:border-brand-primary/20 hover:text-brand-primary hover:bg-brand-primary/[0.02]"
            : "bg-slate-50 border-slate-50 text-slate-300 cursor-not-allowed opacity-60"
      )}
    >
      {time}
    </button>
  );
}
