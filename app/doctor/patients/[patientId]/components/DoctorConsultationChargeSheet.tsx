'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { getConsultationServiceId } from '@/actions/doctor/consultation-session';
import { useAppointmentBilling, useSaveBilling, type AppointmentBilling } from '@/hooks/doctor/useBilling';

export interface ChargeSheetVisit {
  id: number;
  date: string;
  type: string;
  doctor?: { name: string } | null;
}

interface ServiceOption {
  id: number;
  service_name: string;
  price: number;
  category?: string | null;
}

interface ChargeLine {
  key: string;
  name: string;
  quantity: string;
  unitCost: string;
  serviceId: number | null;
  inventoryItemId: number | null;
}

const kes = (amount: number) => `KES ${Math.max(0, amount).toLocaleString('en-KE')}`;

function lineTotal(line: ChargeLine) {
  const quantity = Number(line.quantity);
  const unitCost = Number(line.unitCost);
  if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) return null;
  return quantity * unitCost;
}

function isConsultationItem(item: { serviceId: number; serviceName: string }, consultationServiceId: number | null) {
  if (consultationServiceId && item.serviceId === consultationServiceId) return true;
  return item.serviceName.toLowerCase().includes('consultation');
}

export function DoctorConsultationChargeSheet({
  visits,
  isLoading,
  onSaved,
  initialAppointmentId = null,
}: {
  visits: ChargeSheetVisit[];
  isLoading: boolean;
  onSaved?: () => void;
  initialAppointmentId?: number | null;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(initialAppointmentId ?? visits[0]?.id ?? null);
  const [consultationServiceId, setConsultationServiceId] = useState<number | null>(null);
  const [fee, setFee] = useState('0');
  const [lines, setLines] = useState<ChargeLine[]>([]);
  const [discount, setDiscount] = useState('0');
  const [draftName, setDraftName] = useState('');
  const [draftQty, setDraftQty] = useState('1');
  const [draftPrice, setDraftPrice] = useState('');
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [sheetNo, setSheetNo] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const { data: billing, isLoading: billingLoading, error: billingError } = useAppointmentBilling(selectedId ?? undefined, !!selectedId);
  const { mutateAsync: saveBilling, isPending: saving } = useSaveBilling();

  useEffect(() => {
    if (selectedId && visits.some((visit) => visit.id === selectedId)) return;
    const preferred = initialAppointmentId && visits.some((visit) => visit.id === initialAppointmentId)
      ? initialAppointmentId
      : visits[0]?.id ?? null;
    if (preferred) setSelectedId(preferred);
  }, [visits, selectedId, initialAppointmentId]);

  useEffect(() => {
    let cancelled = false;
    getConsultationServiceId().then((result) => {
      if (!cancelled && result.success && result.data?.serviceId) setConsultationServiceId(result.data.serviceId);
    }).catch(() => undefined);
    apiClient.get<ServiceOption[]>('/services').then((result) => {
      if (!cancelled && result.success) {
        setServices((result.data ?? []).filter((service) => service.category !== 'Charge sheet'));
      }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const payment = (billing as AppointmentBilling | undefined)?.payment;
    const appointment = (billing as AppointmentBilling | undefined)?.appointment;
    if (!billing) return;
    setSheetNo(payment?.chargeSheetNo ?? null);
    setLocked(payment?.status === 'PAID' || Boolean(payment?.finalizedAt));
    setDiscount(String(payment?.discount ?? 0));
    const items = payment?.billItems ?? [];
    const feeItem = items.find((item) => isConsultationItem(item, consultationServiceId));
    setFee(String(feeItem ? feeItem.unitCost : appointment?.consultationFee ?? 0));
    setLines(items.filter((item) => item !== feeItem).map((item) => ({
      key: `line-${item.id ?? item.serviceId}-${item.serviceName}`,
      name: item.serviceName,
      quantity: String(item.quantity || 1),
      unitCost: String(item.unitCost || 0),
      serviceId: item.inventoryItemId ? null : item.serviceId,
      inventoryItemId: item.inventoryItemId ?? null,
    })));
  }, [billing, consultationServiceId, selectedId]);

  const suggestions = useMemo(() => {
    const query = draftName.trim().toLowerCase();
    if (query.length < 2) return [];
    return services
      .filter((service) => service.service_name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [draftName, services]);

  const extraTotal = lines.reduce((sum, line) => sum + (lineTotal(line) ?? 0), 0);
  const feeAmount = Number(fee) || 0;
  const discountAmount = Number(discount) || 0;
  const total = Math.max(0, feeAmount + extraTotal - discountAmount);
  const selected = visits.find((visit) => visit.id === selectedId);

  const addLine = (service: ServiceOption) => {
    if (lines.some((line) => line.serviceId === service.id)) {
      toast.error(`${service.service_name} is already on this charge sheet. Update that line.`);
      return;
    }
    setLines((current) => [...current, {
      key: `new-${service.id}-${Date.now()}`,
      name: service.service_name,
      quantity: draftQty || '1',
      unitCost: String(service.price || 0),
      serviceId: service.id,
      inventoryItemId: null,
    }]);
    setDraftName('');
    setDraftQty('1');
    setDraftPrice('');
    setListOpen(false);
  };

  const save = async () => {
    if (!selectedId) return;
    if (!consultationServiceId) {
      toast.error('The consultation fee cannot be saved until the consultation service is available.');
      return;
    }
    const billingItems: { serviceId?: number; inventoryItemId?: number; quantity: number; unitCost: number }[] = [];
    if (feeAmount > 0) {
      billingItems.push({ serviceId: consultationServiceId, quantity: 1, unitCost: feeAmount });
    }
    for (const line of lines) {
      const quantity = Number(line.quantity);
      const unitCost = Number(line.unitCost);
      if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) continue;
      if (line.inventoryItemId) billingItems.push({ inventoryItemId: line.inventoryItemId, quantity, unitCost });
      else if (line.serviceId) billingItems.push({ serviceId: line.serviceId, quantity, unitCost });
    }
    if (billingItems.length === 0) {
      toast.error('Add the consultation fee or another charge before saving.');
      return;
    }
    await saveBilling({
      appointmentId: selectedId,
      billingItems,
      discount: discountAmount > 0 ? discountAmount : undefined,
    });
    onSaved?.();
  };

  if (isLoading) return <p className="px-5 py-10 text-sm text-[#2c2e4b]/60">Loading the charge sheet…</p>;
  if (visits.length === 0) {
    return (
      <div className="px-5 py-10">
        <p className="text-sm font-medium text-[#2c2e4b]">No consultation to charge yet</p>
        <p className="mt-1 text-sm text-[#2c2e4b]/55">The charge sheet appears with the consultation.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-[#e7d6bf] bg-[#e7d6bf]/30 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#2c2e4b]">Charge sheet</h2>
          <p className="text-xs text-[#2c2e4b]/60">{sheetNo || 'A sheet number is assigned when this is saved.'}</p>
        </div>
        <label className="text-xs text-[#2c2e4b]/70">
          Consultation
          <select
            value={selectedId ?? ''}
            onChange={(event) => setSelectedId(Number(event.target.value))}
            className="ml-2 h-9 border border-[#e7d6bf] bg-white px-2 text-sm text-[#2c2e4b]"
          >
            {visits.map((visit) => (
              <option key={visit.id} value={visit.id}>
                {format(parseISO(visit.date), 'd MMM yyyy')} · {visit.type || 'Consultation'} · {visit.doctor?.name || 'Doctor'}
              </option>
            ))}
          </select>
        </label>
      </div>

      {billingLoading ? (
        <p className="flex items-center gap-2 px-5 py-10 text-sm text-[#2c2e4b]/60">
          <Loader2 className="h-4 w-4 animate-spin text-[#caa26a]" />
          Loading charges…
        </p>
      ) : billingError ? (
        <p className="px-5 py-10 text-sm text-[#2c2e4b]">
          {billingError instanceof Error ? billingError.message : 'This charge sheet could not be opened.'}
        </p>
      ) : (
        <>
          {locked && (
            <p className="border-b border-[#e7d6bf] bg-[#e7d6bf]/30 px-5 py-2 text-sm text-[#2c2e4b]">
              This charge sheet is paid. The lines can be reviewed and no longer changed.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e7d6bf] bg-[#e7d6bf]/30 text-left text-[11px] font-semibold uppercase tracking-wider text-[#005f73]">
                  <th className="px-5 py-2">Item</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Price per unit</th>
                  <th className="px-3 py-2">Line total</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#e7d6bf]">
                  <td className="px-5 py-2.5 font-medium text-[#2c2e4b]">Consultation fee</td>
                  <td className="px-3 py-2.5 text-[#2c2e4b]">1</td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min="0"
                      value={fee}
                      disabled={locked}
                      onChange={(event) => setFee(event.target.value)}
                      className="h-8 w-28 border border-[#e7d6bf] px-2 text-right font-mono"
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[#2c2e4b]">{kes(feeAmount)}</td>
                  <td />
                </tr>
                {lines.map((line) => (
                  <tr key={line.key} className="border-b border-[#e7d6bf]">
                    <td className="px-5 py-2.5 text-[#2c2e4b]">{line.name}</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        disabled={locked}
                        onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, quantity: event.target.value } : item))}
                        className="h-8 w-16 border border-[#e7d6bf] px-2 text-right font-mono"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min="0"
                        value={line.unitCost}
                        disabled={locked}
                        onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, unitCost: event.target.value } : item))}
                        className="h-8 w-28 border border-[#e7d6bf] px-2 text-right font-mono"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[#2c2e4b]">{lineTotal(line) == null ? '—' : kes(lineTotal(line)!)}</td>
                    <td className="px-5 py-2.5 text-right">
                      {!locked && (
                        <button
                          type="button"
                          onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                          className="text-sm text-[#9b2226] hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!locked && (
            <div className="border-b border-[#e7d6bf] px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#005f73]">Add a charge</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_6rem_8rem_auto] sm:items-end">
                <label className="relative block text-xs text-[#2c2e4b]/70">
                  Item
                  <input
                    value={draftName}
                    onChange={(event) => { setDraftName(event.target.value); setListOpen(true); }}
                    onFocus={() => setListOpen(true)}
                    className="mt-1 h-9 w-full border border-[#e7d6bf] px-2 text-sm text-[#2c2e4b]"
                  />
                  {listOpen && suggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full border border-[#e7d6bf] bg-white">
                      {suggestions.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setDraftName(service.service_name);
                            if (!draftPrice) setDraftPrice(String(service.price || 0));
                            setListOpen(false);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#e7d6bf]/30"
                        >
                          <span>{service.service_name}</span>
                          <span className="font-mono text-xs text-[#2c2e4b]/60">{kes(service.price || 0)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </label>
                <label className="text-xs text-[#2c2e4b]/70">
                  Qty
                  <input value={draftQty} onChange={(event) => setDraftQty(event.target.value)} className="mt-1 h-9 w-full border border-[#e7d6bf] px-2 text-right font-mono text-sm" />
                </label>
                <label className="text-xs text-[#2c2e4b]/70">
                  Price per unit
                  <input value={draftPrice} onChange={(event) => setDraftPrice(event.target.value)} className="mt-1 h-9 w-full border border-[#e7d6bf] px-2 text-right font-mono text-sm" />
                </label>
                <Button
                  type="button"
                  onClick={() => {
                    const match = services.find((service) => service.service_name.toLowerCase() === draftName.trim().toLowerCase());
                    if (!match) {
                      toast.error('Choose a service from the list. You can change its price before adding it.');
                      return;
                    }
                    addLine({ ...match, price: draftPrice === '' ? match.price : Number(draftPrice) });
                  }}
                  className="h-9 rounded-none bg-[#2c2e4b] px-4 text-white shadow-none hover:bg-[#1a1c2f]"
                >
                  Add to sheet
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 bg-[#e7d6bf]/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-xs text-[#2c2e4b]/70">
              Discount (KES)
              <input
                type="number"
                min="0"
                value={discount}
                disabled={locked}
                onChange={(event) => setDiscount(event.target.value)}
                className="ml-2 h-8 w-28 border border-[#e7d6bf] bg-white px-2 text-right font-mono text-sm"
              />
            </label>
            <div className="flex items-center gap-4">
              <p className="text-sm text-[#2c2e4b]">
                Total <span className="ml-2 font-mono text-base font-semibold">{kes(total)}</span>
              </p>
              {!locked && (
                <Button
                  onClick={() => { void save(); }}
                  disabled={saving || !selected}
                  className="h-9 rounded-none bg-[#2c2e4b] px-4 text-white shadow-none hover:bg-[#1a1c2f]"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save charge sheet
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
