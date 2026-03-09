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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:items-start">
      {/* Doctor Info Sidebar */}
      <div className="lg:col-span-4 space-y-6">
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white p-6">
          <div className="flex flex-col items-center text-center">
            <ProfileImage 
              url={selectedDoctor?.profileImage} 
              name={selectedDoctor?.lastName || 'Doctor'} 
              className="h-20 w-20 rounded-full bg-slate-100 mb-4" 
            />
            <h3 className="text-xl font-semibold text-slate-900">
              Dr. {selectedDoctor?.firstName} {selectedDoctor?.lastName}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {selectedDoctor?.specialization}
            </p>
          </div>
          
          <div className="mt-8 space-y-4 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>30 mins consultation</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Stethoscope className="h-4 w-4 text-slate-400" />
              <span>Clinical Assessment</span>
            </div>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          onClick={onBack}
          className="w-full h-11 border-slate-200 text-slate-600"
        >
          Change Provider
        </Button>
      </div>

      {/* Calendar & Slots */}
      <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row gap-8">
        <div className="flex-shrink-0">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Select Date
          </h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onDateSelect}
            disabled={(date) => date < startOfToday()}
            className="rounded-lg border border-slate-200 p-3"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">
              Available Times
            </h3>
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
            <div className="pt-6 mt-6 border-t border-slate-100">
              <Button 
                className="w-full h-11 bg-slate-900 hover:bg-black text-white"
                onClick={onNext}
              >
                Continue
              </Button>
            </div>
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
        "h-10 rounded-md text-sm font-medium transition-colors border",
        active 
          ? "bg-slate-900 border-slate-900 text-white" 
          : isAvailable
            ? "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
      )}
    >
      {time}
    </button>
  );
}
