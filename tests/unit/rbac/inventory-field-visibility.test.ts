/**
 * Unit Tests: Inventory Field-Level RBAC
 *
 * Tests the field visibility map and filtering logic for different user roles.
 * Validates that:
 * - ADMIN sees all fields
 * - STORES (procurement) sees pricing and management fields
 * - Clinical staff (DOCTOR, NURSE, LAB_TECHNICIAN) see limited operational fields
 * - THEATER_TECHNICIAN sees operational + billing fields
 * - FRONTDESK sees basic fields only
 * - CASHIER sees basic fields + billing status
 * - PATIENT has no inventory access
 * - Unknown role gets fail-safe public fields only
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Role } from '@/domain/enums/Role';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';
import {
  filterItemFields,
  getAllowedFieldsForRole,
  canViewField,
  FIELD_VISIBILITY_MAP,
} from '@/lib/rbac/inventory-field-visibility';
import type { InventoryItem } from '@/domain/interfaces/repositories/IInventoryRepository';

/**
 * Mock inventory item for testing
 */
const createMockInventoryItem = (overrides?: Partial<InventoryItem>): InventoryItem => ({
  id: 1,
  name: 'Surgical Gloves - Sterile',
  sku: 'SG-001',
  category: InventoryCategory.MEDICAL_SUPPLIES,
  description: 'Latex-free sterile gloves for surgical procedures',
  unitOfMeasure: 'box',
  unitCost: 45.5,
  reorderPoint: 10,
  lowStockThreshold: 20,
  supplier: 'MedSupply International',
  manufacturer: 'SafeHands Inc',
  isActive: true,
  isBillable: true,
  isImplant: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-04-01'),
  ...overrides,
});

