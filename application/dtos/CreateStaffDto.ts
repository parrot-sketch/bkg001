/**
 * DTO: CreateStaffDto
 *
 * Data Transfer Object for creating staff members (admin-only operation).
 * This is separate from user registration (which was removed) - only admins can create staff.
 */

import { z } from 'zod';
import { Role } from '@/domain/enums/Role';

/**
 * Zod schema for creating a staff member
 */
export const createStaffDtoSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
  role: z
    .nativeEnum(Role, {
      errorMap: () => ({ message: 'Invalid role' }),
    })
    .refine((r) => r !== Role.PATIENT, { message: 'Invalid staff role' }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  doctorSpecialization: z.string().trim().min(2).optional(),
  /**
   * Safety switch: creating/promoting ADMIN accounts should be explicit.
   * If role === ADMIN and allowAdmin !== true, the API should reject the request.
   */
  allowAdmin: z.boolean().optional(),
});

export type CreateStaffDto = z.infer<typeof createStaffDtoSchema>;
