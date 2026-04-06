/**
 * Vendor Service
 * 
 * Manages vendor CRUD operations for inventory procurement.
 */

import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '@/application/errors/NotFoundError';
import { ValidationError } from '@/application/errors/ValidationError';

export interface CreateVendorDto {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  kraPinRef?: string;
  etimsRegistered?: boolean;
  paymentTerms?: string;
  notes?: string;
}

export interface UpdateVendorDto {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  kraPinRef?: string;
  etimsRegistered?: boolean;
  paymentTerms?: string;
  notes?: string;
  isActive?: boolean;
}

export class VendorService {
  constructor(private readonly db: PrismaClient) {}

  async createVendor(dto: CreateVendorDto) {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Vendor name is required', [
        { field: 'name', message: 'Name cannot be empty' },
      ]);
    }

    return this.db.vendor.create({
      data: {
        name: dto.name.trim(),
        contact_person: dto.contactPerson || null,
        email: dto.email || null,
        phone: dto.phone || null,
        address: dto.address || null,
        tax_id: dto.taxId || null,
        kra_pin: dto.kraPinRef || null,
        etims_registered: dto.etimsRegistered ?? false,
        payment_terms: dto.paymentTerms || null,
        notes: dto.notes || null,
        is_active: true,
      },
    });
  }

  async getVendors(includeInactive = false) {
    return this.db.vendor.findMany({
      where: includeInactive ? undefined : { is_active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findActiveVendors() {
    return this.db.vendor.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
  }

  async getVendorById(id: string) {
    const vendor = await this.db.vendor.findUnique({
      where: { id },
    });

    if (!vendor) {
      throw new NotFoundError(`Vendor with ID ${id} not found`, 'Vendor', id);
    }

    return vendor;
  }

  async updateVendor(id: string, dto: UpdateVendorDto) {
    await this.getVendorById(id); // Ensure exists

    if (dto.name !== undefined && dto.name.trim().length === 0) {
      throw new ValidationError('Vendor name cannot be empty', [
        { field: 'name', message: 'Name cannot be empty' },
      ]);
    }

    return this.db.vendor.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        contact_person: dto.contactPerson,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        tax_id: dto.taxId,
        kra_pin: dto.kraPinRef,
        etims_registered: dto.etimsRegistered,
        payment_terms: dto.paymentTerms,
        notes: dto.notes,
        is_active: dto.isActive,
      },
    });
  }

  async deleteVendor(id: string) {
    await this.getVendorById(id); // Ensure exists

    // Check if vendor has purchase orders
    const poCount = await this.db.purchaseOrder.count({
      where: { vendor_id: id },
    });

    if (poCount > 0) {
      throw new ValidationError(
        'Cannot delete vendor with existing purchase orders',
        [
          {
            field: 'id',
            message: `Vendor has ${poCount} purchase order(s). Deactivate instead.`,
          },
        ]
      );
    }

    return this.db.vendor.delete({
      where: { id },
    });
  }
}
