/**
 * Used Items Tab View
 * 
 * Presentational component for used items tab (read-only).
 * No API calls, no parsing, no business logic.
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { EmptyState } from '../../shared/components/EmptyState';
import { ShoppingCart, Package } from 'lucide-react';
import type { UsedItemsTabViewModel } from './usedItemsMappers';

interface UsedItemsTabViewProps {
  // Data
  viewModel: UsedItemsTabViewModel | null;
  
  // Loading states
  isLoading: boolean;
  
  // Errors
  error: Error | null;
  
  // Actions
  onRetry: () => void;
}

export function UsedItemsTabView({
  viewModel,
  isLoading,
  error,
  onRetry,
}: UsedItemsTabViewProps) {
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (!viewModel || viewModel.items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="No items used"
        description="Items consumed during the case will appear here"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Used Items</h3>
        <Badge variant="outline">{viewModel.items.length} items</Badge>
      </div>

      <div className="space-y-2">
        {viewModel.items.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{item.itemName}</p>
                    {item.hasInventoryLink && (
                      <Badge variant="secondary" className="text-xs">
                        <Package className="h-3 w-3 mr-1" />
                        Inventory
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Quantity: {item.quantity} × ${item.unitCost.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${item.totalCost.toFixed(2)}</p>
                  <Badge
                    variant={item.isBillable ? 'default' : 'secondary'}
                    className="mt-1"
                  >
                    {item.isBillable ? 'Billable' : 'Non-billable'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="pt-4 border-t">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Billable Total:</p>
            <p className="font-medium text-green-600">
              ${viewModel.totalBillableCost.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Non-Billable Total:</p>
            <p className="font-medium text-muted-foreground">
              ${viewModel.totalNonBillableCost.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
