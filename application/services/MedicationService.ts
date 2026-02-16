import { PrismaClient } from '@prisma/client';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';

export interface AdministerMedicationDto {
    inventoryItemId?: number;
    name: string;
    doseValue: number;
    doseUnit: string;
    route: string;
    notes?: string;
    administerNow?: boolean; // If false, status = DRAFT
    administeredAt?: string; // ISO or date string for historical entry
}

export class MedicationService {
    constructor(private db: PrismaClient) { }

    /**
     * List all medications in inventory (active and categorized as MEDICATION)
     */
    async listEligibleMedications(query?: string) {
        return this.db.inventoryItem.findMany({
            where: {
                category: InventoryCategory.MEDICATION,
                is_active: true,
                OR: query ? [
                    { name: { contains: query, mode: 'insensitive' } },
                    { sku: { contains: query, mode: 'insensitive' } },
                    // @ts-ignore - Environmental sync issue with Prisma types
                    { manufacturer: { contains: query, mode: 'insensitive' } },
                ] : undefined,
            },
            select: {
                id: true,
                name: true,
                sku: true,
                unit_of_measure: true,
                unit_cost: true,
                quantity_on_hand: true,
                is_billable: true,
            },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Administer (or draft) a medication for a surgical case.
     * Transactional: Record + Stock Deduction + Bill Line Item.
     */
    async administerMedication(caseId: string, formResponseId: string | undefined, dto: AdministerMedicationDto, userId: string) {
        const { inventoryItemId, name, doseValue, doseUnit, route, notes, administerNow, administeredAt } = dto;
        const status = administerNow ? 'ADMINISTERED' : 'DRAFT';
        const adminDate = administeredAt ? new Date(administeredAt) : new Date();

        return this.db.$transaction(async (tx) => {
            // 1. Get Inventory Item if applicable
            let inventoryItem = null;
            if (inventoryItemId) {
                inventoryItem = await tx.inventoryItem.findUnique({
                    where: { id: inventoryItemId },
                });
                if (!inventoryItem) throw new Error('Inventory item not found');
                if (administerNow && inventoryItem.quantity_on_hand < 1) {
                    throw new Error(`Insufficient stock for ${inventoryItem.name}`);
                }
            }

            // 2. Create Medication Record
            // @ts-ignore - Environmental sync issue with Prisma types
            const record = await tx.surgicalMedicationRecord.create({
                data: {
                    surgical_case_id: caseId,
                    form_response_id: formResponseId,
                    inventory_item_id: inventoryItemId,
                    name: inventoryItem?.name || name,
                    dose_value: doseValue,
                    dose_unit: doseUnit,
                    route: route,
                    status: status,
                    notes: notes,
                    administered_by: administerNow ? userId : null,
                    administered_at: administerNow ? adminDate : null,
                },
            });

            if (administerNow && inventoryItemId && inventoryItem) {
                // 3. Deduct Stock (InventoryUsage)
                const usage = await tx.inventoryUsage.create({
                    data: {
                        inventory_item_id: inventoryItemId,
                        surgical_case_id: caseId,
                        quantity_used: 1,
                        unit_cost_at_time: inventoryItem.unit_cost,
                        total_cost: inventoryItem.unit_cost,
                        recorded_by: userId,
                        notes: `Automated from medication record: ${record.id}`,
                        // @ts-ignore - Environmental sync issue with Prisma types
                        surgical_medication_record_id: record.id,
                    },
                });

                // 4. Automated Billing (PatientBill)
                if (inventoryItem.is_billable) {
                    let payment = await tx.payment.findUnique({
                        where: { surgical_case_id: caseId },
                    });

                    if (!payment) {
                        const surgicalCase = await tx.surgicalCase.findUnique({
                            where: { id: caseId },
                            select: { patient_id: true },
                        });
                        if (!surgicalCase) throw new Error('Surgical case not found');

                        payment = await tx.payment.create({
                            data: {
                                patient_id: surgicalCase.patient_id,
                                surgical_case_id: caseId,
                                bill_type: 'SURGERY',
                                bill_date: new Date(),
                                total_amount: 0,
                                status: 'UNPAID',
                            },
                        });
                    }

                    const medicationService = await tx.service.findFirst({
                        where: { category: 'Medication', is_active: true },
                    });

                    if (medicationService) {
                        const billItem = await tx.patientBill.create({
                            data: {
                                payment_id: payment.id,
                                service_id: medicationService.id,
                                service_date: adminDate,
                                quantity: 1,
                                unit_cost: inventoryItem.unit_cost,
                                total_cost: inventoryItem.unit_cost,
                                // @ts-ignore - Environmental sync issue with Prisma types
                                surgical_medication_record_id: record.id,
                                inventory_usage: { connect: { id: usage.id } },
                            },
                        });

                        // Update total amount in payment
                        await tx.payment.update({
                            where: { id: payment.id },
                            data: { total_amount: { increment: inventoryItem.unit_cost } },
                        });
                    }
                }
            }

            return record;
        });
    }

    /**
     * Void a medication record.
     * Reverses stock and billing.
     */
    async voidMedication(recordId: string, reason: string, userId: string) {
        return this.db.$transaction(async (tx) => {
            // @ts-ignore - Environmental sync issue with Prisma types
            const record = await tx.surgicalMedicationRecord.findUnique({
                where: { id: recordId },
                include: { inventory_usage: true, bill_item: true },
            });

            if (!record) throw new Error('Medication record not found');
            if (record.status === 'VOIDED') throw new Error('Already voided');

            // 1. Update status to VOIDED
            // @ts-ignore - Environmental sync issue with Prisma types
            const updated = await tx.surgicalMedicationRecord.update({
                where: { id: recordId },
                data: {
                    status: 'VOIDED',
                    void_reason: reason,
                    voided_at: new Date(),
                    voided_by: userId,
                },
            });

            // 2. Reverse Stock
            if (record.inventory_usage && record.inventory_item_id) {
                await tx.inventoryItem.update({
                    where: { id: record.inventory_item_id },
                    data: { quantity_on_hand: { increment: record.inventory_usage.quantity_used } },
                });

                await tx.inventoryUsage.update({
                    where: { id: record.inventory_usage.id },
                    data: { notes: (record.inventory_usage.notes || '') + ` | VOIDED by ${userId}: ${reason}` },
                });
            }

            // 3. Reverse Billing
            if (record.bill_item) {
                const billItem = record.bill_item;
                const payment = await tx.payment.findUnique({ where: { id: billItem.payment_id } });
                if (payment) {
                    await tx.payment.update({
                        where: { id: payment.id },
                        data: { total_amount: { decrement: billItem.total_cost } },
                    });
                }

                await tx.patientBill.delete({ where: { id: billItem.id } });
            }

            return updated;
        });
    }

    /**
     * List records for a surgical case
     */
    async getCaseAdministrations(caseId: string) {
        // @ts-ignore - Environmental sync issue with Prisma types
        return this.db.surgicalMedicationRecord.findMany({
            where: { surgical_case_id: caseId },
            orderBy: { administered_at: 'desc' },
        });
    }
}
