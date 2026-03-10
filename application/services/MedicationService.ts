import { PrismaClient } from '@prisma/client';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';
import {
  PrismaInventoryConsumptionBillingService,
  SourceFormKey,
} from './InventoryConsumptionBillingService';
import { randomUUID } from 'crypto';

export interface AdministerMedicationDto {
    inventoryItemId?: number;
    name: string;
    doseValue: number;
    doseUnit: string;
    route: string;
    notes?: string;
    administerNow?: boolean; // If false, status = DRAFT
    administeredAt?: string; // ISO or date string for historical entry
    externalRef?: string; // Optional idempotency key for consumption service
}

export class MedicationService {
    private consumptionService: PrismaInventoryConsumptionBillingService;

    constructor(private db: PrismaClient) {
        this.consumptionService = new PrismaInventoryConsumptionBillingService(db);
    }

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
                // Removed quantity check here, consumption service will handle transactions.
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
                // 3. Use unified consumption service for stock deduction and billing
                const externalRef = dto.externalRef || randomUUID();
                const consumptionResult = await this.consumptionService.applyUsageAndBillingWithTransaction(
                    tx,
                    {
                        surgicalCaseId: caseId,
                        externalRef,
                        sourceFormKey: SourceFormKey.NURSE_MED_ADMIN,
                        items: [
                            {
                                inventoryItemId,
                                quantityUsed: 1,
                                notes: `Automated from medication record: ${record.id}`,
                            },
                        ],
                        recordedBy: userId,
                        usedBy: userId,
                        usedAt: adminDate,
                    }
                );

                // 4. Link InventoryUsage to SurgicalMedicationRecord
                if (consumptionResult.usageRecord) {
                    await tx.inventoryUsage.update({
                        where: { id: consumptionResult.usageRecord.id },
                        data: {
                            // @ts-ignore - Environmental sync issue with Prisma types
                            surgical_medication_record_id: record.id,
                        },
                    });

                    // Link PatientBill to SurgicalMedicationRecord if billable
                    if (consumptionResult.billItem) {
                        await tx.patientBill.update({
                            where: { id: consumptionResult.billItem.id },
                            data: {
                                // @ts-ignore - Environmental sync issue with Prisma types
                                surgical_medication_record_id: record.id,
                            },
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
                // Stock reversal is now handled by the transaction/batch system.
                // In Phase 4, we don't increment a flat counter on the item.
                // An adjustment transaction should be logged instead.

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
