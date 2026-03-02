/**
 * Inventory Item Selector Component
 * 
 * Presentational component for selecting inventory items to add to plan.
 */

import { Search, Package, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '../../../shared/components/EmptyState';
import type { InventoryItemSelectorViewModel } from '../inventoryPlanningMappers';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';

interface InventoryItemSelectorProps {
  items: InventoryItemSelectorViewModel[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: InventoryCategory | 'ALL';
  onCategoryChange: (category: InventoryCategory | 'ALL') => void;
  onItemSelect: (item: InventoryItemSelectorViewModel) => void;
  isLoading: boolean;
  onLoadItems: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'All Categories' },
  { value: InventoryCategory.IMPLANT, label: 'Implants' },
  { value: InventoryCategory.INSTRUMENT, label: 'Instruments' },
];

export function InventoryItemSelector({
  items,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onItemSelect,
  isLoading,
  onLoadItems,
}: InventoryItemSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inventory items (name, SKU)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={onLoadItems}
          disabled={isLoading}
          className="h-9"
        >
          Load Items
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No inventory items found"
          description="Try adjusting your search or category filter"
        />
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  {item.isLowStock && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Low Stock
                    </Badge>
                  )}
                  <Badge variant={item.isBillable ? 'default' : 'secondary'} className="text-xs">
                    {item.isBillable ? 'Billable' : 'Non-billable'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {item.sku && <span className="font-mono">{item.sku}</span>}
                  <span>{item.category}</span>
                  <span>
                    {item.quantityOnHand} {item.unitOfMeasure} in stock
                  </span>
                  {item.manufacturer && <span>• {item.manufacturer}</span>}
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {item.description}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onItemSelect(item)}
                className="ml-4 shrink-0"
              >
                Add to Plan
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
