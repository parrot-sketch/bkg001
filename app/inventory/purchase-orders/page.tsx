/**
 * Purchase Orders Console
 * 
 * Route: /inventory/purchase-orders
 * 
 * Full-featured purchase order management with search, filters, pagination, and actions.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, Search, RefreshCw, Plus, MoreVertical, Send, CheckCircle2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { Pagination } from '@/components/pagination';
import { Role } from '@/domain/enums/Role';

interface PurchaseOrderItem {
  id: number;
  item_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  total_price: number;
}

interface Vendor {
  id: string;
  name: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'CLOSED' | 'CANCELLED';
  total_amount: number;
  vendor: Vendor;
  items: PurchaseOrderItem[];
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
}

interface PurchaseOrdersResponse {
  data: PurchaseOrder[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

function InventoryPurchaseOrdersContent() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const isAdmin = user?.role === Role.ADMIN;

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilter) params.set('status', statusFilter);
    if (page > 1) params.set('page', page.toString());
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
    if (currentSearch !== `?${params.toString()}`) {
      router.replace(newUrl, { scroll: false });
    }
  }, [debouncedSearch, statusFilter, page, pathname, router]);

  // Load purchase orders
  useEffect(() => {
    if (isAuthenticated && user) {
      loadPurchaseOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, debouncedSearch, statusFilter, page]);

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());

      const response = await apiClient.request<PurchaseOrdersResponse>(`/stores/purchase-orders?${params.toString()}`);

      if (response.success) {
        setPurchaseOrders(response.data.data);
        setTotalCount(response.data.pagination.totalCount);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        setError(response.error || 'Failed to load purchase orders');
        toast.error(response.error || 'Failed to load purchase orders');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error('Failed to load purchase orders');
      console.error('Error loading purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPO) return;

    try {
      setSubmitting(true);
      const response = await apiClient.request<PurchaseOrder>(
        `/stores/purchase-orders/${selectedPO.id}/submit`,
        { method: 'POST', body: JSON.stringify({}) }
      );

      if (response.success) {
        toast.success('Purchase order submitted successfully');
        setShowSubmitDialog(false);
        setSelectedPO(null);
        loadPurchaseOrders();
      } else {
        toast.error(response.error || 'Failed to submit purchase order');
      }
    } catch (err) {
      toast.error('An error occurred while submitting purchase order');
      console.error('Error submitting purchase order:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedPO) return;

    try {
      setApproving(true);
      const response = await apiClient.request<PurchaseOrder>(
        `/stores/purchase-orders/${selectedPO.id}/approve`,
        { method: 'POST' }
      );

      if (response.success) {
        toast.success('Purchase order approved successfully');
        setShowApproveDialog(false);
        setSelectedPO(null);
        loadPurchaseOrders();
      } else {
        toast.error(response.error || 'Failed to approve purchase order');
      }
    } catch (err) {
      toast.error('An error occurred while approving purchase order');
      console.error('Error approving purchase order:', err);
    } finally {
      setApproving(false);
    }
  };

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    const badges = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
      CLOSED: 'bg-purple-100 text-purple-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return badges[status] || badges.DRAFT;
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
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Purchase Orders</h1>
        <p className="text-sm text-slate-500">Manage purchase orders and track procurement</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>
                {loading ? 'Loading...' : `Total: ${totalCount} purchase order(s)`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search PO number, vendor..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PARTIALLY_RECEIVED">Partially Received</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadPurchaseOrders} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New PO
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && purchaseOrders.length === 0 ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900 mb-2">Error loading purchase orders</p>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={loadPurchaseOrders}>
                Retry
              </Button>
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-900">No purchase orders found</p>
              <p className="text-xs text-slate-500 mt-1">
                {debouncedSearch || statusFilter ? 'Try adjusting your filters' : 'Create your first purchase order'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.po_number}</TableCell>
                      <TableCell>{po.vendor.name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(po.status)}`}>
                          {po.status.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell>${po.total_amount.toFixed(2)}</TableCell>
                      <TableCell>{po.items.length} item(s)</TableCell>
                      <TableCell>{new Date(po.created_at).toLocaleDateString()}</TableCell>
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
                            {po.status === 'DRAFT' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedPO(po);
                                  setShowSubmitDialog(true);
                                }}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Submit
                              </DropdownMenuItem>
                            )}
                            {po.status === 'SUBMITTED' && isAdmin && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedPO(po);
                                  setShowApproveDialog(true);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                            )}
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

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Purchase Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit <strong>{selectedPO?.po_number}</strong>? This will send it for approval.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSubmitDialog(false);
                setSelectedPO(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Purchase Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve <strong>{selectedPO?.po_number}</strong>? This will allow goods receipt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveDialog(false);
                setSelectedPO(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approving}
            >
              {approving ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InventoryPurchaseOrdersPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Purchase Orders</h1>
          <p className="text-sm text-slate-500">Manage purchase orders and approvals</p>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    }>
      <InventoryPurchaseOrdersContent />
    </Suspense>
  );
}
