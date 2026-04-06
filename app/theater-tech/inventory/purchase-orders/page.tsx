'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ShoppingCart, Search, RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { PurchaseOrder } from './_components/types';
import { POList } from './_components/POList';
import { CreatePODialog } from './_components/CreatePODialog';

interface POsResponse {
  data: PurchaseOrder[];
  pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
}

function PurchaseOrdersContent() {
  const { user, isAuthenticated } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const loadPOs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      params.set('page', page.toString());
      params.set('pageSize', '20');

      const response = await apiClient.request<POsResponse>(`/stores/purchase-orders?${params}`);
      if (response.success) {
        setPurchaseOrders(response.data.data);
        setTotalCount(response.data.pagination.totalCount);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch { toast.error('Failed to load purchase orders'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isAuthenticated && user) loadPOs(); }, [isAuthenticated, user, debouncedSearch, statusFilter, page]);

  const handleSubmit = async (poId: string) => {
    try {
      const response = await apiClient.request(`/stores/purchase-orders/${poId}/submit`, { method: 'POST', body: JSON.stringify({}) });
      if (!response.success) throw new Error(response.error || 'Failed');
      toast.success('PO submitted');
      loadPOs();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Submit failed'); }
  };

  if (!isAuthenticated) return <div className="flex items-center justify-center h-screen"><p className="text-sm text-slate-400">Authenticating...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Create and track procurement orders</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New PO
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Search PO, vendor..." value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }} className="pl-8" />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PARTIALLY_RECEIVED">Partially Received</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadPOs} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <POList purchaseOrders={purchaseOrders} onSubmit={handleSubmit} onRefresh={loadPOs} loading={loading} />
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePODialog isOpen={showCreateDialog} onClose={() => setShowCreateDialog(false)} onCreated={() => { setShowCreateDialog(false); loadPOs(); }} />
    </div>
  );
}

export default function TheaterTechPurchaseOrdersPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <PurchaseOrdersContent />
    </Suspense>
  );
}
