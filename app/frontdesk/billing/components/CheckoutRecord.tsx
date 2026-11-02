'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { PaymentMethod } from '@/domain/enums/PaymentMethod';
import { frontdeskChargeSheetPath } from '@/hooks/frontdesk/useBookAppointmentStore';
import { billBalance, kes, type DeskBill } from '@/lib/frontdesk/checkoutDesk';

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: PaymentMethod.CASH, label: 'Cash' },
  { id: PaymentMethod.MOBILE_MONEY, label: 'M-PESA' },
  { id: PaymentMethod.CARD, label: 'Card' },
  { id: PaymentMethod.BANK_TRANSFER, label: 'Bank' },
];

export function CheckoutRecord({
  bill,
  kind,
  onRecord,
  isRecording,
}: {
  bill: DeskBill | null;
  kind: 'ready' | 'draft' | 'recorded' | null;
  onRecord: (amount: number, method: PaymentMethod) => Promise<void>;
  isRecording: boolean;
}) {
  const balance = bill ? billBalance(bill) : 0;
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAmount(balance > 0 ? String(balance) : '');
    setMethod(PaymentMethod.CASH);
    setError(null);
  }, [bill?.id, bill?.amountPaid, balance]);

  if (!bill || !kind) {
    return (
      <div className="px-5 py-10">
        <p className="text-sm font-medium text-[#2c2e4b]">Select a bill</p>
        <p className="mt-1 text-sm text-[#2c2e4b]/60">The charge lines and the amount to record appear here.</p>
      </div>
    );
  }

  const name = `${bill.patient?.firstName ?? ''} ${bill.patient?.lastName ?? ''}`.trim() || 'Unknown patient';
  const sheetHref = bill.appointmentId
    ? frontdeskChargeSheetPath(bill.patientId, bill.appointmentId)
    : `/frontdesk/patient/${bill.patientId}?tab=charges`;

  const submit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    if (value > balance + 0.0001) {
      setError(`Amount cannot exceed the balance of ${kes(balance)}.`);
      return;
    }
    setError(null);
    await onRecord(value, method);
  };

  return (
    <div>
      <div className="border-b border-[#e7d6bf] px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#005f73]">
          {kind === 'draft' ? 'Draft charge sheet' : kind === 'recorded' ? 'Recorded today' : 'Record payment'}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[#2c2e4b]">{name}</h2>
        <p className="mt-1 text-sm text-[#2c2e4b]/70">
          {bill.chargeSheetNo ? <span className="font-mono">{bill.chargeSheetNo}</span> : 'No sheet number'}
          {bill.patient?.fileNumber ? <span className="font-mono"> · {bill.patient.fileNumber}</span> : null}
        </p>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#e7d6bf] bg-[#e7d6bf]/30 text-left text-[11px] font-semibold uppercase tracking-wider text-[#005f73]">
            <th className="px-5 py-2">Item</th>
            <th className="px-3 py-2 text-right">Qty</th>
            <th className="px-5 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(bill.billItems ?? []).length === 0 ? (
            <tr>
              <td colSpan={3} className="px-5 py-4 text-sm text-[#2c2e4b]/60">No lines on this sheet.</td>
            </tr>
          ) : (
            bill.billItems!.map((item) => (
              <tr key={item.id} className="border-b border-[#e7d6bf]">
                <td className="px-5 py-2.5 text-[#2c2e4b]">{item.serviceName}</td>
                <td className="px-3 py-2.5 text-right font-mono text-[#2c2e4b]">{item.quantity}</td>
                <td className="px-5 py-2.5 text-right font-mono text-[#2c2e4b]">{kes(item.totalCost)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <dl className="grid grid-cols-2 gap-px border-b border-[#e7d6bf] bg-[#e7d6bf]">
        {bill.discount > 0 && (
          <div className="bg-white px-5 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#005f73]">Discount</dt>
            <dd className="mt-1 font-mono text-sm font-semibold text-[#2c2e4b]">{kes(bill.discount)}</dd>
          </div>
        )}
        <div className="bg-white px-5 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#005f73]">Already recorded</dt>
          <dd className="mt-1 font-mono text-sm font-semibold text-[#2c2e4b]">{kes(bill.amountPaid)}</dd>
        </div>
        <div className="bg-white px-5 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#005f73]">Balance</dt>
          <dd className="mt-1 font-mono text-sm font-semibold text-[#2c2e4b]">{balance > 0 ? kes(balance) : 'Paid'}</dd>
        </div>
        {bill.receiptNumber && (
          <div className="bg-white px-5 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#005f73]">Receipt</dt>
            <dd className="mt-1 font-mono text-sm font-semibold text-[#2c2e4b]">{bill.receiptNumber}</dd>
          </div>
        )}
      </dl>

      {kind === 'draft' && (
        <div className="px-5 py-4">
          <p className="text-sm text-[#2c2e4b]">The doctor has not saved this charge sheet yet. Saving it makes the bill ready to record.</p>
          <Link href={sheetHref} className="mt-3 inline-flex text-sm font-medium text-[#2c2e4b] underline">
            Open charge sheet
          </Link>
        </div>
      )}

      {kind === 'recorded' && (
        <div className="px-5 py-4">
          <p className="text-sm text-[#2c2e4b]">This payment is recorded. The receipt number stays on the bill.</p>
        </div>
      )}

      {kind === 'ready' && (
        <div className="space-y-4 px-5 py-4">
          <label className="block text-xs text-[#2c2e4b]/70">
            Amount to record
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
              className="mt-1 h-11 w-full border border-[#e7d6bf] px-3 text-right font-mono text-lg text-[#2c2e4b]"
            />
          </label>
          <fieldset>
            <legend className="text-xs text-[#2c2e4b]/70">Method</legend>
            <div className="mt-1 grid grid-cols-4 border border-[#e7d6bf]">
              {METHODS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={method === item.id}
                  onClick={() => setMethod(item.id)}
                  className={
                    method === item.id
                      ? 'h-10 bg-[#2c2e4b] text-sm font-medium text-white'
                      : 'h-10 border-l border-[#e7d6bf] text-sm text-[#2c2e4b] first:border-l-0 hover:bg-[#e7d6bf]/30'
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
          {error && <p className="text-sm text-[#9b2226]">{error}</p>}
          <button
            type="button"
            onClick={() => { void submit(); }}
            disabled={isRecording}
            className="h-10 bg-[#2c2e4b] px-4 text-sm font-semibold text-white hover:bg-[#1a1c2f] disabled:opacity-60"
          >
            {isRecording ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : null}
            Record payment
          </button>
        </div>
      )}
    </div>
  );
}
