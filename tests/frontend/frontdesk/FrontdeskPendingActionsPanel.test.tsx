import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { FrontdeskPendingActionsPanel } from '@/components/frontdesk/FrontdeskPendingActionsPanel';
import { BookAppointmentDialog } from '@/components/appointments/BookAppointmentDialog';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { QueryWrapper } from '../mocks/react-query';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const completed = {
  id: 47,
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  status: AppointmentStatus.COMPLETED,
  time: '09:30',
  patient: { firstName: 'Ada', lastName: 'Lovelace', fileNumber: 'NS-1' },
  doctor: { name: 'Dr. Kimani' },
} as any;

describe('Frontdesk post-consultation actions', () => {
  beforeEach(() => {
    push.mockReset();
    useBookAppointmentStore.setState({
      isOpen: false,
      initialPatientId: undefined,
      initialDoctorId: undefined,
      initialType: undefined,
      source: undefined,
      parentAppointmentId: undefined,
      lockDoctor: undefined,
    });
  });

  it('opens the patient profile charge sheet for the completed visit', async () => {
    const user = userEvent.setup();
    render(<FrontdeskPendingActionsPanel completedAppointments={[completed]} />);

    await user.click(screen.getByRole('button', { name: /charge sheet/i }));

    expect(push).toHaveBeenCalledWith('/frontdesk/patient/patient-1?tab=charges&appointmentId=47');
  });

  it('schedules the follow-up in the booking sheet without leaving the dashboard', async () => {
    const user = userEvent.setup();
    render(
      <QueryWrapper>
        <FrontdeskPendingActionsPanel completedAppointments={[completed]} />
        <BookAppointmentDialog />
      </QueryWrapper>,
    );

    await user.click(screen.getByRole('button', { name: /follow-up/i }));

    const booking = useBookAppointmentStore.getState();
    expect(push).not.toHaveBeenCalled();
    expect(booking.isOpen).toBe(true);
    expect(booking.initialPatientId).toBe('patient-1');
    expect(booking.initialDoctorId).toBe('doctor-1');
    expect(booking.lockDoctor).toBe(true);
    expect(booking.initialType).toBe('Follow-up');
    expect(booking.source).toBe(AppointmentSource.DOCTOR_FOLLOW_UP);
    expect(booking.parentAppointmentId).toBe(47);
    expect(booking.initialPatient?.firstName).toBe('Ada');
    expect(booking.initialDoctor?.name).toBe('Dr. Kimani');
    expect(await screen.findByRole('heading', { name: 'Schedule Follow-up' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Select Date & Time' })).toBeTruthy();
  });
});
