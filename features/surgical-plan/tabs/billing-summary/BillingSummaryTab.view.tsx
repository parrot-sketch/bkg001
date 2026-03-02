/**
 * Billing Summary Tab View
 * 
 * Presentational component for billing summary tab (read-only).
 * No API calls, no parsing, no business logic.
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { EmptyState } from '../../shared/components/EmptyState';
import { Receipt, Package } from 'lucide-react';
import type { BillingSummaryTabViewModel } from './billingSummaryMappers';

interface BillingSummaryTabViewProps {
  // Data
  viewModel: BillingSummaryTabViewModel | null;
  
  // Loading states
  isLoading: boolean;
  
  // Errors
  error: Error | null;
  
  // Actions
  onRetry: () => void;
}

export function BillingSummaryTabView({
  viewModel,
  isLoading,
  error,
  onRetry,
}: BillingSummaryTabViewProps) {
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (!viewModel || !viewModel.payment) {
    return (
      <EmptyState
        icon={Receipt}
        title="No billing information"
        description="Billing details will appear here once items are used"
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Payment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span className="font-medium">${viewModel.payment.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span className="font-medium">${viewModel.payment.amountPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount:</span>
              <span className="font-medium">${viewModel.payment.discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span>Status:</span>
              <Badge variant={viewModel.payment.status === 'PAID' ? 'default' : 'secondary'}>
                {viewModel.payment.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Usage Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Items Used:</span>
              <span className="font-medium">{viewModel.usageSummary.totalItemsUsed}</span>
            </div>
            <div className="flex justify-between">
              <span>Billable Cost:</span>
              <span className="font-medium text-green-600">
                ${viewModel.usageSummary.totalBillableCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Non-Billable Cost:</span>
              <span className="font-medium text-muted-foreground">
                ${viewModel.usageSummary.totalNonBillableCost.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewModel.billItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Bill Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {viewModel.billItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.serviceName}</span>
                    {item.hasInventoryLink && (
                      <Badge variant="secondary" className="text-xs">
                        <Package className="h-3 w-3 mr-1" />
                        Inventory
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-medium">${item.totalCost.toFixed(2)}</span>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × ${item.unitCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
