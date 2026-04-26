/**
 * DTO: UpdateStaffDto
 *
 * Data Transfer Object for updating staff members (admin-only operation).
 */

import { z } from 'zod';
import { Role } from '@/domain/enums/Role';

export const updateStaffDtoSchema = z.object({
  email: z.string().email().toLowerCase().trim().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z
    .nativeEnum(Role, { errorMap: () => ({ message: 'Invalid role' }) })
    .refine((r) => r !== Role.PATIENT, { message: 'Invalid staff role' })
    .optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  doctorSpecialization: z.string().trim().min(2).optional(),
  /**
   * Safety switch: promoting/demoting ADMIN accounts should be explicit.
   */
  allowAdmin: z.boolean().optional(),
});

export type UpdateStaffDto = z.infer<typeof updateStaffDtoSchema>;
