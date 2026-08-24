'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, FileEdit, Archive, Eye } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export interface InventoryItemRow {
  id: number;
  name: string;
  sku?: string | null;
  category: string;
  quantityOnHand: number;
  unitOfMeasure: string;
  lowStockThreshold: number;
  reorderPoint: number;
  supplier: string | null;
  nearestExpiryDate?: Date | null;
  updatedAt: Date;
}

interface InventoryDataTableProps {
  items: InventoryItemRow[];
  isLoading: boolean;
  isEmpty: boolean;
  onEdit?: (item: InventoryItemRow) => void;
  onAdjust?: (item: InventoryItemRow) => void;
  onView?: (item: InventoryItemRow) => void;
}

function getItemStatus(item: InventoryItemRow) {
  if (item.quantityOnHand <= 0) return { label: 'Out of Stock', variant: 'destructive' as const };
  if (item.quantityOnHand <= item.lowStockThreshold) return { label: 'Critical', variant: 'destructive' as const };
  if (item.quantityOnHand <= item.reorderPoint) return { label: 'Low Stock', variant: 'secondary' as const };
  return { label: 'Healthy', variant: 'default' as const };
}

export function InventoryDataTable({ items, isLoading, isEmpty, onEdit, onAdjust, onView }: InventoryDataTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Nearest Expiry</TableHead>
              <TableHead>Vendor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-12 text-center flex flex-col items-center justify-center">
        <Archive className="h-10 w-10 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-900">No inventory items found</h3>
        <p className="mt-1 text-sm text-slate-500">
          Try adjusting your search filters or add a new item to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="font-semibold text-slate-700">Item Name</TableHead>
            <TableHead className="font-semibold text-slate-700">Category</TableHead>
            <TableHead className="font-semibold text-slate-700">Current Stock</TableHead>
            <TableHead className="font-semibold text-slate-700">Status</TableHead>
            <TableHead className="font-semibold text-slate-700">Nearest Expiry</TableHead>
            <TableHead className="font-semibold text-slate-700">Vendor</TableHead>
            {(onEdit || onAdjust || onView) && (
              <TableHead className="w-10"></TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const status = getItemStatus(item);
            return (
              <TableRow key={item.id} className="hover:bg-slate-50/50">
                <TableCell className="font-medium text-slate-900">
                  {onView ? (
                    <button onClick={() => onView(item)} className="text-left hover:underline">
                      {item.name}
                    </button>
                  ) : (
                    item.name
                  )}
                </TableCell>
                <TableCell className="text-slate-500">
                  <span className="capitalize">{item.category.toLowerCase().replace('_', ' ')}</span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-slate-900">{item.quantityOnHand}</span>
                  <span className="text-slate-500 text-xs ml-1">{item.unitOfMeasure}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant} className={
                    status.label === 'Healthy' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' :
                    status.label === 'Low Stock' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : ''
                  }>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-500">
                  {item.nearestExpiryDate ? format(new Date(item.nearestExpiryDate), 'MMM d, yyyy') : '-'}
                </TableCell>
                <TableCell className="text-slate-500">
                  {item.supplier || '-'}
                </TableCell>
                {(onEdit || onAdjust || onView) && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onView && (
                          <DropdownMenuItem onClick={() => onView(item)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(item)}>
                            <FileEdit className="h-4 w-4 mr-2" />
                            Edit Item
                          </DropdownMenuItem>
                        )}
                        {onAdjust && (
                          <DropdownMenuItem onClick={() => onAdjust(item)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Adjust Stock
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
