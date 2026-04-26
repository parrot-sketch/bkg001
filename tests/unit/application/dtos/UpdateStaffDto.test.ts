import { describe, it, expect } from 'vitest';
import { updateStaffDtoSchema } from '@/application/dtos/UpdateStaffDto';
import { Role } from '@/domain/enums/Role';

describe('updateStaffDtoSchema', () => {
  it('accepts an empty update payload', () => {
    const result = updateStaffDtoSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial updates', () => {
    const result = updateStaffDtoSchema.safeParse({
      email: 'staff@example.com',
      firstName: 'John',
      role: Role.NURSE,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('staff@example.com');
    }
  });

  it('rejects PATIENT role', () => {
    const result = updateStaffDtoSchema.safeParse({ role: Role.PATIENT });
    expect(result.success).toBe(false);
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = updateStaffDtoSchema.safeParse({ password: '1234567' });
    expect(result.success).toBe(false);
  });

  it('accepts doctor specialization updates', () => {
    const result = updateStaffDtoSchema.safeParse({ role: Role.DOCTOR, doctorSpecialization: 'Anaesthesiology' });
    expect(result.success).toBe(true);
  });
});

