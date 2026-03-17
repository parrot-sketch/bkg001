import { z } from 'zod';

export const LockTheaterSlotDto = z.object({
    caseId: z.string().uuid(),
    theaterId: z.string().uuid(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
});

export type LockTheaterSlotDto = z.infer<typeof LockTheaterSlotDto>;

export const ConfirmTheaterBookingDto = z.object({
    bookingId: z.string().uuid(),
});

export type ConfirmTheaterBookingDto = z.infer<typeof ConfirmTheaterBookingDto>;

export const CancelTheaterBookingDto = z.object({
    bookingId: z.string().uuid(),
    reason: z.string().optional(),
});

export type CancelTheaterBookingDto = z.infer<typeof CancelTheaterBookingDto>;

export interface TheaterSlotLockResult {
    bookingId: string;
    status: string;
    theaterId: string;
    theaterName: string;
    startTime: Date;
    endTime: Date;
    lockedAt: Date;
    lockExpiresAt: Date;
    caseId: string;
    caseStatus: string;
}

export interface TheaterBookingConfirmedResult {
    bookingId: string;
    status: string;
    theaterId: string;
    theaterName: string;
    startTime: Date;
    endTime: Date;
    confirmedAt: Date;
    caseId: string;
    caseStatus: string;
    billing: {
        created: boolean;
        theaterFee: {
            amount: number;
            serviceName: string;
            hours: number;
        } | null;
    };
}

export interface TheaterBookingCancelledResult {
    bookingId: string;
    status: string;
    caseId: string;
    caseStatus: string;
    billingReversed: boolean;
    reversedAmount: number;
}

export interface TheaterSchedulingQueueItem {
    id: string;
    caseNumber: string;
    status: string;
    urgency: string;
    procedure: string;
    patient: {
        id: string;
        name: string;
        fileNumber: string | null;
        dateOfBirth: Date | null;
        gender: string | null;
    };
    surgeon: {
        id: string;
        name: string;
        specialization: string | null;
    } | null;
    preOpChecklistFinalized: boolean;
    preOpChecklistFinalizedAt: Date | null;
    existingBooking: {
        id: string;
        theaterId: string;
        theaterName: string;
        startTime: Date;
        endTime: Date;
        status: string;
    } | null;
    createdAt: Date;
    scheduledAt: Date | null;
}

export interface TheaterWithBookings {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    hourlyRate: number;
    bookings: TheaterBookingSlot[];
}

export interface TheaterBookingSlot {
    id: string;
    caseId: string;
    caseNumber: string;
    patientName: string;
    procedure: string;
    startTime: Date;
    endTime: Date;
    status: string;
    lockedBy: string | null;
    lockedAt: Date | null;
    lockExpiresAt: Date | null;
}
