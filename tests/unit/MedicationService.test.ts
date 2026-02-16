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
            inventoryUsage: {
                create: vi.fn(),
            },
            patientBill: {
                create: vi.fn(),
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
            { id: 1, name: 'Paracetamol', quantity_on_hand: 100, is_active: true }
        ]);

        const result = await medicationService.listEligibleMedications('Para');

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Paracetamol');
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
