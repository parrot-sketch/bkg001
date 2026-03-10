'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useAllStaff, useUpdateStaffStatus } from '@/hooks/staff/useStaff';
import { 
  Search, Plus, RefreshCw, MoreHorizontal, Pencil, PowerOff, Power, Loader2, Users
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateStaffDialog } from '@/components/admin/CreateStaffDialog';
import { UpdateStaffDialog } from '@/components/admin/UpdateStaffDialog';
import { StaffStatusDialog } from '@/components/admin/StaffStatusDialog';
import type { UserResponseDto } from '@/application/dtos/UserResponseDto';
import { Role } from '@/domain/enums/Role';
import { Status } from '@/domain/enums/Status';
import { cn } from '@/lib/utils';

const ROLES = [
  { label: 'All Staff', value: 'ALL' },
  { label: 'Doctors', value: Role.DOCTOR },
  { label: 'Nurses', value: Role.NURSE },
  { label: 'Frontdesk', value: Role.FRONTDESK },
  { label: 'Admins', value: Role.ADMIN },
];

const ROLE_COLORS: Record<string, string> = {
  [Role.DOCTOR]: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  [Role.NURSE]: 'bg-sky-50 text-sky-700 border-sky-100',
  [Role.FRONTDESK]: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  [Role.ADMIN]: 'bg-amber-50 text-amber-700 border-amber-100',
};

const ROLE_LABELS: Record<string, string> = {
  [Role.DOCTOR]: 'Doctor',
  [Role.NURSE]: 'Nurse',
  [Role.FRONTDESK]: 'Frontdesk',
  [Role.ADMIN]: 'Admin',
};

