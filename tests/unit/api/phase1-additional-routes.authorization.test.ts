import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const hoisted = vi.hoisted(() => ({
  authenticate: vi.fn(),
  doctorFindUnique: vi.fn(),
  uploadStream: vi.fn(),
  processPendingEvents: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  JwtMiddleware: { authenticate: (...args: unknown[]) => hoisted.authenticate(...args) },
}));

vi.mock('@/lib/db', () => ({
  default: { doctor: { findUnique: (...args: unknown[]) => hoisted.doctorFindUnique(...args) } },
}));

vi.mock('@/lib/cloudinary', () => ({
  uploadStream: (...args: unknown[]) => hoisted.uploadStream(...args),
}));

vi.mock('@/infrastructure/database/repositories/PrismaOutboxRepository', () => ({
  PrismaOutboxRepository: class {},
}));

vi.mock('@/application/services/NotificationDispatcher', () => ({
  NotificationDispatcher: class {
    processPendingEvents(...args: unknown[]) {
      return hoisted.processPendingEvents(...args);
    }
  },
}));

import { GET as getDoctorByUserId } from '@/app/api/doctors/user/[userId]/route';
import { POST as uploadFile } from '@/app/api/upload/route';
import { GET as dispatchNotifications } from '@/app/api/cron/dispatch-notifications/route';

function makeRequest(url: string, method = 'GET', body?: BodyInit, headers?: HeadersInit): NextRequest {
  return new NextRequest(url, { method, body, headers });
}

describe('GET /api/doctors/user/[userId] authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects anonymous access', async () => {
    hoisted.authenticate.mockResolvedValue({ success: false, user: null });

    const response = await getDoctorByUserId(makeRequest('http://localhost/api/doctors/user/doctor-1'), {
      params: Promise.resolve({ userId: 'doctor-1' }),
    });

    expect(response.status).toBe(401);
    expect(hoisted.doctorFindUnique).not.toHaveBeenCalled();
  });

  it('limits doctors to their own profile', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'doctor-1', role: 'DOCTOR' } });

    const response = await getDoctorByUserId(makeRequest('http://localhost/api/doctors/user/doctor-2'), {
      params: Promise.resolve({ userId: 'doctor-2' }),
    });

    expect(response.status).toBe(404);
    expect(hoisted.doctorFindUnique).not.toHaveBeenCalled();
  });
});

describe('POST /api/upload authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects anonymous and non-management roles before upload', async () => {
    hoisted.authenticate.mockResolvedValueOnce({ success: false, user: null });
    const anonymous = await uploadFile(makeRequest('http://localhost/api/upload', 'POST', new FormData()));
    hoisted.authenticate.mockResolvedValueOnce({ success: true, user: { userId: 'nurse-1', role: 'NURSE' } });
    const nurse = await uploadFile(makeRequest('http://localhost/api/upload', 'POST', new FormData()));

    expect(anonymous.status).toBe(401);
    expect(nurse.status).toBe(403);
    expect(hoisted.uploadStream).not.toHaveBeenCalled();
  });

});

describe('GET /api/cron/dispatch-notifications configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CRON_SECRET', '');
    hoisted.processPendingEvents.mockResolvedValue({ processed: 1, errors: 0 });
  });

  it('fails closed in production when CRON_SECRET is missing', async () => {
    const response = await dispatchNotifications(makeRequest('http://localhost/api/cron/dispatch-notifications'));

    expect(response.status).toBe(503);
    expect(hoisted.processPendingEvents).not.toHaveBeenCalled();
  });

  it('preserves scheduled execution with a configured secret', async () => {
    vi.stubEnv('CRON_SECRET', 'test-cron-secret');
    const response = await dispatchNotifications(makeRequest(
      'http://localhost/api/cron/dispatch-notifications',
      'GET',
      undefined,
      { authorization: 'Bearer test-cron-secret' },
    ));

    expect(response.status).toBe(200);
    expect(hoisted.processPendingEvents).toHaveBeenCalledOnce();
  });
});