'use client';

import { format } from 'date-fns';
import { FileText, Calendar, DollarSign, CheckCircle, Lock, Clock, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ChargeSheet } from '@/hooks/billing/useChargeSheet';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  UNPAID: { bg: 'bg-[#e7d6bf]/30', text: 'text-[#2c2e4b]', label: 'Unpaid' },
  PARTIAL: { bg: 'bg-[#caa26a]/20', text: 'text-[#2c2e4b]', label: 'Partially Paid' },
  PAID: { bg: 'bg-[#2c2e4b]/10', text: 'text-[#2c2e4b]', label: 'Paid' },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? { bg: 'bg-[#e7d6bf]/20', text: 'text-[#2c2e4b]/70', label: status };
}

interface ChargeSheetCardProps {
  chargeSheet: ChargeSheet;
  appointmentId?: number;
  onEdit?: () => void;
  onFinalize?: () => void;
  compact?: boolean;
}

export function ChargeSheetCard({
  chargeSheet,
  onEdit,
  onFinalize,
  compact = false,
}: ChargeSheetCardProps) {
  const statusConfig = getStatusConfig(chargeSheet.status);
  const isFinalized = !!chargeSheet.finalizedAt;
  const isPaid = chargeSheet.status === 'PAID';

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-[#e7d6bf] bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-[#e7d6bf]/30 flex items-center justify-center border border-[#e7d6bf] shrink-0">
            <FileText className="h-4 w-4 text-[#caa26a]" />
          </div>
          <div className="min-w-0">
            {chargeSheet.chargeSheetNo && (
              <p className="text-[10px] font-mono text-[#2c2e4b]/50">#{chargeSheet.chargeSheetNo}</p>
            )}
            <p className="text-sm font-medium text-[#2c2e4b] truncate">
              {chargeSheet.patientName}
            </p>
            <p className="text-[10px] text-[#2c2e4b]/50">
              {format(new Date(chargeSheet.billDate), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold text-[#2c2e4b]">
            KSH {chargeSheet.totalAmount.toLocaleString()}
          </span>
          <Badge variant="outline" className={`text-[10px] font-medium border-0 ${statusConfig.bg} ${statusConfig.text}`}>
            {statusConfig.label}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <Card className="border border-[#e7d6bf] bg-white shadow-sm">
      <CardHeader className="border-b border-[#e7d6bf] px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#e7d6bf]/30 flex items-center justify-center border border-[#e7d6bf]">
              <FileText className="h-4 w-4 text-[#caa26a]" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-[#2c2e4b]">Charge Sheet</CardTitle>
              {chargeSheet.chargeSheetNo && (
                <p className="text-[10px] font-mono text-[#2c2e4b]/50">#{chargeSheet.chargeSheetNo}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] font-medium border-0 ${statusConfig.bg} ${statusConfig.text}`}>
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[#2c2e4b]/50">Patient</p>
            <p className="text-sm font-medium text-[#2c2e4b]">{chargeSheet.patientName}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[#2c2e4b]/50">Bill Date</p>
            <p className="text-sm font-medium text-[#2c2e4b] flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-[#caa26a]" />
              {format(new Date(chargeSheet.billDate), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="border-t border-[#e7d6bf] pt-4 space-y-2">
          {chargeSheet.billItems.map((item, index) => (
            <div key={item.id || index} className="flex items-center justify-between text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {item.isInventory ? (
                    <Package className="h-3 w-3 text-[#caa26a] shrink-0" />
                  ) : (
                    <FileText className="h-3 w-3 text-[#caa26a]/70 shrink-0" />
                  )}
                  <p className="text-[#2c2e4b] truncate">{item.serviceName}</p>
                </div>
                <p className="text-[10px] text-[#2c2e4b]/50">
                  {item.quantity} × KSH {item.unitCost.toLocaleString()}
                  {item.isInventory && (
                    <span className="ml-1 text-[#caa26a]">Inventory</span>
                  )}
                </p>
              </div>
              <span className="text-sm font-medium text-[#2c2e4b] ml-4">
                KSH {item.totalCost.toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-[#e7d6bf] pt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#2c2e4b]/60">Subtotal</span>
            <span className="font-medium text-[#2c2e4b]">KSH {chargeSheet.totalAmount.toLocaleString()}</span>
          </div>
          {chargeSheet.discount > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#2c2e4b]/60">Discount</span>
              <span className="font-medium text-[#2c2e4b]">- KSH {chargeSheet.discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-[#2c2e4b]">Total</span>
            <span className="text-[#2c2e4b]">KSH {chargeSheet.totalAmount.toLocaleString()}</span>
          </div>
          {chargeSheet.amountPaid > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#2c2e4b]/60">Paid</span>
              <span className="font-medium text-[#2c2e4b]">KSH {chargeSheet.amountPaid.toLocaleString()}</span>
            </div>
          )}
          {chargeSheet.balance > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#2c2e4b]/60">Balance</span>
              <span className="font-semibold text-[#caa26a]">KSH {chargeSheet.balance.toLocaleString()}</span>
            </div>
          )}
        </div>

        {isFinalized && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#e7d6bf]/10 border border-[#e7d6bf]">
            <Lock className="h-3.5 w-3.5 text-[#2c2e4b]" />
            <p className="text-xs text-[#2c2e4b]">
              Finalized on {format(new Date(chargeSheet.finalizedAt!), 'MMM d, yyyy')}
            </p>
          </div>
        )}

        {!isPaid && (
          <div className="flex items-center gap-2 pt-2">
            {chargeSheet.canEdit && onEdit && (
              <Button
                onClick={onEdit}
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs border-[#e7d6bf] text-[#2c2e4b] hover:bg-[#e7d6bf]/30 rounded-lg"
              >
                Edit Charge Sheet
              </Button>
            )}
            {onFinalize && !isFinalized && (
              <Button
                onClick={onFinalize}
                size="sm"
                className="flex-1 h-8 text-xs bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] rounded-lg"
              >
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                Finalize
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
