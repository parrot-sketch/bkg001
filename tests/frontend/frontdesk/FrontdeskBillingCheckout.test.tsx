import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentMethod } from '@/domain/enums/PaymentMethod';

const recordPayment = vi.fn();
const get = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/hooks/patient/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', role: 'FRONTDESK' }, isAuthenticated: true }),
}));

vi.mock('@/hooks/frontdesk/useBilling', () => ({
  useRecordPayment: () => ({ mutateAsync: recordPayment, isPending: false }),
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: (...args: unknown[]) => get(...args) },
}));

import FrontdeskBillingPage from '@/app/frontdesk/billing/page';

function desk(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    data: {
      ready: [
        {
          id: 8,
          patientId: 'patient-1',
          appointmentId: 14,
          billDate: '2026-10-26T06:00:00.000Z',
          discount: 500,
          totalAmount: 5500,
          amountPaid: 1000,
          status: 'PART',
          receiptNumber: null,
          chargeSheetNo: 'CS-2026-0008',
          patient: { id: 'patient-1', firstName: 'Ada', lastName: 'Lovelace', fileNumber: 'NS-14' },
          billItems: [
            { id: 1, serviceName: 'Consultation fee', quantity: 1, unitCost: 3000, totalCost: 3000 },
            { id: 2, serviceName: 'Dressing', quantity: 1, unitCost: 2500, totalCost: 2500 },
          ],
        },
      ],
      drafts: [
        {
          id: 9,
          patientId: 'patient-2',
          appointmentId: 15,
          billDate: '2026-10-26T07:00:00.000Z',
          discount: 0,
          totalAmount: 3000,
          amountPaid: 0,
          status: 'UNPAID',
          receiptNumber: null,
          chargeSheetNo: 'CS-2026-0009',
          patient: { id: 'patient-2', firstName: 'Grace', lastName: 'Hopper', fileNumber: 'NS-15' },
          billItems: [],
        },
      ],
      recorded: [],
      summary: { balanceDue: 4000, readyCount: 1, draftCount: 1, recordedCount: 0 },
      ...overrides,
    },
  };
}

describe('Frontdesk billing checkout', () => {
  beforeEach(() => {
    recordPayment.mockReset();
    get.mockReset();
    get.mockResolvedValue(desk());
  });

  it('shows the balance due, keeps drafts out of collection, and records the selected bill', async () => {
    const user = userEvent.setup();
    recordPayment.mockResolvedValue({ id: 8, status: 'PAID', receiptNumber: 'RCP-20261026-0001', amountPaid: 5000 });
    get
      .mockResolvedValueOnce(desk())
      .mockResolvedValueOnce(desk({
        ready: [],
        recorded: [{
          id: 8,
          patientId: 'patient-1',
          appointmentId: 14,
          billDate: '2026-10-26T06:00:00.000Z',
          discount: 500,
          totalAmount: 5500,
          amountPaid: 5000,
          status: 'PAID',
          receiptNumber: 'RCP-20261026-0001',
          chargeSheetNo: 'CS-2026-0008',
          patient: { id: 'patient-1', firstName: 'Ada', lastName: 'Lovelace', fileNumber: 'NS-14' },
          billItems: [
            { id: 1, serviceName: 'Consultation fee', quantity: 1, unitCost: 3000, totalCost: 3000 },
          ],
        }],
        summary: { balanceDue: 0, readyCount: 0, draftCount: 1, recordedCount: 1 },
      }));

    render(<FrontdeskBillingPage />);

    expect((await screen.findAllByText('KES 4,000')).length).toBeGreaterThan(0);
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Grace Hopper')).toBeTruthy();
    expect(screen.getByText('Draft')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Ada Lovelace/i }));
    expect(screen.getByText('Consultation fee')).toBeTruthy();
    expect(screen.getByText('Dressing')).toBeTruthy();
    expect(screen.getByText('KES 500')).toBeTruthy();
    expect(screen.getByText('KES 1,000')).toBeTruthy();

    await user.click(within(screen.getByRole('complementary', { name: 'Checkout' })).getByRole('button', { name: 'Record payment' }));

    await waitFor(() => {
      expect(recordPayment).toHaveBeenCalledWith({
        paymentId: 8,
        amountPaid: 4000,
        paymentMethod: PaymentMethod.CASH,
      });
    });
    expect((await screen.findAllByText('RCP-20261026-0001')).length).toBeGreaterThan(0);
  });

  it('does not offer recording on a draft sheet', async () => {
    const user = userEvent.setup();
    render(<FrontdeskBillingPage />);
    await user.click(await screen.findByRole('button', { name: /Grace Hopper/i }));
    expect(screen.getByText(/has not saved this charge sheet yet/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Record payment' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Open charge sheet' })).toHaveAttribute(
      'href',
      '/frontdesk/patient/patient-2?tab=charges&appointmentId=15',
    );
  });
});
