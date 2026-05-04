'use client';

import { useState, useMemo, useEffect } from 'react';
import { InventorySummaryStrip } from './components/InventorySummaryStrip';
import { InventoryActionBar } from './components/InventoryActionBar';
import { InventoryDataTable, InventoryItemRow } from './components/InventoryDataTable';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function InventoryHub() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [data, setData] = useState<{ data: InventoryItemRow[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchInventory = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get<any>('/inventory/items?limit=100');
        if (!res.success) throw new Error(res.error);
        if (isMounted) {
          setData(res.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError(err as Error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchInventory();
    return () => { isMounted = false; };
  }, []);

  const items: InventoryItemRow[] = useMemo(() => {
    if (!data?.data) return [];
    
    let filtered = data.data as InventoryItemRow[];

    // 1. Search filter
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(lowerQuery) ||
          item.sku?.toLowerCase().includes(lowerQuery) ||
          item.supplier?.toLowerCase().includes(lowerQuery)
      );
    }

    // 2. Tab filter
    if (activeTab === 'low_stock') {
      filtered = filtered.filter(
        (item) => item.quantityOnHand > 0 && item.quantityOnHand <= item.reorderPoint
      );
    } else if (activeTab === 'out_of_stock') {
      filtered = filtered.filter((item) => item.quantityOnHand <= 0);
    } else if (activeTab === 'expiring_soon') {
      // Mock expiring soon logic if nearestExpiryDate is missing. In reality, would compare dates.
      // Assuming anything expiring in < 30 days.
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      filtered = filtered.filter((item) => {
        if (!item.nearestExpiryDate) return false;
        return new Date(item.nearestExpiryDate) <= thirtyDaysFromNow && item.quantityOnHand > 0;
      });
    }

    return filtered;
  }, [data, searchQuery, activeTab]);

  const summary = useMemo(() => {
    const allItems = (data?.data as InventoryItemRow[]) || [];
    
    return {
      totalItems: allItems.length,
      lowStock: allItems.filter(item => item.quantityOnHand > 0 && item.quantityOnHand <= item.reorderPoint).length,
      outOfStock: allItems.filter(item => item.quantityOnHand <= 0).length,
      expiringSoon: allItems.filter(item => {
        if (!item.nearestExpiryDate) return false;
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return new Date(item.nearestExpiryDate) <= thirtyDaysFromNow && item.quantityOnHand > 0;
      }).length,
      pendingPo: 3, // Mocked until PO endpoint is integrated
    };
  }, [data]);

  const handleTabChange = (val: string) => {
    if (val === 'batches') {
      router.push('/theater-tech/inventory/batches');
      return;
    }
    if (val === 'vendors') {
      router.push('/theater-tech/inventory/vendors');
      return;
    }
    setActiveTab(val);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 min-h-[calc(100vh-56px)] pb-12">
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Inventory Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Monitor theater supplies, stock levels, expiry risk, and procurement activity.
          </p>
        </div>

        {error ? (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error fetching inventory</AlertTitle>
            <AlertDescription>{error.message || 'Unable to load inventory data at this time.'}</AlertDescription>
          </Alert>
        ) : null}

        <InventorySummaryStrip 
          totalItems={summary.totalItems}
          lowStock={summary.lowStock}
          expiringSoon={summary.expiringSoon}
          outOfStock={summary.outOfStock}
          pendingPo={summary.pendingPo}
          isLoading={isLoading}
        />

        <InventoryActionBar 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="border-b border-slate-200">
              <TabsList className="h-10 bg-transparent p-0 flex gap-6 justify-start w-full overflow-x-auto rounded-none border-b-0">
                <TabsTrigger 
                  value="all"
                  className="rounded-none border-b-2 border-transparent px-1 pb-2.5 pt-2 font-medium text-slate-500 data-[state=active]:border-brand-primary data-[state=active]:text-brand-primary data-[state=active]:shadow-none bg-transparent hover:text-slate-700"
                >
                  All Items
                </TabsTrigger>
                <TabsTrigger 
                  value="low_stock"
                  className="rounded-none border-b-2 border-transparent px-1 pb-2.5 pt-2 font-medium text-slate-500 data-[state=active]:border-amber-500 data-[state=active]:text-amber-600 data-[state=active]:shadow-none bg-transparent hover:text-slate-700"
                >
                  Low Stock
                </TabsTrigger>
                <TabsTrigger 
                  value="expiring_soon"
                  className="rounded-none border-b-2 border-transparent px-1 pb-2.5 pt-2 font-medium text-slate-500 data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 data-[state=active]:shadow-none bg-transparent hover:text-slate-700"
                >
                  Expiring Soon
                </TabsTrigger>
                <TabsTrigger 
                  value="out_of_stock"
                  className="rounded-none border-b-2 border-transparent px-1 pb-2.5 pt-2 font-medium text-slate-500 data-[state=active]:border-rose-500 data-[state=active]:text-rose-600 data-[state=active]:shadow-none bg-transparent hover:text-slate-700"
                >
                  Out of Stock
                </TabsTrigger>
                
                {/* Navigation Tabs (acts as links) */}
                <TabsTrigger 
                  value="batches"
                  className="rounded-none border-b-2 border-transparent px-1 pb-2.5 pt-2 font-medium text-slate-500 hover:text-slate-900 bg-transparent"
                >
                  Batches →
                </TabsTrigger>
                <TabsTrigger 
                  value="vendors"
                  className="rounded-none border-b-2 border-transparent px-1 pb-2.5 pt-2 font-medium text-slate-500 hover:text-slate-900 bg-transparent"
                >
                  Vendors →
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </div>

        <InventoryDataTable 
          items={items}
          isLoading={isLoading}
          isEmpty={!isLoading && items.length === 0}
        />

      </div>
    </div>
  );
}
