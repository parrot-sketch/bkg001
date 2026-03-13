import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicationService } from '../../application/services/MedicationService';
import { PrismaClient } from '@prisma/client';

describe('MedicationService', () => {
    let prismaMock: any;
    let medicationService: MedicationService;

    beforeEach(() => {
        prismaMock = {
            inventoryItem: {
                findMany: vi.fn(),
                findUnique: vi.fn(),
                update: vi.fn(),
            },
            inventoryBatch: {
                findMany: vi.fn(),
            },
            inventoryUsage: {
                create: vi.fn(),
                findUnique: vi.fn(),
                update: vi.fn(),
            },
            patientBill: {
                create: vi.fn().mockResolvedValue({ id: 1 }),
                findUnique: vi.fn(),
                findMany: vi.fn().mockResolvedValue([]),
                update: vi.fn(),
            },
            patientBillItem: {
                create: vi.fn().mockResolvedValue({ id: 1 }),
            },
            payment: {
                findUnique: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
            },
            surgicalMedicationRecord: {
                create: vi.fn(),
                findUnique: vi.fn(),
                findMany: vi.fn(),
                update: vi.fn(),
            },
            surgicalCase: {
                findUnique: vi.fn(),
            },
            service: {
                findFirst: vi.fn(),
            },
            $transaction: vi.fn((callback) => callback(prismaMock)),
        };
        medicationService = new MedicationService(prismaMock as unknown as PrismaClient);
    });

    it('should list eligible medications correctly', async () => {
        prismaMock.inventoryItem.findMany.mockResolvedValue([
            { id: 1, name: 'Paracetamol', sku: null, unit_of_measure: 'tablet', unit_cost: 0.5, is_billable: true, is_active: true }
        ]);
        prismaMock.inventoryBatch.findMany.mockResolvedValue([
            { batch_number: 'LOT001', quantity_remaining: 100, expiry_date: null }
        ]);

        const result = await medicationService.listEligibleMedications('Para');

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Paracetamol');
        expect(result[0].quantity_on_hand).toBe(100);
        expect(result[0].available_lot_numbers).toContain('LOT001');
        expect(prismaMock.inventoryItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                is_active: true
            })
        }));
    });

    it('should administer medication and create billing/inventory records', async () => {
        const adminData = {
            inventoryItemId: 1,
            name: 'Paracetamol',
            doseValue: 500,
            doseUnit: 'mg',
            route: 'PO',
            administeredBy: 'nurse-1',
            administerNow: true
        };

        prismaMock.inventoryItem.findUnique.mockResolvedValue({
            id: 1,
            name: 'Paracetamol',
            unit_cost: 10.5,
            is_active: true,
            quantity_on_hand: 100,
            is_billable: true
        });

        prismaMock.surgicalMedicationRecord.create.mockResolvedValue({
            id: 'admin-1',
            ...adminData,
            status: 'ADMINISTERED'
        });

        // Mocking the transaction result
        prismaMock.$transaction.mockImplementation(async (cb: any) => {
            return await cb(prismaMock);
        });

        // Mock additional queries for billing
        prismaMock.surgicalCase.findUnique.mockResolvedValue({ patient_id: 'patient-123' });
        prismaMock.service.findFirst.mockResolvedValue({ id: 99 });
        prismaMock.payment.create.mockResolvedValue({ id: 50 }); // Mock payment creation
        prismaMock.inventoryUsage.create.mockResolvedValue({ id: 75 }); // Mock usage creation

        const result = await medicationService.administerMedication('case-1', 'form-1', adminData, 'nurse-1');

        expect(result).toBeDefined();
        expect(result.status).toBe('ADMINISTERED');
        expect(prismaMock.surgicalMedicationRecord.create).toHaveBeenCalled();
    });
});
