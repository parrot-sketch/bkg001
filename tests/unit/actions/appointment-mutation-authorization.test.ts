import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getCurrentUserFull: vi.fn(),
  appointmentFindUnique: vi.fn(),
  appointmentUpdate: vi.fn(),
  sendNoShowNotification: vi.fn(),
  sendReinstatementNotification: vi.fn(),
}));

vi.mock('@/lib/auth/server-auth', () => ({
  getCurrentUser: (...args: unknown[]) => hoisted.getCurrentUser(...args),
  getCurrentUserFull: (...args: unknown[]) => hoisted.getCurrentUserFull(...args),
}));
vi.mock('@/lib/db', () => ({
  default: { appointment: {
    findUnique: (...args: unknown[]) => hoisted.appointmentFindUnique(...args),
    update: (...args: unknown[]) => hoisted.appointmentUpdate(...args),
  } },
}));
vi.mock('@/domain/utils/notification-helpers', () => ({
  sendNoShowNotification: (...args: unknown[]) => hoisted.sendNoShowNotification(...args),
  sendReinstatementNotification: (...args: unknown[]) => hoisted.sendReinstatementNotification(...args),
}));

import { markNoShow, reinstateAppointment } from '@/app/actions/appointment';

const appointment = {
  id: 21,
  status: 'SCHEDULED',
  patient: { id: 'patient-1', first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' },
  doctor: { id: 'doctor-profile-1', user_id: 'doctor-user-1', name: 'Dr One' },
  time: '10:00',
  appointment_date: new Date(),
};

describe('appointment mutation authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getCurrentUserFull.mockResolvedValue({ first_name: 'Front', last_name: 'Desk' });
    hoisted.appointmentFindUnique.mockResolvedValue(appointment);
    hoisted.appointmentUpdate.mockResolvedValue({ id: 21, status: 'NO_SHOW' });
    hoisted.sendNoShowNotification.mockResolvedValue(undefined);
    hoisted.sendReinstatementNotification.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects anonymous no-show and reinstatement requests before database reads', async () => {
    hoisted.getCurrentUser.mockResolvedValue(null);

    const noShow = await markNoShow(21);
    const reinstate = await reinstateAppointment(21);

    expect(noShow).toMatchObject({ success: false, msg: 'Unauthorized' });
    expect(reinstate).toMatchObject({ success: false, msg: 'Unauthorized' });
    expect(hoisted.appointmentFindUnique).not.toHaveBeenCalled();
  });

  it('rejects roles outside the frontdesk/admin appointment workflow', async () => {
    hoisted.getCurrentUser.mockResolvedValue({ userId: 'nurse-1', role: 'NURSE' });

    const noShow = await markNoShow(21);
    const reinstate = await reinstateAppointment(21);

    expect(noShow).toMatchObject({ success: false, msg: 'Access denied' });
    expect(reinstate).toMatchObject({ success: false, msg: 'Access denied' });
    expect(hoisted.appointmentFindUnique).not.toHaveBeenCalled();
  });

  it('preserves no-show for authorized clinic-desk staff', async () => {
    hoisted.getCurrentUser.mockResolvedValue({ userId: 'frontdesk-1', role: 'FRONTDESK' });

    const result = await markNoShow(21, 'Patient did not arrive');

    expect(result.success).toBe(true);
    expect(hoisted.appointmentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 21 },
      data: expect.objectContaining({ status: 'NO_SHOW', status_changed_by: 'frontdesk-1' }),
    }));
    expect(hoisted.sendNoShowNotification).toHaveBeenCalledOnce();
  });

  it('preserves same-day reinstatement for authorized frontdesk staff', async () => {
    hoisted.getCurrentUser.mockResolvedValue({ userId: 'frontdesk-1', role: 'FRONTDESK' });
    hoisted.appointmentFindUnique.mockResolvedValue({ ...appointment, status: 'NO_SHOW', appointment_date: new Date() });
    hoisted.appointmentUpdate.mockResolvedValue({ id: 21, status: 'CONFIRMED' });

    const result = await reinstateAppointment(21);

    expect(result.success).toBe(true);
    expect(hoisted.appointmentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 21 },
      data: expect.objectContaining({ status: 'CONFIRMED', status_changed_by: 'frontdesk-1' }),
    }));
    expect(hoisted.sendReinstatementNotification).toHaveBeenCalledOnce();
  });
});