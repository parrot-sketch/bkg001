'use client';

import { motion } from 'framer-motion';
import { Clock, Play, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

interface QueuePatientCardProps {
  appointment: AppointmentResponseDto;
  isNext: boolean;
  isStarting: boolean;
  onInitiateSwitch: (apt: AppointmentResponseDto) => void;
}

export function QueuePatientCard({
  appointment,
  isNext,
  isStarting,
  onInitiateSwitch,
}: QueuePatientCardProps) {
  const patientName = appointment.patient
    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
    : 'Unknown';
  const initials = patientName.substring(0, 2).toUpperCase();
  const waitTime = appointment.checkedInAt
    ? formatDistanceToNow(new Date(appointment.checkedInAt), { addSuffix: false })
    : 'Just arrived';

  return (
    <motion.div
      layout
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={cn(
        "p-4 rounded-2xl mx-1 transition-all duration-300 group border",
        isNext
          ? "bg-emerald-50 border-emerald-100 shadow-sm"
          : "bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm"
      )}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className={cn(
            "h-10 w-10 border-2 transition-colors duration-300 shadow-sm",
            isNext ? "border-emerald-200 bg-emerald-100" : "border-slate-100 bg-slate-50"
          )}>
            <AvatarFallback className={cn(
              "text-xs font-bold",
              isNext ? "text-emerald-600" : "text-slate-400"
            )}>
              {initials}
            </AvatarFallback>
          </Avatar>
          {isNext && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse shadow-sm" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-bold text-[13px] truncate tracking-tight transition-colors",
            isNext ? "text-emerald-900" : "text-slate-700"
          )}>
            {patientName}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <Clock className="h-3 w-3 text-slate-400" />
            <span className={cn(
              "text-[10px] uppercase tracking-wider font-bold",
              isNext ? "text-emerald-600" : "text-slate-400"
            )}>
              {waitTime} WAIT
            </span>
          </div>
        </div>
      </div>

      {/* Quick Start Button */}
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          size="sm"
          onClick={() => onInitiateSwitch(appointment)}
          disabled={isStarting}
          className={cn(
            "w-full mt-4 h-9 text-[11px] font-bold uppercase tracking-widest transition-all rounded-xl border-none",
            isNext
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
          )}
        >
          {isStarting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
          ) : (
            <Play className="h-3 w-3 mr-2" />
          )}
          {isNext ? 'ADMIT PATIENT' : 'BEGIN SESSION'}
        </Button>
      </motion.div>

      {/* Type badge */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <Badge variant="outline" className="text-[9px] h-4.5 px-2 bg-slate-50 border-slate-100 text-slate-500 font-bold uppercase tracking-[0.1em]">
          {appointment.type || 'Consultation'}
        </Badge>
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Today</span>
      </div>
    </motion.div>
  );
}
