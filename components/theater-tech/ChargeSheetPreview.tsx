'use client';

import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { duplicateChargeMessage, findDuplicateChargeLine } from '@/lib/clinical/chargeSheetLines';
import type { ChargeItem, ChargeSheetCaseInfo } from './charge-sheet.types';

interface ChargeSheetPreviewProps {
  items: ChargeItem[];
  subtotal: number;
  discount: number;
  total: number;
  caseInfo: ChargeSheetCaseInfo | null;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
  saveLabel?: string;
}

function money(value: number): string {
  return `KSh ${value.toLocaleString()}`;
}

function displayDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'd MMM yyyy');
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#e7d6bf]/30 px-5 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-secondary">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function ChargeSheetPreview({
  items,
  subtotal,
  discount,
  total,
  caseInfo,
  onBack,
  onSave,
  saving,
  saveLabel = 'Save bill',
}: ChargeSheetPreviewProps) {
  const repeated = items.find((item) =>
    findDuplicateChargeLine(items, {
      name: item.description,
      serviceId: item.type === 'service' ? Number(item.itemId) : null,
      inventoryId: item.type === 'inventory' ? item.itemId : null,
      exceptId: item.id,
    }),
  );

  return (
    <div>
      <div className="border-b border-border px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">Preview</p>
        <h3 className="mt-1 text-xl font-semibold text-primary">{caseInfo?.patientName || 'Patient'}</h3>
        <p className="mt-1 text-sm text-foreground">{caseInfo?.procedureName || 'Procedure'}</p>
      </div>

      <dl className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        <Fact label="File" value={caseInfo?.fileNumber ? `#${caseInfo.fileNumber}` : '—'} />
        <Fact label="Procedure date" value={displayDate(caseInfo?.procedureDate ?? null)} />
        <Fact label="Surgeon" value={caseInfo?.surgeonName || '—'} />
        <Fact label="Sheet no." value={caseInfo?.chargeSheetNo || 'Assigned on save'} />
      </dl>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr>
              {['#', 'Item', 'Qty', 'Price per unit', 'Line total'].map((column) => (
                <th
                  key={column}
                  className={`h-9 border-b border-border bg-[#e7d6bf]/30 px-5 text-left text-[11px] font-semibold uppercase tracking-wider text-secondary ${column !== '#' && column !== 'Item' ? 'text-right' : ''}`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border-b border-border">
                <td className="px-5 py-2.5 tabular-nums text-muted-foreground">{index + 1}</td>
                <td className="px-5 py-2.5 font-medium text-foreground">{item.description}</td>
                <td className="px-5 py-2.5 text-right tabular-nums text-foreground">{item.quantity}</td>
                <td className="px-5 py-2.5 text-right tabular-nums text-foreground">{money(item.amount || 0)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums font-medium text-foreground">
                  {money((item.amount || 0) * (item.quantity || 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-1 border-t border-border bg-[#e7d6bf]/30 px-6 py-4 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="tabular-nums text-foreground">{money(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Discount</span>
            <span className="tabular-nums text-foreground">{money(discount)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1">
          <span className="font-semibold text-foreground">Total</span>
          <span className="text-lg font-semibold tabular-nums text-primary">{money(total)}</span>
        </div>
      </div>

      {repeated && (
        <p className="border-t border-primary/30 bg-[#e7d6bf]/30 px-6 py-3 text-sm text-primary">
          {duplicateChargeMessage(repeated.description)}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
        <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={onBack}>
          Back to editing
        </button>
        <Button type="button" className="rounded-none" onClick={onSave} disabled={saving || !!repeated}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? 'Saving…' : saveLabel}
        </Button>
      </div>
      <p className="px-6 pb-5 text-xs text-muted-foreground">This is the bill that will be saved.</p>
    </div>
  );
}
