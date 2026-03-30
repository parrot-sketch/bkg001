/**
 * Billing Estimate Tab View
 * 
 * Presentational component for the domain-isolated pre-operative fee estimation.
 */
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SaveBar } from '../../shared/components/SaveBar';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { Calculator, AlertCircle, ShoppingCart } from 'lucide-react';
import type { BillingLineItem } from './useBillingEstimateTab';

interface BillingEstimateTabViewProps {
  surgeonFee: number;
  anaesthesiologistFee: number;
  theatreFee: number;
  subtotal: number;
  lineItems: BillingLineItem[];
  lineItemsTotal: number;
  totalEstimate: number;
  
  onSurgeonFeeChange: (val: number) => void;
  onAnaesthesiologistFeeChange: (val: number) => void;
  onTheatreFeeChange: (val: number) => void;
  
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  error: Error | null;
  canEdit: boolean;
  onSave: () => void;
}

export function BillingEstimateTabView(props: BillingEstimateTabViewProps) {
  const {
    surgeonFee, anaesthesiologistFee, theatreFee, subtotal,
    lineItems, lineItemsTotal, totalEstimate,
    onSurgeonFeeChange, onAnaesthesiologistFeeChange, onTheatreFeeChange,
    isDirty, isSaving, isLoading, error, canEdit, onSave
  } = props;

  if (error) {
    return <ErrorState error={error} onRetry={() => window.location.reload()} />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(val);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold tracking-tight">Pre-Operative Billing Estimate</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Core Fees */}
        <section className="space-y-6">
          <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-slate-50 border-b px-4 py-3">
              <h4 className="font-medium text-sm text-slate-700">Professional & Facility Fees</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Input the estimated baseline costs for the procedure.</p>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Surgeon Fee</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">KES</span>
                  <Input 
                    type="number" 
                    min="0"
                    className="pl-12 font-medium" 
                    value={surgeonFee || ''}
                    onChange={(e) => onSurgeonFeeChange(Number(e.target.value))}
                    disabled={!canEdit || isSaving}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Anaesthesiologist Fee</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">KES</span>
                  <Input 
                    type="number" 
                    min="0"
                    className="pl-12 font-medium" 
                    value={anaesthesiologistFee || ''}
                    onChange={(e) => onAnaesthesiologistFeeChange(Number(e.target.value))}
                    disabled={!canEdit || isSaving}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Theatre Fee Target</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">KES</span>
                  <Input 
                    type="number"
                    min="0" 
                    className="pl-12 font-medium" 
                    value={theatreFee || ''}
                    onChange={(e) => onTheatreFeeChange(Number(e.target.value))}
                    disabled={!canEdit || isSaving}
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t p-4 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Fees Subtotal</span>
              <span className="text-lg font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
            </div>
          </div>
        </section>

        {/* Line Items from Theater Tech */}
        <section className="space-y-6">
          <div className="bg-white border rounded-lg overflow-hidden shadow-sm flex flex-col h-full">
            <div className="bg-slate-50 border-b px-4 py-3 flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm flex items-center gap-2 text-slate-700">
                  <ShoppingCart className="h-4 w-4" />
                  Estimated Consumables & Implants
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">Read-only view of items added by Theater Tech.</p>
              </div>
            </div>
            
            <div className="p-0 flex-1 overflow-auto bg-slate-50/50">
              {lineItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mb-3 text-slate-300" />
                  <p className="text-sm font-medium">No items estimated yet</p>
                  <p className="text-xs mt-1 max-w-[200px]">Theater technician provides these estimates during case prep.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {lineItems.map((item) => (
                    <div key={item.id} className="p-3 bg-white flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm font-medium text-slate-900 truncate">{item.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            {item.category}
                          </span>
                          <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="text-sm font-semibold">{formatCurrency(item.totalPrice)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatCurrency(item.unitPrice)} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-50 border-t p-4 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Items Subtotal</span>
              <span className="text-lg font-semibold text-slate-900">{formatCurrency(lineItemsTotal)}</span>
            </div>
          </div>
        </section>
      </div>
      
      {/* Grand Total Footer */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-sm font-medium text-primary/80 uppercase tracking-wider">Total Pre-Operative Estimate</h3>
          <p className="text-xs text-muted-foreground mt-1">Combined professional fees and estimated inventory.</p>
        </div>
        <div className="text-3xl font-bold tracking-tight text-primary">
          {formatCurrency(totalEstimate)}
        </div>
      </div>

      {canEdit && isDirty && (
        <SaveBar onSave={onSave} saving={isSaving} label="Save Billing Estimate" />
      )}
    </div>
  );
}
