/**
 * Billing Repository
 * 
 * Data access layer for billing operations.
 * Handles all database interactions for payments and bill items.
 */

import { PrismaClient, PaymentStatus, BillType, PaymentMethod } from '@prisma/client';
import db from '@/lib/db';

export interface CreatePaymentParams {
    patientId: string;
    billType: BillType;
    sourceId?: string;
    appointmentId?: number;
    surgicalCaseId?: string;
    totalAmount: number;
    discount?: number;
    notes?: string;
    billItems?: Array<{
        serviceId: number;
        quantity: number;
        unitCost: number;
    }>;
}

export interface UpdatePaymentParams {
    totalAmount: number;
    discount?: number;
    notes?: string;
    billItems?: Array<{
        serviceId: number;
        quantity: number;
        unitCost: number;
    }>;
}

export interface PaymentWithRelations {
    id: number;
    patientId: string;
    billType: BillType;
    sourceId?: string;
    billDate: Date;
    totalAmount: number;
    amountPaid: number;
    discount: number;
    balance: number;
    status: PaymentStatus;
    receiptNumber?: string;
    notes: string | null | undefined;
    patient?: { id: string; firstName: string; lastName: string };
    billItems?: Array<{
        id: number;
        serviceName: string;
        quantity: number;
        unitCost: number;
        totalCost: number;
    }>;
    source?: { type: string; id: string; name: string };
}

export class BillingRepository {
    private readonly prisma: PrismaClient;

    constructor(prisma: PrismaClient = db) {
        this.prisma = prisma;
    }

    async create(params: CreatePaymentParams): Promise<number> {
        const { patientId, billType, sourceId, appointmentId, surgicalCaseId, totalAmount, discount = 0, notes, billItems } = params;

        const payment = await this.prisma.payment.create({
            data: {
                patient_id: patientId,
                bill_type: billType,
                appointment_id: appointmentId,
                surgical_case_id: surgicalCaseId,
                bill_date: new Date(),
                total_amount: totalAmount,
                discount,
                amount_paid: 0,
                payment_method: PaymentMethod.CASH,
                status: PaymentStatus.UNPAID,
                notes,
                bill_items: billItems ? {
                    create: billItems.map(item => ({
                        service_id: item.serviceId,
                        service_date: new Date(),
                        quantity: item.quantity,
                        unit_cost: item.unitCost,
                        total_cost: item.quantity * item.unitCost,
                    })),
                } : undefined,
            },
        });

        return payment.id;
    }

    async update(paymentId: number, params: UpdatePaymentParams): Promise<void> {
        const { totalAmount, discount, notes, billItems } = params;

        await this.prisma.$transaction(async (tx) => {
            // Update payment
            await tx.payment.update({
                where: { id: paymentId },
                data: {
                    total_amount: totalAmount,
                    discount,
                    notes,
                },
            });

            // Replace bill items
            if (billItems) {
                await tx.patientBill.deleteMany({ where: { payment_id: paymentId } });
                await tx.patientBill.createMany({
                    data: billItems.map(item => ({
                        payment_id: paymentId,
                        service_id: item.serviceId,
                        service_date: new Date(),
                        quantity: item.quantity,
                        unit_cost: item.unitCost,
                        total_cost: item.quantity * item.unitCost,
                    })),
                });
            }
        });
    }

    async recordPayment(paymentId: number, amountPaid: number, paymentMethod: PaymentMethod): Promise<void> {
        const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment) throw new Error(`Payment ${paymentId} not found`);

        const newAmountPaid = payment.amount_paid + amountPaid;
        const payableAmount = payment.total_amount - payment.discount;

        let newStatus: PaymentStatus;
        if (newAmountPaid >= payableAmount) newStatus = PaymentStatus.PAID;
        else if (newAmountPaid > 0) newStatus = PaymentStatus.PART;
        else newStatus = PaymentStatus.UNPAID;

