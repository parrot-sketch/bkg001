/**
 * Charge Sheet Service
 * 
 * Formalizes the clinical billing record (Payment) into an accountable "Charge Sheet" 
 * artifact. Responsible for generation of tracking numbers and finalization lifecycle.
 */

import db from '@/lib/db';
import { billingRepository, PaymentWithRelations } from '../repositories/BillingRepository';

export class ChargeSheetService {
    
    /**
     * Determines if a payment record lacks a formal charge sheet number
     * and assigns one if needed. Used when first saving a draft.
     */
    async ensureChargeSheetNo(paymentId: number): Promise<string> {
        const payment = await db.payment.findUnique({
            where: { id: paymentId },
            select: { id: true, charge_sheet_no: true }
        });

        if (!payment) {
            throw new Error(`Payment ${paymentId} not found`);
        }

        if (payment.charge_sheet_no) {
            return payment.charge_sheet_no;
        }

        // Generate a simple sequential number based on the ID for uniqueness.
        // Format: CS-YYYY-XXXX
        const year = new Date().getFullYear();
        const sequence = String(payment.id).padStart(4, '0');
        const chargeSheetNo = `CS-${year}-${sequence}`;

        await db.payment.update({
            where: { id: paymentId },
            data: { charge_sheet_no: chargeSheetNo }
        });

        return chargeSheetNo;
    }

    /**
     * Locks the charge sheet (Payment record), signaling that clinical 
     * documentation is complete and the bill is ready for cashier processing.
     */
    async finalize(paymentId: number, finalizedBy: string): Promise<PaymentWithRelations> {
        const payment = await db.payment.findUnique({
            where: { id: paymentId },
            select: { id: true, finalized_at: true }
        });

        if (!payment) {
            throw new Error(`Payment ${paymentId} not found`);
        }

        if (payment.finalized_at) {
            // Already finalized, act idempotently or throw depending on strictness.
            // Returning the existing finalized record is safer for UI retries.
            const existing = await billingRepository.findById(paymentId);
            return existing!;
        }

        await db.payment.update({
            where: { id: paymentId },
            data: {
                finalized_at: new Date(),
                finalized_by: finalizedBy
            }
        });

        const finalized = await billingRepository.findById(paymentId);
        return finalized!;
    }

    /**
     * Helper checks if a given payment is finalized
     */
    async isFinalized(paymentId: number): Promise<boolean> {
        const payment = await db.payment.findUnique({
            where: { id: paymentId },
            select: { finalized_at: true }
        });
        
        return !!payment?.finalized_at;
    }
}

export const chargeSheetService = new ChargeSheetService();
