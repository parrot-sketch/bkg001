/**
 * Zod parsers for Vendor API requests
 */

import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';

export const CreateVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').max(255),
  contactPerson: z.string().max(255).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  taxId: z.string().max(100).optional(),
  paymentTerms: z.string().max(255).optional(),
  notes: z.string().optional(),
});

export const UpdateVendorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  contactPerson: z.string().max(255).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  taxId: z.string().max(100).optional(),
  paymentTerms: z.string().max(255).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export function parseCreateVendorRequest(body: unknown) {
  try {
    return CreateVendorSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid vendor creation request');
    }
    throw error;
  }
}

export function parseUpdateVendorRequest(body: unknown) {
  try {
    return UpdateVendorSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid vendor update request');
    }
    throw error;
  }
}
