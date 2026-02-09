'use client';

/**
 * QuickBookingDialog Component — Premium Redesign
 * 
 * A polished, multi-section booking experience optimized for speed.
 * Design principles:
 *   - Slots grouped by date with horizontal date chips
 *   - Compact time-slot grid (pill buttons)
 *   - Stepped visual hierarchy with numbered sections
 *   - Sticky doctor header with brand color accent
 *   - Animated summary card on completion
 *   - ScrollArea for long slot lists
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { PatientCombobox } from '@/components/frontdesk/PatientCombobox';
import { frontdeskApi } from '@/lib/api/frontdesk';
import { getDoctorSchedule } from '@/app/actions/schedule';
import { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';
import { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import { toast } from 'sonner';
import { format, addDays, isSameDay, isToday as isDateToday, isTomorrow as isDateTomorrow, startOfDay } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Stethoscope,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Sparkles,
  FileText,
  MapPin,
  X,
  Sun,
  Sunset,
  Moon,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─────────────────────────── Types ─────────────────────────── */

interface QuickBookingDialogProps {
  doctor: DoctorResponseDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface TimeSlot {
  date: Date;
  time: string;          // "HH:mm"
  displayDate: string;   // "Today, Feb 8"
  displayTime: string;   // "10:00 AM"
}

interface DateGroup {
  label: string;         // "Today", "Tomorrow", "Wed, Feb 12"
  dateKey: string;       // "2026-02-08"
  date: Date;
  slots: TimeSlot[];
}

/* ─────────────────────────── Component ─────────────────────── */

export function QuickBookingDialog({
  doctor,
  open,
  onOpenChange,
  onSuccess,
}: QuickBookingDialogProps) {
  // ── Form state ──
  const [selectedPatient, setSelectedPatient] = useState<PatientResponseDto | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [appointmentType, setAppointmentType] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Slot state ──
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [activeDateKey, setActiveDateKey] = useState<string>('');

  // ── Load slots when dialog opens ──
  useEffect(() => {
    if (open && doctor.id) {
      loadNextAvailableSlots();
    }
  }, [open, doctor.id]);

  // ── Reset form on close ──
  useEffect(() => {
    if (!open) {
      setSelectedPatient(null);
      setSelectedSlot(null);
      setAppointmentType('');
      setNotes('');
      setActiveDateKey('');
    }
  }, [open]);

  /* ── Slot Loading ── */
  const loadNextAvailableSlots = useCallback(async () => {
    setIsLoadingSlots(true);
    try {
      const start = new Date();
      const end = addDays(start, 14);
      const schedule = await getDoctorSchedule(doctor.id, start, end);
      const slots = calculateNextSlots(schedule, start);
      setAvailableSlots(slots);

      // Auto-select first date
      if (slots.length > 0) {
        setActiveDateKey(format(slots[0].date, 'yyyy-MM-dd'));
      }
    } catch (error) {
      console.error('Failed to load slots:', error);
      toast.error('Failed to load available time slots');
    } finally {
      setIsLoadingSlots(false);
    }
  }, [doctor.id]);

  /* ── Slot Calculation ── */
  const calculateNextSlots = (schedule: any, fromDate: Date): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const { workingDays, blocks, appointments } = schedule;
    const now = new Date();

    // Iterate day-by-day for the next 14 days (always starting from today)
    for (let i = 0; i < 14; i++) {
      const dayBase = startOfDay(addDays(now, i));
      const dayOfWeek = dayBase.getDay();
      const workRules = workingDays.filter((wd: any) => wd.dayOfWeek === dayOfWeek);
      if (!workRules.length) continue;

      for (const rule of workRules) {
        const [startH, startM] = rule.startTime.split(':').map(Number);
        const [endH, endM] = rule.endTime.split(':').map(Number);

        let slotStart = new Date(dayBase);
        slotStart.setHours(startH, startM, 0, 0);
        const slotEnd = new Date(dayBase);
        slotEnd.setHours(endH, endM, 0, 0);

        // For today: advance to the next 30-min boundary after now
        if (i === 0 && slotStart < now) {
          const nextBoundary = new Date(now);
          const mins = nextBoundary.getMinutes();
          nextBoundary.setMinutes(mins < 30 ? 30 : 60, 0, 0);
          if (nextBoundary > slotStart) {
            slotStart = new Date(nextBoundary);
          }
        }

        if (slotStart >= slotEnd) continue;

        // Block check
        const isBlocked = blocks.some((b: any) => {
          const bStart = new Date(b.start_date);
          const bEnd = new Date(b.end_date);
          return bStart < slotEnd && bEnd > slotStart;
        });
        if (isBlocked) continue;

        // Generate 30-min chunks
        let chunkStart = new Date(slotStart);
        while (chunkStart < slotEnd) {
          const chunkEnd = new Date(chunkStart.getTime() + 30 * 60000);

          const isBooked = appointments.some((appt: any) => {
            const apptStart = new Date(appt.scheduled_at);
            const apptEnd = new Date(apptStart.getTime() + (appt.duration_minutes || 30) * 60000);
            return apptStart < chunkEnd && apptEnd > chunkStart;
          });

          if (!isBooked && chunkStart > now) {
            const today = isDateToday(chunkStart);
            const tomorrow = isDateTomorrow(chunkStart);

            let displayDate = format(chunkStart, 'EEE, MMM d');
            if (today) displayDate = 'Today';
            if (tomorrow) displayDate = 'Tomorrow';

            slots.push({
              date: new Date(chunkStart),
              time: format(chunkStart, 'HH:mm'),
              displayDate,
              displayTime: format(chunkStart, 'h:mm a'),
            });
          }
          chunkStart = chunkEnd;
        }
      }
    }
    return slots;
  };

