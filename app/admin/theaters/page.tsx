'use client';

/**
 * Admin Theaters Management Page
 *
 * Provides structural/configuration management of operating theaters:
 * - Theater cards with full detail (type, capabilities, hours, status)
 * - Add/Edit/Delete theaters
 * - Active/Inactive toggle
 * - Today's schedule timeline per theater
 * - Booking cards with case info + cancel capability
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/patient/useAuth';
import { Role } from '@/domain/enums/Role';
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Clock,
  Syringe,
  CalendarDays,
  Users,
  AlertTriangle,
  ChevronRight,
  Activity,
  Settings2,
  StickyNote,
  Zap,
  Building2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TheaterBookingCase {
  id: string;
  procedure_name: string | null;
  status: string;
  urgency: string;
  patient: { first_name: string; last_name: string; file_number: string };
  primary_surgeon: { name: string };
}

interface TheaterBooking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  surgical_case: TheaterBookingCase;
}

interface Theater {
  id: string;
  name: string;
  type: string;
  status: string;
  color_code: string | null;
  notes: string | null;
  is_active: boolean;
  operational_hours: string | null;
  capabilities: string | null;
  bookings: TheaterBooking[];
  _count: { bookings: number; surgical_records: number };
  created_at: string;
  updated_at: string;
}

type TheaterType = 'MAJOR' | 'MINOR' | 'PROCEDURE_ROOM';

interface TheaterFormData {
  name: string;
  type: TheaterType;
  color_code: string;
  notes: string;
  operational_hours: string;
  capabilities: string;
}

const EMPTY_FORM: TheaterFormData = {
  name: '',
  type: 'MAJOR',
  color_code: '#6366F1',
  notes: '',
  operational_hours: '',
  capabilities: '',
};

const THEATER_TYPE_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  MAJOR: {
    label: 'Major OR',
    icon: <Building2 className="h-4 w-4" />,
    color: 'bg-red-50 text-red-700 border-red-200',
  },
  MINOR: {
    label: 'Minor Procedure',
    icon: <Syringe className="h-4 w-4" />,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  PROCEDURE_ROOM: {
    label: 'Procedure Room',
    icon: <Activity className="h-4 w-4" />,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
};

const CASE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PLANNING: 'bg-blue-100 text-blue-700',
  READY_FOR_SCHEDULING: 'bg-cyan-100 text-cyan-700',
  SCHEDULED: 'bg-indigo-100 text-indigo-700',
  IN_PREP: 'bg-yellow-100 text-yellow-800',
  IN_THEATER: 'bg-red-100 text-red-700',
  RECOVERY: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

// ─── Page Component ──────────────────────────────────────────────────────────

export default function AdminTheatersPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const [editingTheater, setEditingTheater] = useState<Theater | null>(null);
  const [deletingTheater, setDeletingTheater] = useState<Theater | null>(null);
  const [selectedTheater, setSelectedTheater] = useState<Theater | null>(null);
  const [formData, setFormData] = useState<TheaterFormData>(EMPTY_FORM);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchTheaters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/theaters');
      if (res.status === 401) {
        toast.error('Session expired. Please login again.');
        router.push('/login');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch theaters');
      const data = await res.json();
      setTheaters(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load theaters');
      setTheaters([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== Role.ADMIN)) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === Role.ADMIN) {
      fetchTheaters();
    }
  }, [isAuthenticated, user, fetchTheaters]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const openAddDialog = () => {
    setEditingTheater(null);
    setFormData(EMPTY_FORM);
    setFormDialogOpen(true);
  };

  const openEditDialog = (theater: Theater) => {
    setEditingTheater(theater);
    setFormData({
      name: theater.name,
      type: theater.type as TheaterType,
      color_code: theater.color_code || '#6366F1',
      notes: theater.notes || '',
      operational_hours: theater.operational_hours || '',
      capabilities: theater.capabilities || '',
    });
    setFormDialogOpen(true);
  };

  const openDeleteDialog = (theater: Theater) => {
    setDeletingTheater(theater);
    setDeleteDialogOpen(true);
  };

  const openDetailDialog = (theater: Theater) => {
    setSelectedTheater(theater);
    setDetailDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Theater name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        color_code: formData.color_code,
        notes: formData.notes.trim() || null,
        operational_hours: formData.operational_hours.trim() || null,
        capabilities: formData.capabilities.trim() || null,
      };

      const url = editingTheater
        ? `/api/admin/theaters/${editingTheater.id}`
        : '/api/admin/theaters';
      const method = editingTheater ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save theater');
      }

      toast.success(editingTheater ? 'Theater updated' : 'Theater created');
      setFormDialogOpen(false);
      fetchTheaters();
    } catch (e: any) {
      toast.error(e.message || 'Error saving theater');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTheater) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/theaters/${deletingTheater.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete theater');
      }
      toast.success('Theater deleted');
      setDeleteDialogOpen(false);
      setDeletingTheater(null);
      fetchTheaters();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (theater: Theater) => {
    try {
      const res = await fetch(`/api/admin/theaters/${theater.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !theater.is_active }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success(
        `${theater.name} ${theater.is_active ? 'deactivated' : 'activated'}`
      );
      fetchTheaters();
    } catch {
      toast.error('Failed to toggle theater status');
    }
  };

  // ── Derived state ────────────────────────────────────────────────────────

  const activeCount = theaters.filter((t) => t.is_active).length;
  const totalBookingsToday = theaters.reduce(
    (sum, t) => sum + t.bookings.length,
    0
  );
  const totalProcedures = theaters.reduce(
    (sum, t) => sum + t._count.surgical_records,
    0
  );

  // ── Render ───────────────────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Operating Theaters
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure and manage surgical suites, procedure rooms, and scheduling
            infrastructure.
          </p>
        </div>
        <Button onClick={openAddDialog} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add Theater
        </Button>
      </div>

      {/* ─── Stats Strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          label="Total Theaters"
          value={theaters.length}
          icon={<Building2 className="h-4 w-4" />}
          color="text-indigo-600 bg-indigo-50"
        />
        <StatsCard
          label="Active"
          value={activeCount}
          icon={<Power className="h-4 w-4" />}
          color="text-emerald-600 bg-emerald-50"
        />
        <StatsCard
          label="Cases Today"
          value={totalBookingsToday}
          icon={<CalendarDays className="h-4 w-4" />}
          color="text-blue-600 bg-blue-50"
        />
        <StatsCard
          label="Total Procedures"
          value={totalProcedures}
          icon={<Syringe className="h-4 w-4" />}
          color="text-purple-600 bg-purple-50"
        />
      </div>

      {/* ─── Theater Cards ──────────────────────────────────────────────── */}
      {theaters.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              No theaters configured
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Add your first operating theater to begin scheduling surgeries.
            </p>
            <Button variant="outline" size="sm" onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Theater
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {theaters.map((theater) => (
            <TheaterCard
              key={theater.id}
              theater={theater}
              onEdit={() => openEditDialog(theater)}
              onDelete={() => openDeleteDialog(theater)}
              onToggleActive={() => handleToggleActive(theater)}
              onViewDetail={() => openDetailDialog(theater)}
            />
          ))}
        </div>
      )}

      {/* ─── Add / Edit Dialog ──────────────────────────────────────────── */}
      <TheaterFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        formData={formData}
        setFormData={setFormData}
        isEditing={!!editingTheater}
        saving={saving}
        onSave={handleSave}
      />

      {/* ─── Delete Confirmation ────────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Theater
            </DialogTitle>
            <DialogDescription>
              This will permanently remove{' '}
              <span className="font-semibold text-foreground">
                {deletingTheater?.name}
              </span>{' '}
              and cannot be undone. Active bookings will prevent deletion.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail / Schedule Dialog ───────────────────────────────────── */}
      <TheaterDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        theater={selectedTheater}
      />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatsCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-4">
      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', color)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function TheaterCard({
  theater,
  onEdit,
  onDelete,
  onToggleActive,
  onViewDetail,
}: {
  theater: Theater;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onViewDetail: () => void;
}) {
  const typeMeta = THEATER_TYPE_META[theater.type] || THEATER_TYPE_META.MAJOR;
  const capabilities = theater.capabilities
    ? JSON.parse(theater.capabilities) as string[]
    : [];
  const todayBookings = theater.bookings;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all hover:shadow-md',
        !theater.is_active && 'opacity-60'
      )}
    >
      {/* Color accent bar */}
      <div
        className="absolute top-0 inset-x-0 h-1"
        style={{ backgroundColor: theater.color_code || '#6366F1' }}
      />

      <CardHeader className="pb-3 pt-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: theater.color_code || '#6366F1' }}
            >
              {theater.name.charAt(0)}
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">
                {theater.name}
              </CardTitle>
              <Badge
                variant="outline"
                className={cn('text-xs mt-1', typeMeta.color)}
              >
                {typeMeta.icon}
                <span className="ml-1">{typeMeta.label}</span>
              </Badge>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">
              {theater.is_active ? 'Active' : 'Inactive'}
            </span>
            <Switch
              checked={theater.is_active}
              onCheckedChange={onToggleActive}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Notes */}
        {theater.notes && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <StickyNote className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p className="line-clamp-2">{theater.notes}</p>
          </div>
        )}

        {/* Capabilities */}
        {capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {capabilities.slice(0, 4).map((cap) => (
              <Badge
                key={cap}
                variant="secondary"
                className="text-[10px] font-normal py-0 px-1.5 bg-gray-50"
              >
                <Zap className="h-2.5 w-2.5 mr-0.5" />
                {cap}
              </Badge>
            ))}
            {capabilities.length > 4 && (
              <Badge
                variant="secondary"
                className="text-[10px] font-normal py-0 px-1.5"
              >
                +{capabilities.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Operational Hours */}
        {theater.operational_hours && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Hours: {theater.operational_hours}</span>
          </div>
        )}

        {/* Today's Schedule Summary */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Today&apos;s Cases
            </span>
            <Badge variant="secondary" className="text-xs">
              {todayBookings.length}
            </Badge>
          </div>

          {todayBookings.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No cases scheduled today
            </p>
          ) : (
            <div className="space-y-1.5">
              {todayBookings.slice(0, 3).map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-2 text-xs bg-gray-50 rounded-md px-2.5 py-1.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {booking.surgical_case.procedure_name || 'TBD'}
                    </p>
                    <p className="text-muted-foreground truncate">
                      {booking.surgical_case.patient.last_name},{' '}
                      {booking.surgical_case.patient.first_name} •{' '}
                      {booking.surgical_case.primary_surgeon.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-gray-700">
                      {format(new Date(booking.start_time), 'HH:mm')}
                    </p>
                    <Badge
                      className={cn(
                        'text-[10px] px-1 py-0',
                        CASE_STATUS_COLORS[booking.surgical_case.status] || ''
                      )}
                      variant="secondary"
                    >
                      {booking.surgical_case.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
              {todayBookings.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  + {todayBookings.length - 3} more
                </p>
              )}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {theater._count.bookings} bookings
          </span>
          <span className="flex items-center gap-1">
            <Syringe className="h-3 w-3" />
            {theater._count.surgical_records} procedures
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-8"
            onClick={onViewDetail}
          >
            <ChevronRight className="h-3.5 w-3.5 mr-1" />
            View Schedule
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500 hover:text-gray-700"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Form Dialog ─────────────────────────────────────────────────────────────

function TheaterFormDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  isEditing,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: TheaterFormData;
  setFormData: React.Dispatch<React.SetStateAction<TheaterFormData>>;
  isEditing: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const [capInput, setCapInput] = useState('');

  const capabilities: string[] = formData.capabilities
    ? JSON.parse(formData.capabilities)
    : [];

  const addCapability = () => {
    const trimmed = capInput.trim();
    if (!trimmed || capabilities.includes(trimmed)) return;
    const updated = [...capabilities, trimmed];
    setFormData((prev) => ({
      ...prev,
      capabilities: JSON.stringify(updated),
    }));
    setCapInput('');
  };

  const removeCapability = (cap: string) => {
    const updated = capabilities.filter((c) => c !== cap);
    setFormData((prev) => ({
      ...prev,
      capabilities: updated.length > 0 ? JSON.stringify(updated) : '',
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-indigo-600" />
            {isEditing ? 'Edit Theater' : 'Add New Theater'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update theater configuration and capabilities.'
              : 'Configure a new operating theater or procedure room.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto px-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="theater-name" className="text-xs font-medium">
              Theater Name *
            </Label>
            <Input
              id="theater-name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder='e.g. "Theater A (Major)"'
            />
          </div>

          {/* Type + Color row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: v as TheaterType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAJOR">Major Operating Room</SelectItem>
                  <SelectItem value="MINOR">Minor Procedure Room</SelectItem>
                  <SelectItem value="PROCEDURE_ROOM">
                    Consultation/Procedure
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={formData.color_code}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      color_code: e.target.value,
                    }))
                  }
                  className="w-full h-11 p-1 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Operational Hours */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Operational Hours</Label>
            <Input
              value={formData.operational_hours}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  operational_hours: e.target.value,
                }))
              }
              placeholder='e.g. "Mon-Fri 07:00-18:00, Sat 08:00-14:00"'
            />
            <p className="text-[10px] text-muted-foreground">
              Free-text description of operating hours.
            </p>
          </div>

          {/* Capabilities */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Capabilities</Label>
            <div className="flex gap-2">
              <Input
                value={capInput}
                onChange={(e) => setCapInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCapability();
                  }
                }}
                placeholder='e.g. "General Anesthesia"'
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCapability}
                className="shrink-0"
              >
                Add
              </Button>
            </div>
            {capabilities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {capabilities.map((cap) => (
                  <Badge
                    key={cap}
                    variant="secondary"
                    className="text-xs gap-1 pr-1"
                  >
                    {cap}
                    <button
                      type="button"
                      onClick={() => removeCapability(cap)}
                      className="ml-0.5 rounded-full hover:bg-gray-300 p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Any additional information about this theater..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? 'Update Theater' : 'Create Theater'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail / Schedule Dialog ────────────────────────────────────────────────

function TheaterDetailDialog({
  open,
  onOpenChange,
  theater,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theater: Theater | null;
}) {
  if (!theater) return null;

  const typeMeta = THEATER_TYPE_META[theater.type] || THEATER_TYPE_META.MAJOR;
  const capabilities = theater.capabilities
    ? (JSON.parse(theater.capabilities) as string[])
    : [];
  const todayBookings = theater.bookings;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: theater.color_code || '#6366F1' }}
            >
              {theater.name.charAt(0)}
            </div>
            <div>
              <DialogTitle className="text-lg">{theater.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={cn('text-xs', typeMeta.color)}
                >
                  {typeMeta.icon}
                  <span className="ml-1">{typeMeta.label}</span>
                </Badge>
                <Badge
                  variant={theater.is_active ? 'default' : 'secondary'}
                  className={cn(
                    'text-xs',
                    theater.is_active
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  )}
                >
                  {theater.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            {theater.notes && (
              <div className="col-span-2 bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700">{theater.notes}</p>
              </div>
            )}
            {theater.operational_hours && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Operating Hours
                </p>
                <p className="text-sm text-gray-700">
                  {theater.operational_hours}
                </p>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Activity className="h-3 w-3" /> Statistics
              </p>
              <p className="text-sm text-gray-700">
                {theater._count.bookings} total bookings •{' '}
                {theater._count.surgical_records} procedures
              </p>
            </div>
          </div>

          {/* Capabilities */}
          {capabilities.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                <Zap className="h-3 w-3" /> Capabilities
              </p>
              <div className="flex flex-wrap gap-2">
                {capabilities.map((cap) => (
                  <Badge key={cap} variant="outline" className="text-xs">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Today's Schedule Timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-indigo-600" />
                Today&apos;s Schedule
              </p>
              <Badge variant="secondary" className="text-xs">
                {todayBookings.length} case
                {todayBookings.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {todayBookings.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <CalendarDays className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No cases scheduled for today
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayBookings.map((booking) => (
                  <ScheduleBookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleBookingCard({ booking }: { booking: TheaterBooking }) {
  const sc = booking.surgical_case;
  const startTime = format(new Date(booking.start_time), 'HH:mm');
  const endTime = format(new Date(booking.end_time), 'HH:mm');
  const durationMin = Math.round(
    (new Date(booking.end_time).getTime() -
      new Date(booking.start_time).getTime()) /
      60000
  );

  return (
    <div className="border rounded-lg p-4 bg-white hover:border-indigo-200 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              className={cn(
                'text-xs px-1.5 py-0',
                CASE_STATUS_COLORS[sc.status] || ''
              )}
              variant="secondary"
            >
              {sc.status.replace(/_/g, ' ')}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px]',
                sc.urgency === 'EMERGENCY'
                  ? 'border-red-300 text-red-700'
                  : sc.urgency === 'URGENT'
                    ? 'border-amber-300 text-amber-700'
                    : 'border-gray-200 text-gray-500'
              )}
            >
              {sc.urgency}
            </Badge>
          </div>

          <p className="font-semibold text-gray-900 text-sm">
            {sc.procedure_name || 'Procedure TBD'}
          </p>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {sc.patient.last_name}, {sc.patient.first_name} ({sc.patient.file_number})
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Syringe className="h-3 w-3" />
              {sc.primary_surgeon.name}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0 ml-4">
          <p className="font-mono text-sm font-semibold text-gray-900">
            {startTime}–{endTime}
          </p>
          <p className="text-xs text-muted-foreground">{durationMin} min</p>
          <Badge
            variant="outline"
            className={cn(
              'mt-1.5 text-[10px]',
              booking.status === 'CONFIRMED'
                ? 'border-emerald-300 text-emerald-700'
                : booking.status === 'PROVISIONAL'
                  ? 'border-amber-300 text-amber-700'
                  : 'border-gray-200 text-gray-500'
            )}
          >
            {booking.status}
          </Badge>
        </div>
      </div>
    </div>
  );
}
