'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package, AlertTriangle, Layers, ShoppingCart, Search, RefreshCw, BarChart3, ClipboardCheck, Package2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { InventoryItem, InventoryBatch, InventorySummary } from './types';
import { OverviewTab } from './OverviewTab';
import { ItemCatalogTable } from './ItemCatalogTable';
import { BatchesTable } from './BatchesTable';
import { StockTakeTable } from './StockTakeTable';
import { ReceiveStockDialog } from './ReceiveStockDialog';

type TabKey = 'overview' | 'items' | 'batches' | 'reconciliation';
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { key: 'items', label: 'Item Catalog', icon: <Layers className="h-3.5 w-3.5" /> },
  { key: 'batches', label: 'Batches', icon: <Package2 className="h-3.5 w-3.5" /> },
  { key: 'reconciliation', label: 'Stock Take', icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
];

export function InventoryDashboard({ summary, initialBatches, inventoryItems }: {
  summary: InventorySummary[]; initialBatches: InventoryBatch[]; inventoryItems: InventoryItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabKey) || 'overview';
  const [view, setView] = useState<TabKey>(TABS.some(t => t.key === initialTab) ? initialTab : 'overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ itemId: '', batch: '', serial: '', expiry: '', qty: '1', cost: '0' });

  const pageSize = 15;
  const handleFormChange = useCallback((field: string, value: string) => setForm(prev => ({ ...prev, [field]: value })), []);

  // ─── KPIs ──────────────────────────────────────
  const totalValue = useMemo(() => summary.reduce((a, s) => a + s.totalValue, 0), [summary]);
  const lowStockCount = useMemo(() => summary.filter(s => s.status !== 'OK').length, [summary]);
  const activeBatches = initialBatches.length;

  // ─── Filtering ─────────────────────────────────
  const filteredSummary = useMemo(() =>
    summary.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name)), [summary, searchTerm]);

  const paginatedSummary = useMemo(() => filteredSummary.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filteredSummary, currentPage]);
  const totalPages = Math.ceil(filteredSummary.length / pageSize);

  const filteredBatches = useMemo(() => initialBatches.filter(b => {
    const matches = b.inventory_item.name.toLowerCase().includes(searchTerm.toLowerCase()) || b.batch_number.toLowerCase().includes(searchTerm.toLowerCase());
    if (!showExpiringOnly) return matches;
    const days = Math.ceil((new Date(b.expiry_date).getTime() - Date.now()) / 86400000);
    return matches && days <= 30;
  }), [initialBatches, searchTerm, showExpiringOnly]);

  // ─── Actions ───────────────────────────────────
  const handleReceiveStock = async () => {
    if (!form.itemId || !form.batch || !form.expiry || !form.qty) { toast.error('Fill all required fields'); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/inventory/batches', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_item_id: parseInt(form.itemId), batch_number: form.batch,
          serial_number: form.serial || undefined, expiry_date: new Date(form.expiry).toISOString(),
          quantity: parseInt(form.qty), cost_per_unit: parseFloat(form.cost), notes: 'Received via Admin',
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Stock received');
      setIsReceiveOpen(false);
      setForm({ itemId: '', batch: '', serial: '', expiry: '', qty: '1', cost: '0' });
      router.refresh();
    } catch { toast.error('Receive failed'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg"><Package className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Total Value</p><p className="text-xl font-bold">KES {totalValue.toLocaleString()}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 rounded-lg"><Layers className="h-5 w-5 text-sky-600" /></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Items</p><p className="text-xl font-bold">{summary.length}</p></div>
          </div>
        </CardContent></Card>
        <Card className={cn(lowStockCount > 0 && "border-amber-300 bg-amber-50/50")}><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Low Stock</p><p className="text-xl font-bold text-amber-700">{lowStockCount}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg"><ShoppingCart className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-xs text-muted-foreground uppercase tracking-wide">Batches</p><p className="text-xl font-bold">{activeBatches}</p></div>
          </div>
        </CardContent></Card>
      </div>

      {/* Tabs + Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg border">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => {
              setView(tab.key); setSearchTerm(''); setCurrentPage(1);
              const params = new URLSearchParams(searchParams.toString());
              params.set('tab', tab.key);
              router.replace(`?${params.toString()}`, { scroll: false });
            }}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                view === tab.key ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        {view !== 'overview' && (
          <div className="flex items-center gap-2">
            {view !== 'reconciliation' && (
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder={view === 'items' ? "Search products..." : "Search batches..."} className="pl-8 w-48"
                  value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
              </div>
            )}
            {view === 'batches' && (
              <Button variant={showExpiringOnly ? "secondary" : "outline"} size="sm" onClick={() => setShowExpiringOnly(!showExpiringOnly)}
                className={cn(showExpiringOnly && "bg-amber-100 text-amber-900 border-amber-200")}>
                <AlertTriangle className="h-4 w-4 mr-1" /> Expiring
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => router.refresh()}><RefreshCw className="h-4 w-4" /></Button>
            <ReceiveStockDialog isOpen={isReceiveOpen} onOpenChange={setIsReceiveOpen} onSubmit={handleReceiveStock}
              isSubmitting={isSubmitting} inventoryItems={inventoryItems} form={form} onChange={handleFormChange} />
          </div>
        )}
      </div>

      {/* Tab Content */}
      {view === 'overview' && <OverviewTab summary={summary} batches={initialBatches} />}
      {view === 'items' && <ItemCatalogTable items={paginatedSummary} currentPage={currentPage} totalPages={totalPages}
        filteredCount={filteredSummary.length} pageSize={pageSize} onPageChange={setCurrentPage} />}
      {view === 'batches' && <BatchesTable batches={filteredBatches} />}
      {view === 'reconciliation' && <StockTakeTable summary={summary} onRefresh={() => router.refresh()} />}
    </div>
  );
}
