'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ShoppingCart, ArrowDownToLine } from 'lucide-react';
import Link from 'next/link';

interface InventoryActionBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function InventoryActionBar({ searchQuery, onSearchChange }: InventoryActionBarProps) {
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
      </div>
    </div>
  );
}
