'use client';

/**
 * TheaterBookingSectionWrapper Client Component
 *
 * Wrapper to pass theater booking data to the TheaterBookingSection.
 */

import { TheaterBookingSection } from '@/components/theater-tech/booking/TheaterBookingSection';

interface TheaterBookingSectionWrapperProps {
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
}

export function TheaterBookingSectionWrapper({
  caseId,
  caseStatus,
  totalTheatreMinutes,
  patientName,
  procedureName,
  theaterBooking,
}: TheaterBookingSectionWrapperProps) {
  return (
    <TheaterBookingSection
      caseId={caseId}
      caseStatus={caseStatus}
      totalTheatreMinutes={totalTheatreMinutes}
      patientName={patientName}
      procedureName={procedureName}
      theaterBooking={theaterBooking}
    />
  );
}