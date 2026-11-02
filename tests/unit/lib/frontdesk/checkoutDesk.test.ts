import { describe, expect, it, vi } from 'vitest';
import { PaymentMethod } from '@/domain/enums/PaymentMethod';
import { PaymentStatus } from '@/domain/enums/PaymentStatus';
import { PrismaPaymentRepository } from '@/infrastructure/database/repositories/PrismaPaymentRepository';
import { billBalance, billMatchesQuery, type DeskBill } from '@/lib/frontdesk/checkoutDesk';

describe('checkout desk amounts', () => {
  it('uses the balance still due after discount and payments already recorded', () => {
    expect(billBalance({ totalAmount: 10000, discount: 1000, amountPaid: 2500 })).toBe(6500);
    expect(billBalance({ totalAmount: 1000, discount: 0, amountPaid: 1000 })).toBe(0);
  });

  it('matches a patient, file number, sheet, or receipt', () => {
    const bill = {
      id: 1,
      patientId: 'p',
      appointmentId: 4,
      billDate: '2026-10-26',
      discount: 0,
      totalAmount: 1,
      amountPaid: 0,
      status: 'UNPAID',
      receiptNumber: 'RCP-20261026-0001',
      chargeSheetNo: 'CS-2026-0004',
      patient: { id: 'p', firstName: 'Ada', lastName: 'Lovelace', fileNumber: 'NS-14' },
    } satisfies DeskBill;

    expect(billMatchesQuery(bill, 'ada')).toBe(true);
    expect(billMatchesQuery(bill, 'ns-14')).toBe(true);
    expect(billMatchesQuery(bill, 'cs-2026')).toBe(true);
    expect(billMatchesQuery(bill, 'rcp-20261026')).toBe(true);
    expect(billMatchesQuery(bill, 'kimani')).toBe(false);
  });
});

describe('PrismaPaymentRepository.findCheckoutDesk', () => {
  it('separates finalized bills, drafts, and payments recorded today', async () => {
    const findMany = vi.fn()
      .mockResolvedValueOnce([{ id: 1, patient: null, appointment: null, surgical_case: null, bill_items: [] }])
      .mockResolvedValueOnce([{ id: 2, patient: null, appointment: null, surgical_case: null, bill_items: [] }])
      .mockResolvedValueOnce([{ id: 3, patient: null, appointment: null, surgical_case: null, bill_items: [] }]);
    const repo = new PrismaPaymentRepository({ payment: { findMany } } as never);

    const desk = await repo.findCheckoutDesk(200);

    expect(desk.ready.map((bill) => bill.id)).toEqual([1]);
    expect(desk.drafts.map((bill) => bill.id)).toEqual([2]);
    expect(desk.recorded.map((bill) => bill.id)).toEqual([3]);
    expect(findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: {
        status: { in: ['UNPAID', 'PART'] },
        OR: [
          { charge_sheet_no: { not: null } },
          { finalized_at: { not: null } },
        ],
      },
      take: 200,
    }));
    expect(findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: {
        status: { in: ['UNPAID', 'PART'] },
        charge_sheet_no: null,
        finalized_at: null,
      },
    }));
    expect(findMany).toHaveBeenNthCalledWith(3, expect.objectContaining({
      where: { status: 'PAID', payment_date: { gte: expect.any(Date) } },
    }));
  });

  it('records a saved charge sheet that has not been through a separate finalize step', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 11,
      amount_paid: 0,
      total_amount: 6000,
      discount: 0,
      status: 'UNPAID',
      payment_date: null,
      finalized_at: null,
      charge_sheet_no: 'CS-2026-0011',
    });
    const update = vi.fn().mockResolvedValue({
      id: 11,
      patient_id: 'p',
      appointment_id: 1,
      bill_date: new Date(),
      total_amount: 6000,
      discount: 0,
      amount_paid: 6000,
      payment_method: 'CASH',
      status: 'PAID',
      created_at: new Date(),
      updated_at: new Date(),
    });
    const repo = new PrismaPaymentRepository({ payment: { findUnique, update } } as never);

    const result = await repo.recordPayment({
      paymentId: 11,
      amountPaid: 6000,
      paymentMethod: PaymentMethod.CASH,
    });

    expect(result.status).toBe(PaymentStatus.PAID);
    expect(update).toHaveBeenCalledOnce();
  });

  it('refuses payment on a bill the doctor has not saved', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 4,
      amount_paid: 0,
      total_amount: 5000,
      discount: 0,
      status: 'UNPAID',
      payment_date: null,
      finalized_at: null,
      charge_sheet_no: null,
    });
    const update = vi.fn();
    const repo = new PrismaPaymentRepository({ payment: { findUnique, update } } as never);

    await expect(repo.recordPayment({
      paymentId: 4,
      amountPaid: 5000,
      paymentMethod: PaymentMethod.CASH,
    })).rejects.toThrow(/Save the charge sheet/);
    expect(update).not.toHaveBeenCalled();
  });
});
