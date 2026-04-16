'use client';

/**
 * TheaterBookingSection Component
 *
 * Client component that shows theater booking status and allows booking
 * for surgical cases that are in READY_FOR_THEATER_BOOKING status.
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TheaterBookingModal } from '@/components/theater-tech/booking/TheaterBookingModal';

interface TheaterBookingSectionProps {
  caseId: string;
  caseStatus: string;
  totalTheatreMinutes: number | null;
  patientName: string;
  procedureName: string;
  theaterBooking?: {
    id: string;
    start_time: Date;
    end_time: Date;
    status: string;
    theater: {
      name: string;
    };
  } | null;
  onBookingComplete?: () => void;
}

// Status that allows theater booking
const BOOKABLE_STATUSES = ['READY_FOR_THEATER_BOOKING', 'IN_WARD_PREP', 'READY_FOR_WARD_PREP'];

export function TheaterBookingSection({
  caseId,
  caseStatus,
  totalTheatreMinutes,
  patientName,
  procedureName,
  theaterBooking,
  onBookingComplete,
}: TheaterBookingSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const canBook = BOOKABLE_STATUSES.includes(caseStatus) && !theaterBooking;
  const isScheduled = theaterBooking?.status === 'CONFIRMED';
  const isProvisional = theaterBooking?.status === 'PROVISIONAL';

  const duration = totalTheatreMinutes || 60; // Default 60 mins if not set

  return (
    <>
      {/* Current booking status */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isScheduled ? (
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
            ) : canBook ? (
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-slate-400" />
              </div>
            )}

            <div>
              <div className="text-sm font-medium text-slate-900">Theater Booking</div>
              {isScheduled && theaterBooking && (
                <div className="text-xs text-slate-500">
                  {theaterBooking.theater.name} · {format(new Date(theaterBooking.start_time), 'MMM d, h:mm a')}
                </div>
              )}
              {isProvisional && (
                <div className="text-xs text-amber-600">
                  Provisional booking pending confirmation
                </div>
              )}
              {!theaterBooking && caseStatus === 'SCHEDULED' && (
                <div className="text-xs text-slate-500">No theater assigned</div>
              )}
            </div>
          </div>

          {canBook && (
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              Book Theater
            </Button>
          )}
        </div>

        {/* Show booking details if exists */}
        {theaterBooking && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Theater</div>
              <div className="text-sm font-medium text-slate-800">{theaterBooking.theater.name}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Time</div>
              <div className="text-sm font-medium text-slate-800">
                {format(new Date(theaterBooking.start_time), 'h:mm a')} - {format(new Date(theaterBooking.end_time), 'h:mm a')}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Status</div>
              <div className={`text-sm font-medium ${
                isScheduled ? 'text-emerald-700' : isProvisional ? 'text-amber-700' : 'text-slate-700'
              }`}>
                {theaterBooking.status}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Date</div>
              <div className="text-sm font-medium text-slate-800">
                {format(new Date(theaterBooking.start_time), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {canBook && (
        <TheaterBookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          caseId={caseId}
          caseDurationMinutes={duration}
          patientName={patientName}
          procedureName={procedureName}
          onBookingConfirmed={() => {
            setIsModalOpen(false);
            onBookingComplete?.();
          }}
        />
      )}
    </>
  );
}