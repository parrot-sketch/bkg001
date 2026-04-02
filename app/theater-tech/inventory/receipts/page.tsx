'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Receipt, Search, RefreshCw, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface GoodsReceipt {
  id: string;
  receipt_number: string;
  purchase_order: { id: string; po_number: string; vendor: { id: string; name: string } };
  received_by: { id: string; email: string; first_name: string | null; last_name: string | null };
  received_at: string;
  notes: string | null;
  receipt_items: { id: number; quantity_received: number; unit_cost: number }[];
}

interface ReceiptsResponse {
  data: GoodsReceipt[];
  pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
}

function ReceiptsContent() {
  const { user, isAuthenticated } = useAuth();
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (isAuthenticated && user) loadReceipts();
  }, [isAuthenticated, user, debouncedSearch, fromDate, toDate, page]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      params.set('page', page.toString());
      params.set('pageSize', '20');

      const response = await apiClient.request<ReceiptsResponse>(`/stores/receipts?${params}`);
      if (response.success) {
        setReceipts(response.data.data);
        setTotalCount(response.data.pagination.totalCount);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch { toast.error('Failed to load receipts'); }
    finally { setLoading(false); }
  };

  const formatReceiver = (r: GoodsReceipt['received_by']) =>
    r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : r.email;

  if (!isAuthenticated) return <div className="flex items-center justify-center h-screen"><p className="text-sm text-slate-400">Authenticating...</p></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Goods Receipts</h1>
        <p className="text-sm text-slate-500 mt-1">View inventory receipt records from purchase orders</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Search receipt/PO number..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }} className="pl-8" />
            </div>
            <Input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} className="w-40" />
            <Input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} className="w-40" />
            <Button variant="outline" size="sm" onClick={loadReceipts} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && receipts.length === 0 ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900">No receipts found</p>
              <p className="text-xs text-slate-500 mt-1">Receipts will appear here after goods are received</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map(receipt => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium font-mono">{receipt.receipt_number}</TableCell>
                    <TableCell className="font-mono">{receipt.purchase_order.po_number}</TableCell>
                    <TableCell>{receipt.purchase_order.vendor.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{receipt.receipt_items.length} item(s)</TableCell>
                    <TableCell className="text-sm">{formatReceiver(receipt.received_by)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(receipt.received_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
    </div>
  );
}

export default function TheaterTechReceiptsPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>}>
      <ReceiptsContent />
    </Suspense>
  );
}
