/**
 * Billing Service
 * 
 * Business logic for billing operations.
 * Uses BillingRepository for data access.
 */

import { BillType, PaymentMethod, PaymentStatus } from '@prisma/client';
import { billingRepository, PaymentWithRelations } from '../repositories/BillingRepository';

export enum BillingSource {
    CONSULTATION = 'CONSULTATION',
    SURGERY = 'SURGERY',
    THEATER = 'THEATER',
    MEDICATION = 'MEDICATION',
    INVENTORY = 'INVENTORY',
    LAB_TEST = 'LAB_TEST',
    FOLLOW_UP = 'FOLLOW_UP',
    OTHER = 'OTHER',
}

export interface BillingLineItem {
    serviceId?: number;
    description: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
}

export interface CreateBillingParams {
    patientId: string;
    source: BillingSource;
    sourceId?: string;
    lineItems: BillingLineItem[];
    discount?: number;
    notes?: string;
}

export interface UpdateBillingParams {
    billingId: number;
    lineItems?: BillingLineItem[];
    discount?: number;
    notes?: string;
}

export interface RecordPaymentParams {
    billingId: number;
    amountPaid: number;
    paymentMethod: PaymentMethod;
}

export class BillingService {
    async create(params: CreateBillingParams): Promise<PaymentWithRelations> {
        const { patientId, source, sourceId, lineItems, discount = 0, notes } = params;
        
        const totalAmount = lineItems.reduce((sum, item) => sum + item.totalCost, 0);
        const billType = this.mapSourceToBillType(source);

        let appointmentId: number | undefined;
        let surgicalCaseId: string | undefined;

        if (source === BillingSource.CONSULTATION && sourceId) {
            appointmentId = parseInt(sourceId, 10);
        } else if ([BillingSource.SURGERY, BillingSource.THEATER, BillingSource.MEDICATION, BillingSource.INVENTORY].includes(source) && sourceId) {
            surgicalCaseId = sourceId;
        }

        const billingId = await billingRepository.create({
            patientId,
            billType,
            sourceId,
            appointmentId,
            surgicalCaseId,
            totalAmount,
            discount,
            notes,
            billItems: lineItems
                .filter(item => item.serviceId)
                .map(item => ({
                    serviceId: item.serviceId!,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                })),
        });

        return billingRepository.findById(billingId) as Promise<PaymentWithRelations>;
    }

    async update(params: UpdateBillingParams): Promise<PaymentWithRelations> {
        const { billingId, lineItems, discount, notes } = params;

        const existing = await billingRepository.findById(billingId);
        if (!existing) throw new Error(`Billing ${billingId} not found`);
        if (existing.status === PaymentStatus.PAID) {
            throw new Error('Cannot update a paid billing record');
        }

        const totalAmount = lineItems
            ? lineItems.reduce((sum, item) => sum + item.totalCost, 0)
            : existing.totalAmount;

        await billingRepository.update(billingId, {
            totalAmount,
            discount: discount ?? existing.discount,
            notes: notes ?? existing.notes ?? undefined,
            billItems: lineItems?.filter(item => item.serviceId).map(item => ({
                serviceId: item.serviceId!,
                quantity: item.quantity,
                unitCost: item.unitCost,
            })),
        });

        return billingRepository.findById(billingId) as Promise<PaymentWithRelations>;
    }

    async recordPayment(params: RecordPaymentParams): Promise<PaymentWithRelations> {
        const { billingId, amountPaid, paymentMethod } = params;

        const existing = await billingRepository.findById(billingId);
        if (!existing) throw new Error(`Billing ${billingId} not found`);

        await billingRepository.recordPayment(billingId, amountPaid, paymentMethod);
        return billingRepository.findById(billingId) as Promise<PaymentWithRelations>;
    }

    async getById(billingId: number): Promise<PaymentWithRelations | null> {
        return billingRepository.findById(billingId);
    }

    async getByPatient(patientId: string): Promise<PaymentWithRelations[]> {
        return billingRepository.findByPatient(patientId);
    }

    async getAll(filters?: { status?: PaymentStatus; billType?: BillType }): Promise<PaymentWithRelations[]> {
        return billingRepository.findAll(filters);
    }

    async getSummary(filters?: { status?: PaymentStatus; startDate?: Date; endDate?: Date }) {
        return billingRepository.getSummary(filters);
    }

    private mapSourceToBillType(source: BillingSource): BillType {
        const mapping: Record<BillingSource, BillType> = {
            [BillingSource.CONSULTATION]: BillType.CONSULTATION,
            [BillingSource.SURGERY]: BillType.SURGERY,
            [BillingSource.THEATER]: BillType.SURGERY,
            [BillingSource.MEDICATION]: BillType.OTHER,
            [BillingSource.INVENTORY]: BillType.OTHER,
            [BillingSource.LAB_TEST]: BillType.LAB_TEST,
            [BillingSource.FOLLOW_UP]: BillType.FOLLOW_UP,
            [BillingSource.OTHER]: BillType.OTHER,
        };
        return mapping[source] || BillType.OTHER;
    }
}

export const billingService = new BillingService();