        await this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                amount_paid: newAmountPaid,
                payment_method: paymentMethod,
                status: newStatus,
                payment_date: newStatus === PaymentStatus.PAID ? new Date() : payment.payment_date,
            },
        });
    }

    async findById(paymentId: number): Promise<PaymentWithRelations | null> {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                patient: { select: { id: true, first_name: true, last_name: true } },
                appointment: { select: { id: true, appointment_date: true, time: true, doctor: { select: { name: true } } } },
                surgical_case: { select: { id: true, procedure_name: true, primary_surgeon: { select: { name: true } } } },
                bill_items: { include: { service: { select: { service_name: true } } } },
            },
        });

        if (!payment) return null;

        const balance = payment.total_amount - payment.amount_paid - payment.discount;

        let source: PaymentWithRelations['source'];
        if (payment.appointment) {
            source = { type: 'APPOINTMENT', id: String(payment.appointment.id), name: `Consultation - ${payment.appointment.doctor?.name}` };
        } else if (payment.surgical_case) {
            source = { type: 'SURGICAL_CASE', id: payment.surgical_case.id, name: payment.surgical_case.procedure_name || 'Surgery' };
        }

        return {
            id: payment.id,
            patientId: payment.patient_id,
            billType: payment.bill_type,
            sourceId: payment.surgical_case_id || (payment.appointment_id ? String(payment.appointment_id) : undefined),
            billDate: payment.bill_date,
            totalAmount: payment.total_amount,
            amountPaid: payment.amount_paid,
            discount: payment.discount,
            balance,
            status: payment.status,
            receiptNumber: payment.receipt_number ?? undefined,
            notes: payment.notes,
            patient: payment.patient ? { id: payment.patient.id, firstName: payment.patient.first_name, lastName: payment.patient.last_name } : undefined,
            billItems: payment.bill_items?.map(item => ({
                id: item.id,
                serviceName: item.service?.service_name || 'Unknown',
                quantity: item.quantity,
                unitCost: item.unit_cost,
                totalCost: item.total_cost,
            })),
            source,
        };
    }

    async findByPatient(patientId: string): Promise<PaymentWithRelations[]> {
        const payments = await this.prisma.payment.findMany({
            where: { patient_id: patientId },
            orderBy: { bill_date: 'desc' },
        });

        const results: PaymentWithRelations[] = [];
        for (const p of payments) {
            const detailed = await this.findById(p.id);
            if (detailed) results.push(detailed);
        }
        return results;
    }

    async findAll(filters?: { status?: PaymentStatus; billType?: BillType }): Promise<PaymentWithRelations[]> {
        const where: any = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.billType) where.bill_type = filters.billType;

        const payments = await this.prisma.payment.findMany({
            where,
            orderBy: { bill_date: 'desc' },
            take: 500,
        });

        const results: PaymentWithRelations[] = [];
        for (const p of payments) {
            const detailed = await this.findById(p.id);
            if (detailed) results.push(detailed);
        }
        return results;
    }

    async getSummary(filters?: { status?: PaymentStatus; startDate?: Date; endDate?: Date }): Promise<{
        totalBilled: number;
        totalCollected: number;
        totalPending: number;
        byStatus: Record<string, number>;
        byType: Record<string, number>;
    }> {
        const where: any = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.startDate || filters?.endDate) {
            where.bill_date = {};
            if (filters.startDate) where.bill_date.gte = filters.startDate;
            if (filters.endDate) where.bill_date.lte = filters.endDate;
        }

        const payments = await this.prisma.payment.findMany({ where });

        const totalBilled = payments.reduce((sum, p) => sum + p.total_amount, 0);
        const totalCollected = payments.reduce((sum, p) => sum + p.amount_paid, 0);
        const totalPending = totalBilled - totalCollected;

        const byStatus = payments.reduce((acc, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const byType = payments.reduce((acc, p) => {
            acc[p.bill_type] = (acc[p.bill_type] || 0) + p.total_amount;
            return acc;
        }, {} as Record<string, number>);

        return { totalBilled, totalCollected, totalPending, byStatus, byType };
    }
}

export const billingRepository = new BillingRepository();
