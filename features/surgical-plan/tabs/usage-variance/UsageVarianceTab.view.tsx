/**
 * Usage Variance Tab View
 * 
 * Presentational component for usage variance tab (read-only).
 * No API calls, no parsing, no business logic.
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { EmptyState } from '../../shared/components/EmptyState';
import { TrendingUp, AlertTriangle, CheckCircle2, XCircle, Package } from 'lucide-react';
import type { UsageVarianceTabViewModel, ConsumptionStatus } from './usageVarianceMappers';

interface UsageVarianceTabViewProps {
  // Data
  viewModel: UsageVarianceTabViewModel | null;
  
  // Loading states
  isLoading: boolean;
  
  // Errors
  error: Error | null;
  
  // Actions
  onRetry: () => void;
}

function getConsumptionBadge(status: ConsumptionStatus) {
  switch (status) {
    case 'full':
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Complete
        </Badge>
      );
    case 'partial':
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-700">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Partial
        </Badge>
      );
    case 'over':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Over-consumed
        </Badge>
      );
    case 'none':
    default:
      return null;
  }
}

export function UsageVarianceTabView({
  viewModel,
  isLoading,
  error,
  onRetry,
}: UsageVarianceTabViewProps) {
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (!viewModel) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No variance data"
        description="Variance analysis will appear here once items are planned and used"
      />
    );
  }

  if (!viewModel.hasPlannedItems && !viewModel.hasUsedItems) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No variance data"
        description="No items have been planned or used yet. Plan items in the 'Planned Items' tab, then record usage to see variance analysis."
      />
    );
  }

  if (viewModel.varianceItems.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No variance data"
        description="Variance analysis will appear here once items are planned and used"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Planned Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${viewModel.plannedTotalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Actual Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${viewModel.actualBilledCost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                viewModel.varianceTotal >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {viewModel.varianceTotal >= 0 ? '+' : ''}
              ${viewModel.varianceTotal.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Item Variance</h4>
        {viewModel.varianceItems.map((item) => (
          <Card key={item.inventoryItemId}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.itemName}</p>
                  {getConsumptionBadge(item.consumptionStatus)}
                </div>
                <Badge variant={item.costVariance >= 0 ? 'default' : 'destructive'}>
                  {item.costVariance >= 0 ? '+' : ''}${item.costVariance.toFixed(2)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <span>Planned: </span>
                  <span className="font-medium">
                    {item.plannedQuantity} × ${item.plannedCost.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span>Used: </span>
                  <span className="font-medium">
                    {item.usedQuantity} × ${item.actualCost.toFixed(2)}
                  </span>
                </div>
              </div>
              {item.quantityVariance !== 0 && (
                <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Quantity variance: {item.quantityVariance > 0 ? '+' : ''}
                  {item.quantityVariance}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
