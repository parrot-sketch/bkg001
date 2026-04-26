import { describe, it, expect } from 'vitest';
import { createStaffDtoSchema } from '@/application/dtos/CreateStaffDto';
import { Role } from '@/domain/enums/Role';

describe('createStaffDtoSchema', () => {
  const base = {
    email: 'Test@Example.com',
    password: 'password1',
    role: Role.DOCTOR,
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '+254700000000',
  };

  it('validates a valid staff create payload', () => {
    const result = createStaffDtoSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
      expect(result.data.role).toBe(Role.DOCTOR);
    }
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = createStaffDtoSchema.safeParse({ ...base, password: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects PATIENT role', () => {
    const result = createStaffDtoSchema.safeParse({ ...base, role: Role.PATIENT });
    expect(result.success).toBe(false);
  });

  it('accepts optional doctorSpecialization', () => {
    const result = createStaffDtoSchema.safeParse({ ...base, doctorSpecialization: 'Anaesthesiology' });
    expect(result.success).toBe(true);
  });

  it('accepts allowAdmin flag for admin onboarding payloads', () => {
    const result = createStaffDtoSchema.safeParse({
      ...base,
      role: Role.ADMIN,
      allowAdmin: true,
    });
    expect(result.success).toBe(true);
  });
});

