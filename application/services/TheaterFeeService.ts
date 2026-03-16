/**
 * Theater Fee Service
 * 
 * Business logic for theater fee calculations.
 * Modular service for handling surgical theater billing.
 */

import db from '@/lib/db';

export interface TheaterFeeCalculation {
    surgicalCaseId: string;
    baseFee: number;
    durationHours: number;
    durationFee: number;
    totalFee: number;
    formatted: string;
}

export class TheaterFeeService {
    private readonly BASE_FEE = 30000; // KES 30,000 base
    private readonly HOURLY_RATE = 15000; // KES 15,000 per hour

    async calculate(surgicalCaseId: string): Promise<TheaterFeeCalculation> {
        const surgicalCase = await db.surgicalCase.findUnique({
            where: { id: surgicalCaseId },
            include: {
                theater_booking: true,
                primary_surgeon: true,
            },
        });

        if (!surgicalCase) {
            throw new Error(`Surgical case ${surgicalCaseId} not found`);
        }

        let durationHours = 2; // Default 2 hours

        if (surgicalCase.theater_booking) {
            const booking = surgicalCase.theater_booking;
            if (booking.start_time && booking.end_time) {
                const start = new Date(booking.start_time).getTime();
                const end = new Date(booking.end_time).getTime();
                durationHours = Math.max(1, (end - start) / (1000 * 60 * 60));
            }
        }

        const durationFee = Math.ceil(durationHours * this.HOURLY_RATE);
        const totalFee = this.BASE_FEE + durationFee;

        return {
            surgicalCaseId,
            baseFee: this.BASE_FEE,
            durationHours: Math.round(durationHours * 10) / 10,
            durationFee,
            totalFee,
            formatted: `KES ${totalFee.toLocaleString()}`,
        };
    }
}

export const theaterFeeService = new TheaterFeeService();
