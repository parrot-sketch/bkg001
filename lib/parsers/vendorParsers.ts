/**
 * Zod parsers for Vendor API requests
 */

import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';

/**
 * Kenya Revenue Authority PIN validation
 * Format: A[0-9]{9}[A-Z]
 * Example: A012345678B
 */
const KRA_PIN_REGEX = /^A\d{9}[A-Z]$/;

export const CreateVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').max(255),
  contactPerson: z.string().max(255).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  taxId: z.string().max(100).optional(),
  kraPinRef: z
    .string()
    .regex(KRA_PIN_REGEX, 'Invalid KRA PIN format. Expected format: A012345678X')
    .max(20)
    .optional(),
  etimsRegistered: z.boolean().optional().default(false),
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
  kraPinRef: z
    .string()
    .regex(KRA_PIN_REGEX, 'Invalid KRA PIN format. Expected format: A012345678X')
    .max(20)
    .optional(),
  etimsRegistered: z.boolean().optional(),
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