  /* ── Group slots by date ── */
  const dateGroups: DateGroup[] = useMemo(() => {
    const groups: Map<string, DateGroup> = new Map();
    for (const slot of availableSlots) {
      const key = format(slot.date, 'yyyy-MM-dd');
      if (!groups.has(key)) {
        groups.set(key, {
          label: slot.displayDate,
          dateKey: key,
          date: slot.date,
          slots: [],
        });
      }
      groups.get(key)!.slots.push(slot);
    }
    return Array.from(groups.values());
  }, [availableSlots]);

  /* ── Active date's slots ── */
  const activeGroup = dateGroups.find((g) => g.dateKey === activeDateKey);

  /* ── Today indicator: show a hint when today has no slots ── */
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayHasSlots = dateGroups.some((g) => g.dateKey === todayKey);
  const nextAvailableLabel = dateGroups.length > 0 ? dateGroups[0].label : null;

  /* ── Time-of-day sections for the active group ── */
  const timeOfDaySections = useMemo(() => {
    if (!activeGroup) return [];
    const morning: TimeSlot[] = [];
    const afternoon: TimeSlot[] = [];
    const evening: TimeSlot[] = [];

    for (const slot of activeGroup.slots) {
      const hour = slot.date.getHours();
      if (hour < 12) morning.push(slot);
      else if (hour < 17) afternoon.push(slot);
      else evening.push(slot);
    }

    const sections: { label: string; icon: typeof Sun; slots: TimeSlot[]; color: string }[] = [];
    if (morning.length > 0) sections.push({ label: 'Morning', icon: Sun, slots: morning, color: 'text-amber-500' });
    if (afternoon.length > 0) sections.push({ label: 'Afternoon', icon: Sunset, slots: afternoon, color: 'text-orange-500' });
    if (evening.length > 0) sections.push({ label: 'Evening', icon: Moon, slots: evening, color: 'text-indigo-500' });
    return sections;
  }, [activeGroup]);

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!selectedPatient || !selectedSlot || !appointmentType) {
      toast.error('Please complete all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await frontdeskApi.scheduleAppointment({
        patientId: selectedPatient.id,
        doctorId: doctor.id,
        appointmentDate: selectedSlot.date,
        time: selectedSlot.time,
        type: appointmentType,
        note: notes,
      });

      if (response.success) {
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(response.error || 'Failed to book appointment');
        if (response.error?.includes('booked')) {
          loadNextAvailableSlots();
        }
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('An error occurred while booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = selectedPatient && selectedSlot && appointmentType;
  const doctorColor = doctor.colorCode || '#0891b2';

  /* ── Progress indicator ── */
  const completedSteps = [
    !!selectedPatient,
    !!selectedSlot,
    !!appointmentType,
  ].filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px] p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        {/* ═══ Doctor Header ═══ */}
        <div
          className="relative px-6 pt-6 pb-5"
          style={{
            background: `linear-gradient(135deg, ${doctorColor}12 0%, ${doctorColor}06 50%, transparent 100%)`,
          }}
        >
          {/* Subtle accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
            style={{ background: `linear-gradient(90deg, ${doctorColor}, ${doctorColor}80)` }}
          />

          <DialogHeader className="space-y-0">
            <div className="flex items-start gap-4">
              {/* Doctor Avatar */}
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${doctorColor}, ${adjustColor(doctorColor, -30)})`,
                }}
              >
                {doctor.name.split(' ').slice(-1)[0]?.charAt(0) || 'D'}
              </div>

              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">
                  Quick Book Appointment
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-0.5">
                  {doctor.name}
                </DialogDescription>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: `${doctorColor}15`,
                      color: doctorColor,
                      border: `1px solid ${doctorColor}25`,
                    }}
                  >
                    <Stethoscope className="h-3 w-3 mr-1" />
                    {doctor.specialization}
                  </Badge>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Available
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mt-4">
            {[0, 1, 2].map((step) => (
              <div
                key={step}
                className={cn(
                  'h-1 flex-1 rounded-full transition-all duration-300',
                  step < completedSteps
                    ? 'bg-emerald-500'
                    : step === completedSteps
                      ? 'bg-slate-300'
                      : 'bg-slate-200/60'
                )}
              />
            ))}
          </div>
        </div>

        {/* ═══ Scrollable Body ═══ */}
        <ScrollArea className="max-h-[60vh]">
          <div className="px-6 py-5 space-y-6">

            {/* ── Section 1: Select Patient ── */}
            <section>
              <SectionHeader
                step={1}
                title="Select Patient"
                completed={!!selectedPatient}
                icon={User}
              />
              <div className="mt-3">
                <PatientCombobox
                  value={selectedPatient?.id || ''}
                  onSelect={(id, patient) => {
                    if (patient) setSelectedPatient(patient);
                  }}
                />
                {/* Selected patient card */}
                {selectedPatient && (
                  <div className="mt-2.5 flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 animate-in slide-in-from-top-1 duration-200">
                    <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {selectedPatient.email} {selectedPatient.phone ? `• ${selectedPatient.phone}` : ''}
                      </p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <button
                      onClick={() => setSelectedPatient(null)}
                      className="p-1 rounded-md hover:bg-emerald-100 transition-colors shrink-0"
                    >
                      <X className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  </div>
                )}
              </div>
            </section>

            <Separator className="bg-slate-100" />

            {/* ── Section 2: Pick Date & Time ── */}
            <section>
              <SectionHeader
                step={2}
                title="Pick Date & Time"
                completed={!!selectedSlot}
                icon={Clock}
              />

              <div className="mt-3">
                {isLoadingSlots ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="text-center space-y-2.5">
                      <div className="relative mx-auto w-10 h-10">
                        <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
                        <div className="absolute inset-0 rounded-full border-2 border-t-cyan-500 animate-spin" />
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Loading available slots...</p>
                    </div>
                  </div>
                ) : dateGroups.length > 0 ? (
                  <div className="space-y-3">
                    {/* ── Today hint ── */}
                    {!todayHasSlots && nextAvailableLabel && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-700">
                        <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                        <p className="text-xs font-medium">
                          No remaining slots today — next available: <span className="font-bold">{nextAvailableLabel}</span>
                        </p>
                      </div>
                    )}

                    {/* ── Date Chips ── horizontal scroll with rich pills */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1 scrollbar-none">
                      {dateGroups.map((group, gIdx) => {
                        const isActive = group.dateKey === activeDateKey;
                        const today = group.label === 'Today';
                        const tomorrow = group.label === 'Tomorrow';
                        const dayName = today ? 'Today' : tomorrow ? 'Tomorrow' : format(group.date, 'EEE');
                        const dateNum = format(group.date, 'd');
                        const monthLabel = format(group.date, 'MMM');

                        return (
                          <button
                            key={group.dateKey}
                            onClick={() => {
                              setActiveDateKey(group.dateKey);
                              setSelectedSlot(null);
                            }}
                            className={cn(
                              'shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border min-w-[60px]',
                              isActive
                                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                              today && !isActive && 'border-cyan-300 bg-cyan-50/60 text-cyan-700 ring-1 ring-cyan-200',
                            )}
                          >
                            {/* Day label */}
                            <span className={cn(
                              'text-[10px] font-bold uppercase tracking-wider leading-none',
                              isActive ? 'text-slate-400' : today ? 'text-cyan-600' : 'text-slate-400'
                            )}>
                              {dayName}
                            </span>
                            {/* Date number */}
                            <span className={cn(
                              'text-lg font-bold leading-none',
                              isActive ? 'text-white' : today ? 'text-cyan-700' : 'text-slate-800'
                            )}>
                              {dateNum}
                            </span>
                            {/* Month + slot count */}
                            <span className={cn(
                              'text-[9px] font-medium leading-none',
                              isActive ? 'text-slate-500' : 'text-slate-400'
                            )}>
                              {!today && !tomorrow ? monthLabel + ' · ' : ''}{group.slots.length} slot{group.slots.length !== 1 ? 's' : ''}
                            </span>
                            {/* Today indicator dot */}
                            {today && !isActive && (
                              <div className="w-1 h-1 rounded-full bg-cyan-500 mt-0.5" />
                            )}
                            {/* Next-available flash */}
                            {gIdx === 0 && !isActive && (
                              <Zap className="h-2.5 w-2.5 text-amber-500 mt-0.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* ── Time slots — grouped by morning / afternoon / evening ── */}
                    {activeGroup ? (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        {timeOfDaySections.map((section) => (
                          <div key={section.label}>
                            {/* Section label */}
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <section.icon className={cn('h-3 w-3', section.color)} />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {section.label}
                              </span>
                              <span className="text-[10px] text-slate-300 font-medium">
                                ({section.slots.length})
                              </span>
                            </div>
                            {/* Slot grid */}
                            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                              {section.slots.map((slot, idx) => {
                                const isSelected = selectedSlot?.date.getTime() === slot.date.getTime();
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => setSelectedSlot(slot)}
                                    className={cn(
                                      'relative py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-150 border text-center',
                                      isSelected
                                        ? 'bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-200/50 scale-[1.03]'
                                        : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/40 hover:shadow-sm'
                                    )}
                                  >
                                    {slot.displayTime}
                                    {isSelected && (
                                      <CheckCircle2 className="absolute -top-1 -right-1 h-3.5 w-3.5 text-white bg-cyan-600 rounded-full animate-in zoom-in duration-150" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4">
                        Select a date above to view slots
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-slate-200 bg-slate-50/30">
                    <CalendarIcon className="h-10 w-10 text-slate-200 mb-3" />
                    <p className="text-sm font-medium text-slate-500">No slots in the next 2 weeks</p>
                    <p className="text-xs text-slate-400 mt-1">The doctor&apos;s schedule may not be configured yet</p>
                  </div>
                )}
              </div>
            </section>

            <Separator className="bg-slate-100" />

            {/* ── Section 3: Appointment Details ── */}
            <section>
              <SectionHeader
                step={3}
                title="Appointment Details"
                completed={!!appointmentType}
                icon={FileText}
              />

              <div className="mt-3 space-y-3">
                <div>
                  <Label htmlFor="qb-type" className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Type <span className="text-red-400">*</span>
                  </Label>
                  <Select value={appointmentType} onValueChange={setAppointmentType}>
                    <SelectTrigger id="qb-type" className="h-10 rounded-xl border-slate-200">
                      <SelectValue placeholder="Select appointment type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Initial Consultation">
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
                          Initial Consultation
                        </span>
                      </SelectItem>
                      <SelectItem value="Follow-up">Follow-up Visit</SelectItem>
                      <SelectItem value="Routine Checkup">Routine Checkup</SelectItem>
                      <SelectItem value="Procedure">Procedure</SelectItem>
                      <SelectItem value="Pre-op Assessment">Pre-op Assessment</SelectItem>
                      <SelectItem value="Post-op Review">Post-op Review</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="qb-notes" className="text-xs font-semibold text-slate-600 mb-1.5 block">
                    Notes <span className="text-slate-300 font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="qb-notes"
                    placeholder="Any relevant notes for this appointment..."
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="rounded-xl border-slate-200 resize-none text-sm"
                  />
                </div>
              </div>
            </section>

            {/* ── Booking Summary ── */}
            {isFormValid && (
              <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white animate-in slide-in-from-bottom-2 duration-300 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-sm font-bold tracking-tight">Booking Summary</h4>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <SummaryRow label="Patient" value={`${selectedPatient?.firstName} ${selectedPatient?.lastName}`} />
                  <SummaryRow label="Doctor" value={doctor.name} />
                  <SummaryRow
                    label="When"
                    value={
                      selectedSlot
                        ? `${selectedSlot.displayDate === 'Today' || selectedSlot.displayDate === 'Tomorrow'
                            ? selectedSlot.displayDate + ', ' + format(selectedSlot.date, 'MMM d')
                            : selectedSlot.displayDate
                          } at ${selectedSlot.displayTime}`
                        : ''
                    }
                  />
                  <SummaryRow label="Type" value={appointmentType} />
                  {notes && <SummaryRow label="Notes" value={notes} />}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ═══ Footer Actions ═══ */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400 font-medium">
            {completedSteps}/3 steps completed
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-slate-500 hover:text-slate-700 rounded-xl px-4"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              className={cn(
                'rounded-xl px-5 shadow-sm transition-all duration-200',
                isFormValid
                  ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-200/50'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Confirm Booking
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════ Sub-Components ═══════════════════════ */

/** Numbered section header with completion indicator */
function SectionHeader({
  step,
  title,
  completed,
  icon: Icon,
}: {
  step: number;
  title: string;
  completed: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          'h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200 shrink-0',
          completed
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-100 text-slate-500'
        )}
      >
        {completed ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          step
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5', completed ? 'text-emerald-600' : 'text-slate-400')} />
        <span className={cn(
          'text-sm font-semibold',
          completed ? 'text-emerald-700' : 'text-slate-700'
        )}>
          {title}
        </span>
      </div>
    </div>
  );
}

/** Summary row for the booking summary card */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      <span className="text-xs font-medium text-white text-right truncate">{value}</span>
    </div>
  );
}

/** Darken/lighten a hex colour */
function adjustColor(color: string, amount: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, val));
  let hex = color.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const num = parseInt(hex, 16);
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0x00ff) + amount);
  const b = clamp((num & 0x0000ff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
