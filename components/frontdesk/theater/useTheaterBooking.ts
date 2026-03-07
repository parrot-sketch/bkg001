import { useState } from 'react';
import { toast } from 'sonner';

export type TheaterSlot = {
    theaterId: string;
    startTime: Date;
    endTime: Date;
};

export function useTheaterBooking(caseId: string) {
    const [isLoading, setIsLoading] = useState(false);
    const [provisionalBookingId, setProvisionalBookingId] = useState<string | null>(null);
    const [lockExpiresAt, setLockExpiresAt] = useState<Date | null>(null);

    const createProvisionalLock = async (slot: TheaterSlot) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/frontdesk/theater-booking/provisional', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    caseId,
                    theaterId: slot.theaterId,
                    startTime: slot.startTime.toISOString(),
                    endTime: slot.endTime.toISOString(),
                }),
            });

            const data = await res.json();
            
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to lock theater slot');
            }

            setProvisionalBookingId(data.data.id);
            setLockExpiresAt(new Date(data.data.lock_expires_at));
            return true;
        } catch (error: any) {
            toast.error(error.message || 'Failed to lock theater slot');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const confirmBooking = async () => {
        if (!provisionalBookingId) return false;
        
        setIsLoading(true);
        try {
            const res = await fetch('/api/frontdesk/theater-booking/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId: provisionalBookingId,
                }),
            });

            const data = await res.json();
            
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to confirm booking');
            }

            toast.success('Theater formally scheduled and locked for this surgical case.');
            
            return true;
        } catch (error: any) {
            toast.error(error.message || 'Failed to confirm booking');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const resetBooking = () => {
        setProvisionalBookingId(null);
        setLockExpiresAt(null);
    };

    return {
        isLoading,
        provisionalBookingId,
        lockExpiresAt,
        createProvisionalLock,
        confirmBooking,
        resetBooking
    };
}
