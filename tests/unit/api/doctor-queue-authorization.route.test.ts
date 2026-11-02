import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const hoisted = vi.hoisted(() => ({
  authenticate: vi.fn(),
  doctorFindUnique: vi.fn(),
  patientQueueFindMany: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  JwtMiddleware: { authenticate: (...args: unknown[]) => hoisted.authenticate(...args) },
}));

vi.mock('@/lib/db', () => ({
  default: {
    doctor: { findUnique: (...args: unknown[]) => hoisted.doctorFindUnique(...args) },
    patientQueue: { findMany: (...args: unknown[]) => hoisted.patientQueueFindMany(...args) },
  },
}));

import { GET } from '@/app/api/doctor/[id]/queue/route';

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/doctor/doctor-1/queue');
}

const params = Promise.resolve({ id: 'doctor-1' });

describe('GET /api/doctor/[id]/queue authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.patientQueueFindMany.mockResolvedValue([]);
  });

  it('rejects anonymous requests before querying doctor or queue data', async () => {
    hoisted.authenticate.mockResolvedValue({ success: false, user: null });

    const response = await GET(makeRequest(), { params });

    expect(response.status).toBe(401);
    expect(hoisted.doctorFindUnique).not.toHaveBeenCalled();
    expect(hoisted.patientQueueFindMany).not.toHaveBeenCalled();
  });

  it('rejects authenticated users without the doctor role', async () => {
    hoisted.authenticate.mockResolvedValue({
      success: true,
      user: { userId: 'nurse-1', role: 'NURSE' },
    });

    const response = await GET(makeRequest(), { params });

    expect(response.status).toBe(403);
    expect(hoisted.doctorFindUnique).not.toHaveBeenCalled();
  });

  it('hides another doctor’s queue', async () => {
    hoisted.authenticate.mockResolvedValue({
      success: true,
      user: { userId: 'doctor-user-2', role: 'DOCTOR' },
    });
    hoisted.doctorFindUnique.mockResolvedValue({ user_id: 'doctor-user-1' });

    const response = await GET(makeRequest(), { params });

    expect(response.status).toBe(404);
    expect(hoisted.patientQueueFindMany).not.toHaveBeenCalled();
  });

  it('allows a doctor to read their own queue', async () => {
    hoisted.authenticate.mockResolvedValue({
      success: true,
      user: { userId: 'doctor-user-1', role: 'DOCTOR' },
    });
    hoisted.doctorFindUnique.mockResolvedValue({ user_id: 'doctor-user-1' });

    const response = await GET(makeRequest(), { params });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(hoisted.patientQueueFindMany).toHaveBeenCalledOnce();
  });
});