export default function AdminStaffPage() {
  const { user, isAuthenticated } = useAuth();
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<UserResponseDto | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [statusTarget, setStatusTarget] = useState<UserResponseDto | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  const { data: staff = [], isLoading, refetch, isRefetching } = useAllStaff(isAuthenticated && !!user);
  const statusMutation = useUpdateStaffStatus();

  const filteredStaff = useMemo(() => {
    let list = staff as UserResponseDto[];
    if (roleFilter !== 'ALL') list = list.filter((s) => s.role === roleFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.firstName?.toLowerCase().includes(q) ||
          s.lastName?.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.phone?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [staff, roleFilter, searchQuery]);

  const counts = useMemo(() => ({
    ALL: (staff as UserResponseDto[]).length,
    [Role.DOCTOR]: (staff as UserResponseDto[]).filter((s) => s.role === Role.DOCTOR).length,
    [Role.NURSE]: (staff as UserResponseDto[]).filter((s) => s.role === Role.NURSE).length,
    [Role.FRONTDESK]: (staff as UserResponseDto[]).filter((s) => s.role === Role.FRONTDESK).length,
    [Role.ADMIN]: (staff as UserResponseDto[]).filter((s) => s.role === Role.ADMIN).length,
  }), [staff]);

  const activeCount = (staff as UserResponseDto[]).filter((s) => s.status === Status.ACTIVE).length;

  const handleStatusConfirm = async () => {
    if (!statusTarget || !user) return;
    const newStatus = statusTarget.status === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;
    try {
      await statusMutation.mutateAsync({ userId: statusTarget.id, status: newStatus, updatedBy: user.id });
      toast.success(`Account ${newStatus === Status.ACTIVE ? 'reactivated' : 'deactivated'} successfully`);
      setShowStatusDialog(false);
      setStatusTarget(null);
    } catch {
      toast.error('Failed to update account status');
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 max-w-md mx-auto text-center">
        <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Protected Directory</h3>
        <p className="text-sm text-slate-500 font-medium">Please verify your access to manage staff accounts.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">User Management</h2>
            <p className="text-slate-500 font-medium">
              Institution-wide account control for all clinical roles
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="rounded-xl bg-slate-900 shadow-lg shadow-slate-900/10 font-bold"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Onboard Staff
            </Button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Staff', value: (staff as UserResponseDto[]).length, color: 'text-slate-600 bg-slate-50 border-slate-200' },
            { label: 'Active Accounts', value: activeCount, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
            { label: 'Clinical Team', value: counts[Role.DOCTOR] + counts[Role.NURSE], color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
            { label: 'Support Staff', value: counts[Role.FRONTDESK], color: 'text-sky-600 bg-sky-50 border-sky-100' },
          ].map(({ label, value, color }) => (
            <div key={label} className={cn('flex items-center gap-3 rounded-2xl border p-4', color)}>
              <div>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar: Role Tabs + Search */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Role Tabs */}
          <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
            {ROLES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRoleFilter(r.value)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                  roleFilter === r.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                {r.label}
                <span className={cn(
                  'text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md',
                  roleFilter === r.value ? 'bg-slate-100 text-slate-600' : 'text-slate-400'
                )}>
                  {counts[r.value as keyof typeof counts] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search + Refresh */}
          <div className="flex flex-1 gap-4">
            <Card className="flex-1 rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 pl-12 pr-4 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent font-medium placeholder:text-slate-400"
                  />
                </div>
              </CardContent>
            </Card>
            <Button
              variant="outline" size="icon"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-12 w-12 rounded-2xl shrink-0 bg-white border-slate-200 hover:bg-slate-50"
            >
              <RefreshCw className={cn('h-4 w-4 text-slate-500', isRefetching && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="h-14 pl-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Staff Member</TableHead>
                <TableHead className="h-14 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</TableHead>
                <TableHead className="h-14 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</TableHead>
                <TableHead className="h-14 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Login</TableHead>
                <TableHead className="h-14 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</TableHead>
                <TableHead className="h-14 pr-8 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-8 w-8 text-slate-300 animate-spin" />
                      <span className="text-sm text-slate-400 font-medium">Loading staff directory…</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center">
                        <Users className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400 font-medium">
                        {searchQuery || roleFilter !== 'ALL' ? 'No staff match your filters' : 'No staff found'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((s) => (
                  <TableRow key={s.id} className="group border-slate-50 hover:bg-slate-50/50 transition-colors">
                    {/* Identity */}
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs group-hover:bg-white group-hover:shadow-sm transition-all shrink-0">
                          {s.firstName?.charAt(0)}{s.lastName?.charAt(0) || s.email.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-none">
                            {s.firstName ? `${s.firstName} ${s.lastName || ''}`.trim() : '—'}
                          </p>
                          <p className="text-xs text-slate-400 font-medium mt-1">{s.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Role */}
                    <TableCell className="py-5">
                      <Badge className={cn('font-bold text-[10px] uppercase tracking-wider rounded-lg border px-2.5', ROLE_COLORS[s.role] || 'bg-slate-50 text-slate-600 border-slate-200')}>
                        {ROLE_LABELS[s.role] || s.role}
                      </Badge>
                    </TableCell>

                    {/* Contact */}
                    <TableCell className="py-5">
                      <span className="text-xs font-bold text-slate-600">{s.phone || '—'}</span>
                    </TableCell>

                    {/* Last Login */}
                    <TableCell className="py-5">
                      {s.lastLoginAt ? (
                        <span className="text-xs font-bold text-slate-600">
                          {format(new Date(s.lastLoginAt), 'dd MMM yyyy, HH:mm')}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium italic">Never</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-5">
                      <Badge
                        className={cn('font-bold text-[9px] uppercase tracking-wider rounded-md border px-2 py-0.5',
                          s.status === Status.ACTIVE
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : s.status === Status.INACTIVE
                            ? 'bg-slate-50 text-slate-500 border-slate-200'
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        )}
                      >
                        {s.status}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="pr-8 py-5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl border-slate-200 w-48 p-2 shadow-xl">
                          <DropdownMenuItem
                            className="rounded-xl font-bold cursor-pointer gap-3"
                            onClick={() => { setSelectedStaff(s); setShowUpdateDialog(true); }}
                          >
                            <Pencil className="h-4 w-4 text-slate-400" />
                            Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1 bg-slate-100" />
                          <DropdownMenuItem
                            className={cn(
                              'rounded-xl font-bold cursor-pointer gap-3',
                              s.status === Status.ACTIVE
                                ? 'text-rose-600 focus:text-rose-700 focus:bg-rose-50'
                                : 'text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50'
                            )}
                            onClick={() => { setStatusTarget(s); setShowStatusDialog(true); }}
                          >
                            {s.status === Status.ACTIVE
                              ? <><PowerOff className="h-4 w-4" />Deactivate</>
                              : <><Power className="h-4 w-4" />Reactivate</>
                            }
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialogs */}
      <CreateStaffDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => setShowCreateDialog(false)}
      />

      {selectedStaff && (
        <UpdateStaffDialog
          open={showUpdateDialog}
          onOpenChange={(v) => { setShowUpdateDialog(v); if (!v) setSelectedStaff(null); }}
          onSuccess={() => { setShowUpdateDialog(false); setSelectedStaff(null); }}
          staff={selectedStaff}
        />
      )}

      <StaffStatusDialog
        open={showStatusDialog}
        onOpenChange={(v) => { setShowStatusDialog(v); if (!v) setStatusTarget(null); }}
        staff={statusTarget}
        isPending={statusMutation.isPending}
        onConfirm={handleStatusConfirm}
      />
    </>
  );
}