describe('Inventory Field-Level RBAC', () => {
  let mockItem: InventoryItem;

  beforeEach(() => {
    mockItem = createMockInventoryItem();
  });

  describe('FIELD_VISIBILITY_MAP structure', () => {
    it('should define visibility rules for all roles', () => {
      const allRoles = Object.values(Role);
      const definedRoles = Object.keys(FIELD_VISIBILITY_MAP);

      for (const role of allRoles) {
        expect(definedRoles).toContain(role);
      }
    });

    it('should have ADMIN with all fields', () => {
      const adminFields = FIELD_VISIBILITY_MAP[Role.ADMIN];
      const allPossibleFields: (keyof InventoryItem)[] = [
        'id',
        'name',
        'sku',
        'category',
        'description',
        'unitOfMeasure',
        'unitCost',
        'reorderPoint',
        'lowStockThreshold',
        'supplier',
        'manufacturer',
        'isActive',
        'isBillable',
        'isImplant',
        'createdAt',
        'updatedAt',
      ];

      expect(adminFields.length).toBe(allPossibleFields.length);
      for (const field of allPossibleFields) {
        expect(adminFields).toContain(field);
      }
    });
  });

  describe('filterItemFields()', () => {
    describe('ADMIN role', () => {
      it('should include all fields for ADMIN', () => {
        const filtered = filterItemFields(mockItem, Role.ADMIN);

        expect(filtered).toHaveProperty('id', 1);
        expect(filtered).toHaveProperty('name', 'Surgical Gloves - Sterile');
        expect(filtered).toHaveProperty('sku', 'SG-001');
        expect(filtered).toHaveProperty('unitCost', 45.5);
        expect(filtered).toHaveProperty('reorderPoint', 10);
        expect(filtered).toHaveProperty('supplier', 'MedSupply International');
        expect(filtered).toHaveProperty('manufacturer', 'SafeHands Inc');
        expect(filtered).toHaveProperty('lowStockThreshold', 20);
      });
    });

    describe('STORES role (procurement)', () => {
      it('should include pricing and management fields', () => {
        const filtered = filterItemFields(mockItem, Role.STORES);

        // Should see pricing fields
        expect(filtered).toHaveProperty('unitCost');
        expect(filtered).toHaveProperty('reorderPoint');
        expect(filtered).toHaveProperty('lowStockThreshold');

        // Should see supplier info
        expect(filtered).toHaveProperty('supplier');
        expect(filtered).toHaveProperty('manufacturer');

        // Should see operational info
        expect(filtered).toHaveProperty('id');
        expect(filtered).toHaveProperty('name');
        expect(filtered).toHaveProperty('category');
      });
    });

    describe('DOCTOR role (clinical)', () => {
      it('should NOT see pricing fields', () => {
        const filtered = filterItemFields(mockItem, Role.DOCTOR);

        // Should NOT see pricing
        expect(filtered).not.toHaveProperty('unitCost');
        expect(filtered).not.toHaveProperty('reorderPoint');
        expect(filtered).not.toHaveProperty('lowStockThreshold');

        // Should NOT see supplier info
        expect(filtered).not.toHaveProperty('supplier');
        expect(filtered).not.toHaveProperty('manufacturer');

        // Should see operational info
        expect(filtered).toHaveProperty('id');
        expect(filtered).toHaveProperty('name');
        expect(filtered).toHaveProperty('category');
        expect(filtered).toHaveProperty('description');
        expect(filtered).toHaveProperty('isImplant');
      });

      it('should include only allowed fields', () => {
        const filtered = filterItemFields(mockItem, Role.DOCTOR);
        const allowedFields = FIELD_VISIBILITY_MAP[Role.DOCTOR];

        // Check that only allowed fields are present
        const presentFields = Object.keys(filtered) as (keyof InventoryItem)[];
        for (const field of presentFields) {
          expect(allowedFields).toContain(field);
        }
      });
    });

    describe('NURSE role', () => {
      it('should have similar access as DOCTOR', () => {
        const doctorFiltered = filterItemFields(mockItem, Role.DOCTOR);
        const nurseFiltered = filterItemFields(mockItem, Role.NURSE);

        expect(Object.keys(nurseFiltered).sort()).toEqual(
          Object.keys(doctorFiltered).sort()
        );
      });

      it('should NOT see pricing or supplier info', () => {
        const filtered = filterItemFields(mockItem, Role.NURSE);

        expect(filtered).not.toHaveProperty('unitCost');
        expect(filtered).not.toHaveProperty('supplier');
        expect(filtered).not.toHaveProperty('reorderPoint');
      });
    });

    describe('THEATER_TECHNICIAN role', () => {
      it('should see operational and billing info but NOT pricing', () => {
        const filtered = filterItemFields(mockItem, Role.THEATER_TECHNICIAN);

        // Should see billing status
        expect(filtered).toHaveProperty('isBillable');

        // Should NOT see pricing
        expect(filtered).not.toHaveProperty('unitCost');
        expect(filtered).not.toHaveProperty('reorderPoint');

        // Should see basic info
        expect(filtered).toHaveProperty('id');
        expect(filtered).toHaveProperty('name');
        expect(filtered).toHaveProperty('category');
      });
    });

    describe('FRONTDESK role', () => {
      it('should have very limited access', () => {
        const filtered = filterItemFields(mockItem, Role.FRONTDESK);

        // Should see only basic fields
        expect(filtered).toHaveProperty('id');
        expect(filtered).toHaveProperty('name');
        expect(filtered).toHaveProperty('category');
        expect(filtered).toHaveProperty('isActive');

        // Should NOT see pricing, supplier, or operational details
        expect(filtered).not.toHaveProperty('unitCost');
        expect(filtered).not.toHaveProperty('supplier');
        expect(filtered).not.toHaveProperty('sku');
        expect(filtered).not.toHaveProperty('reorderPoint');
      });
    });

    describe('CASHIER role', () => {
      it('should see basic info plus billing status', () => {
        const filtered = filterItemFields(mockItem, Role.CASHIER);

        // Should see basic fields
        expect(filtered).toHaveProperty('id');
        expect(filtered).toHaveProperty('name');
        expect(filtered).toHaveProperty('category');

        // Should see billing status
        expect(filtered).toHaveProperty('isBillable');

        // Should see active status
        expect(filtered).toHaveProperty('isActive');

        // Should NOT see pricing or operational details
        expect(filtered).not.toHaveProperty('unitCost');
        expect(filtered).not.toHaveProperty('reorderPoint');
      });
    });

    describe('LAB_TECHNICIAN role', () => {
      it('should see clinical operational fields', () => {
        const filtered = filterItemFields(mockItem, Role.LAB_TECHNICIAN);

        // Should see operational info
        expect(filtered).toHaveProperty('id');
        expect(filtered).toHaveProperty('name');
        expect(filtered).toHaveProperty('category');
        expect(filtered).toHaveProperty('description');

        // Should NOT see pricing
        expect(filtered).not.toHaveProperty('unitCost');
        expect(filtered).not.toHaveProperty('reorderPoint');
      });
    });

    describe('PATIENT role', () => {
      it('should have minimal access (ID only)', () => {
        const filtered = filterItemFields(mockItem, Role.PATIENT);

        // PATIENT should see almost nothing (fail-safe)
        expect(filtered).toHaveProperty('id');

        // Should NOT see any operational or pricing info
        expect(filtered).not.toHaveProperty('unitCost');
        expect(filtered).not.toHaveProperty('name'); // Arguably could see name, but restrict to ID only
      });
    });

    describe('Unknown/Invalid role', () => {
      it('should apply fail-safe public fields for unknown role', () => {
        const filtered = filterItemFields(mockItem, 'UNKNOWN_ROLE');

        // Should see only public fields
        expect(filtered).toHaveProperty('id');
        expect(filtered).toHaveProperty('name');
        expect(filtered).toHaveProperty('category');

        // Should NOT see any sensitive info
        expect(filtered).not.toHaveProperty('unitCost');
        expect(filtered).not.toHaveProperty('supplier');
        expect(filtered).not.toHaveProperty('reorderPoint');
      });

      it('should apply fail-safe public fields for empty/null role', () => {
        const filtered = filterItemFields(mockItem, '');

        expect(filtered).toHaveProperty('id');
        expect(filtered).toHaveProperty('name');
        expect(filtered).toHaveProperty('category');
      });
    });
  });

  describe('getAllowedFieldsForRole()', () => {
    it('should return array of field names for a role', () => {
      const fields = getAllowedFieldsForRole(Role.ADMIN);

      expect(Array.isArray(fields)).toBe(true);
      expect(fields.length).toBeGreaterThan(0);
      expect(fields).toContain('id');
      expect(fields).toContain('name');
    });

    it('should return fail-safe public fields for unknown role', () => {
      const fields = getAllowedFieldsForRole('INVALID_ROLE');

      expect(fields).toContain('id');
      expect(fields).toContain('name');
      expect(fields).toContain('category');
    });

    it('should have ADMIN with most fields', () => {
      const adminFields = getAllowedFieldsForRole(Role.ADMIN);
      const doctorFields = getAllowedFieldsForRole(Role.DOCTOR);

      expect(adminFields.length).toBeGreaterThan(doctorFields.length);
    });
  });

  describe('canViewField()', () => {
    it('should return true when role can view field', () => {
      expect(canViewField(Role.ADMIN, 'unitCost')).toBe(true);
      expect(canViewField(Role.ADMIN, 'supplier')).toBe(true);
    });

    it('should return false when role cannot view field', () => {
      expect(canViewField(Role.DOCTOR, 'unitCost')).toBe(false);
      expect(canViewField(Role.DOCTOR, 'supplier')).toBe(false);
    });

    it('should return true for public fields across all roles', () => {
      expect(canViewField(Role.ADMIN, 'id')).toBe(true);
      expect(canViewField(Role.DOCTOR, 'id')).toBe(true);
      expect(canViewField(Role.NURSE, 'id')).toBe(true);
      expect(canViewField(Role.FRONTDESK, 'id')).toBe(true);
    });

    it('should handle unknown roles with fail-safe public fields', () => {
      expect(canViewField('UNKNOWN', 'id')).toBe(true);
      expect(canViewField('UNKNOWN', 'name')).toBe(true);
      expect(canViewField('UNKNOWN', 'unitCost')).toBe(false);
    });
  });

  describe('Field filtering security', () => {
    it('should never leak unitCost to non-procurement roles', () => {
      const clinicalRoles = [Role.DOCTOR, Role.NURSE, Role.LAB_TECHNICIAN];

      for (const role of clinicalRoles) {
        const filtered = filterItemFields(mockItem, role);
        expect(filtered).not.toHaveProperty('unitCost');
      }
    });

    it('should never leak supplier info to clinical roles', () => {
      const clinicalRoles = [Role.DOCTOR, Role.NURSE, Role.LAB_TECHNICIAN];

      for (const role of clinicalRoles) {
        const filtered = filterItemFields(mockItem, role);
        expect(filtered).not.toHaveProperty('supplier');
        expect(filtered).not.toHaveProperty('manufacturer');
      }
    });

    it('should never leak reorderPoint to non-procurement roles', () => {
      const clinicalRoles = [Role.DOCTOR, Role.NURSE];

      for (const role of clinicalRoles) {
        const filtered = filterItemFields(mockItem, role);
        expect(filtered).not.toHaveProperty('reorderPoint');
        expect(filtered).not.toHaveProperty('lowStockThreshold');
      }
    });

    it('should preserve field values correctly', () => {
      const filtered = filterItemFields(mockItem, Role.ADMIN);

      expect(filtered.unitCost).toBe(mockItem.unitCost);
      expect(filtered.name).toBe(mockItem.name);
      expect(filtered.id).toBe(mockItem.id);
    });
  });

  describe('Role hierarchy and access patterns', () => {
    it('STORES should have more access than DOCTOR', () => {
      const storesFields = getAllowedFieldsForRole(Role.STORES);
      const doctorFields = getAllowedFieldsForRole(Role.DOCTOR);

      expect(storesFields.length).toBeGreaterThan(doctorFields.length);

      // STORES should see pricing, but DOCTOR should not
      expect(canViewField(Role.STORES, 'unitCost')).toBe(true);
      expect(canViewField(Role.DOCTOR, 'unitCost')).toBe(false);
    });

    it('ADMIN should have maximum access', () => {
      const adminFields = getAllowedFieldsForRole(Role.ADMIN);

      // ADMIN should see ALL fields
      expect(canViewField(Role.ADMIN, 'unitCost')).toBe(true);
      expect(canViewField(Role.ADMIN, 'supplier')).toBe(true);
      expect(canViewField(Role.ADMIN, 'reorderPoint')).toBe(true);
      expect(canViewField(Role.ADMIN, 'lowStockThreshold')).toBe(true);
    });

    it('FRONTDESK should have minimal access', () => {
      const frontdeskFields = getAllowedFieldsForRole(Role.FRONTDESK);

      // FRONTDESK should see very few fields
      expect(frontdeskFields.length).toBeLessThan(6);
      expect(canViewField(Role.FRONTDESK, 'unitCost')).toBe(false);
      expect(canViewField(Role.FRONTDESK, 'supplier')).toBe(false);
    });
  });
});
