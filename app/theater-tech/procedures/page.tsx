'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  Upload,
  Scissors,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface ProcedureServiceLink {
  id: string;
  is_primary: boolean;
  service: {
    id: number;
    service_name: string;
    price: number;
  };
}

interface Procedure {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  is_active: boolean;
  is_billable: boolean;
  estimated_duration_minutes: number | null;
  default_price: number | null;
  min_price: number | null;
  max_price: number | null;
  preparation_notes: string | null;
  post_op_notes: string | null;
  created_at: string;
  procedure_service_links: ProcedureServiceLink[];
}

const CATEGORIES = [
  { value: 'FACE', label: 'Face' },
  { value: 'BREAST', label: 'Breast' },
  { value: 'BODY', label: 'Body' },
  { value: 'RECONSTRUCTIVE', label: 'Reconstructive' },
  { value: 'FACE_AND_NECK', label: 'Face & Neck' },
  { value: 'BODY_CONTOURING', label: 'Body Contouring' },
  { value: 'INTIMATE_AESTHETIC', label: 'Intimate Aesthetic' },
  { value: 'HAIR_RESTORATION', label: 'Hair Restoration' },
  { value: 'NON_SURGICAL', label: 'Non Surgical' },
  { value: 'POST_WEIGHT_LOSS', label: 'Post Weight Loss' },
  { value: 'OTHER', label: 'Other' },
];

export default function TheaterTechProceduresPage() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [importing, setImporting] = useState(false);

  // AlertDialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState('');
  const [pendingIsActive, setPendingIsActive] = useState(true);

  const queryReady = searchQuery.trim().length >= 2 || categoryFilter !== 'all' || statusFilter !== 'all';

  const fetchProcedures = useCallback(async () => {
    if (!queryReady) {
      setProcedures([]);
      setTotalPages(1);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '15');
      if (searchQuery.trim().length >= 2) params.set('search', searchQuery.trim());
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter !== 'all') params.set('is_active', statusFilter === 'active' ? 'true' : 'false');

      const res = await fetch(`/api/admin/procedures?${params}`);
      const data = await res.json();

      if (data.success) {
        setProcedures(data.data || []);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.totalCount);
      } else {
        throw new Error(data.error || 'Failed to fetch procedures');
      }
    } catch (error) {
      console.error('Error fetching procedures:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch procedures');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, categoryFilter, statusFilter, queryReady]);

  useEffect(() => {
    if (!queryReady) {
      setProcedures([]);
      setTotalPages(1);
      setTotalCount(0);
      setPage(1);
      setLoading(false);
      return;
    }
    fetchProcedures();
  }, [fetchProcedures]);

  const openConfirm = (id: string, name: string, isActive: boolean) => {
    setPendingDeleteId(id);
    setPendingDeleteName(name);
    setPendingIsActive(isActive);
    setConfirmOpen(true);
  };

  const handleToggleActive = async () => {
    if (!pendingDeleteId) return;
    try {
      const res = await fetch(`/api/admin/procedures/${pendingDeleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(pendingIsActive ? 'Procedure deactivated' : 'Procedure activated');
        fetchProcedures();
      } else {
        toast.error(data.error || 'Failed to update procedure');
      }
    } catch {
      toast.error('Failed to update procedure');
    } finally {
      setConfirmOpen(false);
      setPendingDeleteId(null);
    }
  };

  const handleImportFromExcel = async () => {
    setImporting(true);
    try {
      const res = await fetch('/api/admin/procedures/import-source');
      const data = await res.json();
      if (data.success && data.data) {
        let imported = 0;
        for (const proc of data.data) {
          const createRes = await fetch('/api/admin/procedures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: proc.name,
              category: proc.category || 'OTHER',
              defaultPrice: proc.price || undefined,
              isActive: true,
            }),
          });
          const createData = await createRes.json();
          if (createData.success) imported++;
        }
        toast.success(`Imported ${imported} procedures`);
        fetchProcedures();
      } else {
        toast.error(data.error || 'Failed to read import source');
      }
    } catch {
      toast.error('Failed to import procedures');
    } finally {
      setImporting(false);
    }
  };

  const getCategoryLabel = (value: string) =>
    CATEGORIES.find((c) => c.value === value)?.label || value;

  const formatPrice = (price: number | null, min?: number | null, max?: number | null) => {
    if (price === null && min === null && max === null) return '—';
    if (min && max) return `KES ${min.toLocaleString()} – ${max.toLocaleString()}`;
    return price ? `KES ${price.toLocaleString()}` : '—';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Procedure Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage surgical procedures and their billing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleImportFromExcel} disabled={importing}>
            {importing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {importing ? 'Importing...' : 'Import from Excel'}
          </Button>
          <Button asChild>
            <Link href="/theater-tech/procedures/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Procedure
            </Link>
          </Button>
        </div>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Procedures</CardTitle>
	              <CardDescription>
	                {loading
	                  ? 'Loading...'
	                  : !queryReady
	                    ? 'Search or filter to view procedures'
	                    : `${totalCount} procedure(s)`}
	              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search procedures..."
                  className="pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Procedure</span>
                </TableHead>
                <TableHead><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</span></TableHead>
                <TableHead><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</span></TableHead>
                <TableHead><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Price Range</span></TableHead>
                <TableHead><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Linked Services</span></TableHead>
                <TableHead><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span></TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : procedures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Scissors className="h-10 w-10 text-muted-foreground/40 mb-3" />
	                      <p className="text-sm font-medium text-muted-foreground">
	                        {!queryReady
	                          ? 'Search or filter to view procedures'
	                          : 'No procedures match your filters'}
	                      </p>
	                    </div>
	                  </TableCell>
	                </TableRow>
              ) : (
                procedures.map((procedure) => (
                  <TableRow key={procedure.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{procedure.name}</p>
                        {procedure.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {procedure.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {getCategoryLabel(procedure.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {procedure.estimated_duration_minutes
                          ? `${procedure.estimated_duration_minutes} min`
                          : '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-slate-700">
                        {formatPrice(procedure.default_price, procedure.min_price, procedure.max_price)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {procedure.procedure_service_links.length > 0 ? (
                        <div className="flex -space-x-1">
                          {procedure.procedure_service_links.slice(0, 3).map((link) => (
                            <div
                              key={link.id}
                              className={cn(
                                'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-white',
                                link.is_primary
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground'
                              )}
                              title={link.service.service_name}
                            >
                              {link.service.service_name.charAt(0)}
                            </div>
                          ))}
                          {procedure.procedure_service_links.length > 3 && (
                            <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-white bg-muted">
                              +{procedure.procedure_service_links.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={procedure.is_active ? 'default' : 'secondary'}
                        className={cn(
                          'text-xs font-normal border',
                          procedure.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-300'
                        )}
                      >
                        {procedure.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Open actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/theater-tech/procedures/${procedure.id}`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => openConfirm(procedure.id, procedure.name, procedure.is_active)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {procedure.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

	          {queryReady && totalPages > 1 && (
	            <div className="flex items-center justify-between mt-4 pt-4 border-t">
	              <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deactivate/Activate Confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingIsActive ? 'Deactivate Procedure' : 'Activate Procedure'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingIsActive
                ? `"${pendingDeleteName}" will be hidden from procedure lists and cannot be selected for new cases.`
                : `"${pendingDeleteName}" will become available again for cases and billing.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={pendingIsActive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              onClick={handleToggleActive}
            >
              {pendingIsActive ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
