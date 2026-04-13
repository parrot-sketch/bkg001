'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
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
  DollarSign,
  FileText,
  Upload,
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
import { toast } from 'sonner';

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
  procedure_service_links: Array<{
    id: string;
    is_primary: boolean;
    service: {
      id: number;
      service_name: string;
      price: number;
    };
  }>;
}

interface Category {
  id: string;
  name: string;
  code: string;
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

export default function AdminProceduresPage() {
  const router = useRouter();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState<number | null>(null);

  const fetchProcedures = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '15');
      
      if (searchQuery) params.set('search', searchQuery);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter !== 'all') params.set('is_active', statusFilter === 'active' ? 'true' : 'false');

      const res = await fetch(`/api/admin/procedures?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setProcedures(data.data || []);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.totalCount);
      }
    } catch (error) {
      console.error('Error fetching procedures:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchProcedures();
  }, [fetchProcedures]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this procedure?')) return;
    
    try {
      const res = await fetch(`/api/admin/procedures/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Procedure deactivated');
        fetchProcedures();
      } else {
        toast.error(data.error || 'Failed to deactivate procedure');
      }
    } catch (error) {
      toast.error('Failed to deactivate procedure');
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
        setImportCount(imported);
        toast.success(`Imported ${imported} procedures from NS REVENUE.xlsx`);
        fetchProcedures();
      } else {
        toast.error(data.error || 'Failed to read import source');
      }
    } catch (error) {
      toast.error('Failed to import procedures');
    } finally {
      setImporting(false);
    }
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value;
  };

  const formatPrice = (price: number | null, min?: number | null, max?: number | null) => {
    if (price === null && min === null && max === null) return '—';
    if (min && max) return `KES ${min.toLocaleString()} - ${max.toLocaleString()}`;
    return price ? `KES ${price.toLocaleString()}` : '—';
  };

  return (
    <div className="space-y-6">
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
          <Button onClick={() => router.push('/admin/procedures/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Procedure
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Procedures</CardTitle>
              <CardDescription>
                {loading ? 'Loading...' : `${totalCount} procedure(s)`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search procedures..."
                  className="pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
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
                <TableHead className="w-[300px]">Procedure</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price Range</TableHead>
                <TableHead>Linked Services</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
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
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                      ? 'No procedures match your filters'
                      : 'No procedures found. Click "Add Procedure" to create one.'}
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
                      <div className="flex items-center gap-1.5 text-sm">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatPrice(procedure.default_price, procedure.min_price, procedure.max_price)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {procedure.procedure_service_links.length > 0 ? (
                        <div className="flex -space-x-1">
                          {procedure.procedure_service_links.slice(0, 3).map((link) => (
                            <div
                              key={link.id}
                              className={cn(
                                "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium border-2 border-white",
                                link.is_primary
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
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
                          "text-xs font-normal",
                          procedure.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {procedure.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/admin/procedures/${procedure.id}`)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(procedure.id)}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}