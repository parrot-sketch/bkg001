'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ShoppingCart, ArrowDownToLine, Plus, FileText } from 'lucide-react';
import Link from 'next/link';

interface InventoryActionBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onCreate?: () => void;
}

export function InventoryActionBar({ searchQuery, onSearchChange, onCreate }: InventoryActionBarProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search inventory..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>
      
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
        <Button variant="outline" className="bg-white text-slate-700" asChild>
          <Link href="/theater-tech/inventory/receipts">
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Manage Receipts
          </Link>
        </Button>
        <Button className="bg-brand-primary hover:bg-brand-primary/90 text-white shadow-sm" asChild>
          <Link href="/theater-tech/inventory/purchase-orders">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Purchase Orders
          </Link>
        </Button>
        {onCreate && (
          <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={onCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        )}
        <Button variant="outline" className="bg-white text-slate-700" asChild>
          <Link href="/theater-tech/inventory/reports">
            <FileText className="w-4 h-4 mr-2" />
            Reports
          </Link>
        </Button>
      </div>
    </div>
  );
}
