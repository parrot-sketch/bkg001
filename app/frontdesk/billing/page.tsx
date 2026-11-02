'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useRecordPayment } from '@/hooks/frontdesk/useBilling';
import { apiClient } from '@/lib/api/client';
import { PaymentMethod } from '@/domain/enums/PaymentMethod';
import { CheckoutRecord } from './components/CheckoutRecord';
import {
  billBalance,
  billMatchesQuery,
  kes,
  type CheckoutDeskData,
  type DeskBill,
} from '@/lib/frontdesk/checkoutDesk';

type Selection = { id: number; kind: 'ready' | 'draft' | 'recorded' } | null;

const EMPTY: CheckoutDeskData = {
  ready: [],
  drafts: [],
  recorded: [],
  summary: { balanceDue: 0, readyCount: 0, draftCount: 0, recordedCount: 0 },
};

function billDateLabel(value: string) {
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, 'd MMM yyyy');
}

export default function FrontdeskBillingPage() {
  const { user, isAuthenticated } = useAuth();
  const { mutateAsync: recordPayment, isPending: isRecording } = useRecordPayment();
  const [desk, setDesk] = useState<CheckoutDeskData>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<Selection>(null);

  const load = useCallback(async () => {
    const response = await apiClient.get<CheckoutDeskData>('/payments/pending?view=checkout&limit=200');
    if (!response.success) {
      throw new Error(response.error || 'Failed to load billing');
    }
    if (!response.data) {
      throw new Error('Failed to load billing');
    }
    return response.data;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setIsLoading(true);
    load()
      .then((data) => {
        if (cancelled) return;
        setDesk(data);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Failed to load billing');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [isAuthenticated, load]);

  const ready = useMemo(() => desk.ready.filter((bill) => billMatchesQuery(bill, query)), [desk.ready, query]);
  const drafts = useMemo(() => desk.drafts.filter((bill) => billMatchesQuery(bill, query)), [desk.drafts, query]);
  const recorded = useMemo(() => desk.recorded.filter((bill) => billMatchesQuery(bill, query)), [desk.recorded, query]);

  const selectedBill: DeskBill | null = selection
    ? (selection.kind === 'ready' ? ready : selection.kind === 'draft' ? drafts : recorded).find((bill) => bill.id === selection.id)
      ?? (selection.kind === 'ready' ? desk.ready : selection.kind === 'draft' ? desk.drafts : desk.recorded).find((bill) => bill.id === selection.id)
      ?? null
    : null;

  const handleRecord = async (amount: number, method: PaymentMethod) => {
    if (!selection || selection.kind !== 'ready') return;
    const paymentId = selection.id;
    try {
      await recordPayment({ paymentId, amountPaid: amount, paymentMethod: method });
    } catch {
      return;
    }
    try {
      const data = await load();
      setDesk(data);
      setLoadError(null);
      const stillOpen = data.ready.some((bill) => bill.id === paymentId);
      setSelection({ id: paymentId, kind: stillOpen ? 'ready' : 'recorded' });
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : 'The payment was recorded. The list could not be refreshed.');
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="bg-white px-6 py-10 text-[#2c2e4b]">
        <p className="text-sm">Sign in to record payments.</p>
      </div>
    );
  }

  const facts = [
    { label: 'Balance due', value: kes(desk.summary.balanceDue) },
    { label: 'Ready to collect', value: String(desk.summary.readyCount) },
    { label: 'Drafts', value: String(desk.summary.draftCount) },
    { label: 'Recorded today', value: String(desk.summary.recordedCount) },
  ];

  return (
    <div className="bg-white text-[#2c2e4b]">
      <header className="bg-[#2c2e4b] px-6 py-5 text-white">
        <Link href="/frontdesk/dashboard" className="inline-flex items-center text-sm font-medium text-white/80 hover:text-white">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Dashboard
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-white/80">Record a payment against a charge sheet. The receipt number is stored on the bill.</p>
      </header>

      <dl className="grid grid-cols-2 gap-px bg-[#e7d6bf] sm:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="bg-[#e7d6bf]/30 px-5 py-4">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#005f73]">{fact.label}</dt>
            <dd className="mt-1 font-mono text-base font-semibold text-[#2c2e4b]">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {loadError && (
        <div className="border-b border-[#9b2226]/25 bg-[#9b2226]/5 px-6 py-3 text-sm text-[#9b2226]">
          {loadError}
          <button type="button" onClick={() => { void load().then(setDesk).catch(() => undefined); }} className="ml-3 font-medium underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <section className="min-w-0 border-b border-[#e7d6bf] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 border-b border-[#e7d6bf] bg-[#e7d6bf]/30 px-5 py-3">
            <h2 className="text-sm font-semibold text-[#2c2e4b]">Bills</h2>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Patient, file, or sheet"
              className="h-9 w-56 border border-[#e7d6bf] bg-white px-3 text-sm text-[#2c2e4b]"
              aria-label="Find a bill"
            />
          </div>

          {isLoading ? (
            <p className="flex items-center gap-2 px-5 py-10 text-sm text-[#2c2e4b]/60">
              <Loader2 className="h-4 w-4 animate-spin text-[#caa26a]" />
              Loading bills…
            </p>
          ) : (
            <>
              <BillGroup
                title="Ready to collect"
                empty="No bills are ready to collect."
                bills={ready}
                kind="ready"
                selectedId={selection?.kind === 'ready' ? selection.id : null}
                onSelect={(id) => setSelection({ id, kind: 'ready' })}
              />
              {drafts.length > 0 && (
                <BillGroup
                  title="Drafts"
                  empty=""
                  bills={drafts}
                  kind="draft"
                  selectedId={selection?.kind === 'draft' ? selection.id : null}
                  onSelect={(id) => setSelection({ id, kind: 'draft' })}
                />
              )}
              {recorded.length > 0 && (
                <BillGroup
                  title="Recorded today"
                  empty=""
                  bills={recorded}
                  kind="recorded"
                  selectedId={selection?.kind === 'recorded' ? selection.id : null}
                  onSelect={(id) => setSelection({ id, kind: 'recorded' })}
                />
              )}
            </>
          )}
        </section>

        <aside aria-label="Checkout" className="min-w-0">
          <CheckoutRecord
            bill={selectedBill}
            kind={selectedBill ? selection?.kind ?? null : null}
            onRecord={handleRecord}
            isRecording={isRecording}
          />
        </aside>
      </div>
    </div>
  );
}

function BillGroup({
  title,
  empty,
  bills,
  kind,
  selectedId,
  onSelect,
}: {
  title: string;
  empty: string;
  bills: DeskBill[];
  kind: 'ready' | 'draft' | 'recorded';
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div>
      <h3 className="border-b border-[#e7d6bf] px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#005f73]">{title}</h3>
      {bills.length === 0 ? (
        <p className="px-5 py-6 text-sm text-[#2c2e4b]/60">{empty}</p>
      ) : (
        <ul>
          {bills.map((bill) => {
            const name = `${bill.patient?.firstName ?? ''} ${bill.patient?.lastName ?? ''}`.trim() || 'Unknown patient';
            const balance = billBalance(bill);
            const selected = selectedId === bill.id;
            return (
              <li key={bill.id} className="border-b border-[#e7d6bf]">
                <button
                  type="button"
                  onClick={() => onSelect(bill.id)}
                  aria-pressed={selected}
                  className={`flex w-full items-center gap-3 px-5 py-3 text-left ${selected ? 'bg-[#e7d6bf]/40' : 'hover:bg-[#e7d6bf]/20'}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[#2c2e4b]">{name}</span>
                    <span className="mt-0.5 block truncate text-xs text-[#2c2e4b]/60">
                      {bill.chargeSheetNo ? <span className="font-mono">{bill.chargeSheetNo}</span> : 'No sheet number'}
                      {' · '}
                      {billDateLabel(bill.billDate)}
                      {kind === 'recorded' && bill.receiptNumber ? <span className="font-mono"> · {bill.receiptNumber}</span> : null}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-sm font-semibold text-[#2c2e4b]">
                      {kind === 'recorded' ? kes(bill.amountPaid) : kes(balance)}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-medium text-[#005f73]">
                      {kind === 'ready' ? 'Record payment' : kind === 'draft' ? 'Draft' : 'Receipt'}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
