/**
 * Theater Fee Calculator Service
 * 
 * Calculates theater usage fees based on:
 * - Theater hourly rate
 * - Duration of booking (start_time to end_time)
 * 
 * The fee is calculated in KES and can be used for:
 * - Previewing fees before booking confirmation
 * - Adding to patient billing when surgery is completed
 */

import { Theater, TheaterBooking } from '@prisma/client';

export interface TheaterFeeCalculation {
  theaterId: string;
  theaterName: string;
  theaterType: string;
  hourlyRate: number;
  startTime: Date;
  endTime: Date;
  durationHours: number;
  calculatedFee: number;
  breakdown: {
    baseAmount: number;
    durationFormatted: string;
  };
}

export interface TheaterWithRate extends Theater {
  hourly_rate: number;
}

/**
 * Calculate theater fee based on booking time
 * 
 * @param theater - Theater with hourly rate
 * @param startTime - Booking start time
 * @param endTime - Booking end time
 * @returns Detailed fee calculation
 */
export function calculateTheaterFee(
  theater: TheaterWithRate,
  startTime: Date,
  endTime: Date
): TheaterFeeCalculation {
  // Calculate duration in hours
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationHours = durationMs / (1000 * 60 * 60); // Convert ms to hours
  
  // Round to 2 decimal places
  const roundedHours = Math.round(durationHours * 100) / 100;
  
  // Calculate fee (hourly rate * duration hours)
  const calculatedFee = Math.round(theater.hourly_rate * roundedHours);
  
  // Format duration as hours and minutes
  const hours = Math.floor(roundedHours);
  const minutes = Math.round((roundedHours - hours) * 60);
  const durationFormatted = hours > 0 
    ? minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    : `${minutes}m`;
  
  return {
    theaterId: theater.id,
    theaterName: theater.name,
    theaterType: theater.type,
    hourlyRate: theater.hourly_rate,
    startTime,
    endTime,
    durationHours: roundedHours,
    calculatedFee,
    breakdown: {
      baseAmount: theater.hourly_rate,
      durationFormatted,
    },
  };
}

/**
 * Calculate estimated fee for a proposed booking time slot
 * Used for previewing fees before booking
 */
export async function calculateEstimatedFee(
  db: any,
  theaterId: string,
  startTime: Date,
  endTime: Date
): Promise<TheaterFeeCalculation | null> {
  const theater = await db.theater.findUnique({
    where: { id: theaterId },
  });
  
  if (!theater) {
    return null;
  }
  
  const theaterWithRate = {
    ...theater,
    hourly_rate: theater.hourly_rate || 0,
  } as TheaterWithRate;
  
  return calculateTheaterFee(theaterWithRate, startTime, endTime);
}

/**
 * Format currency for display (KES)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate total theater fees for a surgical case
 * This sums up all theater bookings for a case
 */
export async function calculateTotalTheaterFeesForCase(
  db: any,
  surgicalCaseId: string
): Promise<number> {
  const bookings = await db.theaterBooking.findMany({
    where: { 
      surgical_case_id: surgicalCaseId,
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    },
    include: {
      theater: true,
    },
  });
  
  let total = 0;
  for (const booking of bookings) {
    const calculation = calculateTheaterFee(
      { ...booking.theater, hourly_rate: booking.theater.hourly_rate || 0 } as TheaterWithRate,
      booking.start_time,
      booking.end_time
    );
    total += calculation.calculatedFee;
  }
  
  return total;
}
