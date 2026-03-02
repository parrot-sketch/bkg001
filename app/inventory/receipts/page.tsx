/**
 * Goods Receipts Console
 * 
 * Route: /inventory/receipts
 * 
 * Full-featured goods receipt viewing with search, date filters, and pagination.
 * STORES and ADMIN access.
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Receipt, Search, RefreshCw, MoreVertical, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { Pagination } from '@/components/pagination';

interface ReceiptItem {
  id: number;
  quantity_received: number;
  unit_cost: number;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor: {
    id: string;
    name: string;
  };
}

interface ReceivedBy {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface GoodsReceipt {
  id: string;
  receipt_number: string;
  purchase_order: PurchaseOrder;
  received_by: ReceivedBy;
  received_at: string;
  notes: string | null;
  receipt_items: ReceiptItem[];
}

interface ReceiptsResponse {
  data: GoodsReceipt[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

function InventoryReceiptsContent() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [fromDate, setFromDate] = useState(searchParams.get('fromDate') || '');
  const [toDate, setToDate] = useState(searchParams.get('toDate') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    if (page > 1) params.set('page', page.toString());
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
    if (currentSearch !== `?${params.toString()}`) {
      router.replace(newUrl, { scroll: false });
    }
  }, [debouncedSearch, fromDate, toDate, page, pathname, router]);

  // Load receipts
  useEffect(() => {
    if (isAuthenticated && user) {
      loadReceipts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, debouncedSearch, fromDate, toDate, page]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());

      const response = await apiClient.request<ReceiptsResponse>(`/stores/receipts?${params.toString()}`);

      if (response.success) {
        setReceipts(response.data.data);
        setTotalCount(response.data.pagination.totalCount);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        setError(response.error || 'Failed to load receipts');
        toast.error(response.error || 'Failed to load receipts');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error('Failed to load receipts');
      console.error('Error loading receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-slate-400">Authenticating...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Goods Receipts</h1>
        <p className="text-sm text-slate-500">View goods receipt records and inventory receipts</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Receipts</CardTitle>
              <CardDescription>
                {loading ? 'Loading...' : `Total: ${totalCount} receipt(s)`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search receipt/PO number..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8 w-64"
                />
              </div>
              <Input
                type="date"
                placeholder="From date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="w-40"
              />
              <Input
                type="date"
                placeholder="To date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="w-40"
              />
              <Button variant="outline" size="sm" onClick={loadReceipts} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && receipts.length === 0 ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900 mb-2">Error loading receipts</p>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={loadReceipts}>
                Retry
              </Button>
            </div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900">No receipts found</p>
              <p className="text-xs text-slate-500 mt-1">
                {(debouncedSearch || fromDate || toDate) ? 'Try adjusting your filters' : 'Receipts will appear here after goods are received'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt Number</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Received By</TableHead>
                    <TableHead>Received At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                      <TableCell>{receipt.purchase_order.po_number}</TableCell>
                      <TableCell>{receipt.purchase_order.vendor.name}</TableCell>
                      <TableCell>{receipt.receipt_items.length} item(s)</TableCell>
                      <TableCell>
                        {receipt.received_by.first_name && receipt.received_by.last_name
                          ? `${receipt.received_by.first_name} ${receipt.received_by.last_name}`
                          : receipt.received_by.email}
                      </TableCell>
                      <TableCell>{new Date(receipt.received_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalRecords={totalCount}
                    limit={pageSize}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function InventoryReceiptsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Goods Receipts</h1>
          <p className="text-sm text-slate-500">View goods received from purchase orders</p>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    }>
      <InventoryReceiptsContent />
    </Suspense>
  );
}
