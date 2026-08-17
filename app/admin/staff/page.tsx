'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useAllStaff, useUpdateStaffStatus } from '@/hooks/staff/useStaff';
import { 
  Search, Plus, RefreshCw, MoreHorizontal, Pencil, PowerOff, Power, Loader2, Users
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
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
import { UpdateStaffDialog } from '@/components/admin/UpdateStaffDialog';
import { StaffStatusDialog } from '@/components/admin/StaffStatusDialog';
import type { UserResponseDto } from '@/application/dtos/UserResponseDto';
import { Role } from '@/domain/enums/Role';
import { Status } from '@/domain/enums/Status';
import { cn } from '@/lib/utils';
import { ADMIN_MANAGED_ROLES, ROLE_COLORS, ROLE_LABELS } from '@/features/admin/staff/staffRoles';

const ROLES = [
  { label: 'All Staff', value: 'ALL' },
  ...ADMIN_MANAGED_ROLES.map((r) => ({ label: ROLE_LABELS[r] || r, value: r })),
];

export default function AdminStaffPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
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

  const counts = useMemo<Record<string, number>>(() => ({
    ALL: (staff as UserResponseDto[]).length,
    ...ADMIN_MANAGED_ROLES.reduce((acc, r) => {
      acc[r] = (staff as UserResponseDto[]).filter((s) => s.role === r).length;
      return acc;
    }, {} as Record<string, number>),
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
        <div className="h-16 w-16 bg-[#e7d6bf] flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-[#caa26a] animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-white">Protected Directory</h3>
        <p className="text-sm text-slate-300 font-medium">Please verify your access to manage staff accounts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Staff Directory</h2>
          <p className="text-sm text-slate-300 font-medium">
            Institution-wide account control for all clinical roles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="bg-[#caa26a] hover:bg-[#b8913e] text-[#2c2e4b] font-bold"
            onClick={() => router.push('/admin/staff/new')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Onboard Staff
          </Button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff', value: (staff as UserResponseDto[]).length, color: 'text-white bg-white/10 border-white/20' },
          { label: 'Active Accounts', value: activeCount, color: 'text-white bg-emerald-500/10 border-emerald-400/20' },
          { label: 'Clinical Team', value: counts[Role.DOCTOR] + counts[Role.NURSE], color: 'text-white bg-indigo-500/10 border-indigo-400/20' },
          { label: 'Support Staff', value: counts[Role.FRONTDESK], color: 'text-white bg-sky-500/10 border-sky-400/20' },
        ].map(({ label, value, color }) => (
          <div key={label} className={cn('flex items-center gap-3 border p-4', color)}>
            <div>
              <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar: Role Tabs + Search */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Role Tabs */}
        <div className="flex gap-1.5 bg-white/10 p-1.5 overflow-x-auto">
          {ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRoleFilter(r.value)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-bold transition-all whitespace-nowrap',
                roleFilter === r.value
                  ? 'bg-white text-[#2c2e4b] shadow-sm'
                  : 'text-white/70 hover:text-white'
              )}
            >
              {r.label}
              <span className={cn(
                'text-[10px] font-bold tabular-nums px-1.5 py-0.5',
                roleFilter === r.value ? 'bg-[#e7d6bf]/30 text-[#2c2e4b]' : 'text-white/40'
              )}>
                {counts[r.value as keyof typeof counts] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search + Refresh */}
        <div className="flex flex-1 gap-4">
          <Card className="flex-1 border border-[#e7d6bf] shadow-sm overflow-hidden bg-white">
            <CardContent className="p-0">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2c2e4b]/40 group-focus-within:text-[#caa26a] transition-colors" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-12 pr-4 border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent font-medium placeholder:text-[#2c2e4b]/40"
                />
              </div>
            </CardContent>
          </Card>
          <Button
            variant="outline" size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-12 w-12 shrink-0 bg-white border-[#e7d6bf] hover:bg-[#e7d6bf]/10"
          >
            <RefreshCw className={cn('h-4 w-4 text-[#2c2e4b]/60', isRefetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-[#e7d6bf] bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-[#e7d6bf]/10">
            <TableRow className="hover:bg-transparent border-[#e7d6bf]/60">
              <TableHead className="h-14 pl-8 text-[10px] font-bold text-[#2c2e4b]/50 uppercase tracking-widest">Staff Member</TableHead>
              <TableHead className="h-14 text-[10px] font-bold text-[#2c2e4b]/50 uppercase tracking-widest">Role</TableHead>
              <TableHead className="h-14 text-[10px] font-bold text-[#2c2e4b]/50 uppercase tracking-widest">Contact</TableHead>
              <TableHead className="h-14 text-[10px] font-bold text-[#2c2e4b]/50 uppercase tracking-widest">Last Login</TableHead>
              <TableHead className="h-14 text-[10px] font-bold text-[#2c2e4b]/50 uppercase tracking-widest">Status</TableHead>
              <TableHead className="h-14 pr-8 text-right text-[10px] font-bold text-[#2c2e4b]/50 uppercase tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 text-[#e7d6bf] animate-spin" />
                    <span className="text-sm text-[#2c2e4b]/60 font-medium">Loading staff directory…</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 bg-[#e7d6bf] flex items-center justify-center">
                      <Users className="h-8 w-8 text-[#caa26a]" />
                    </div>
                    <p className="text-sm text-[#2c2e4b]/60 font-medium">
                      {searchQuery || roleFilter !== 'ALL' ? 'No staff match your filters' : 'No staff found'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((s) => (
                <TableRow key={s.id} className="group border-[#e7d6bf]/60 hover:bg-[#e7d6bf]/10 transition-colors">
                  {/* Identity */}
                  <TableCell className="pl-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-[#e7d6bf] flex items-center justify-center text-[#2c2e4b] font-bold text-xs group-hover:bg-white group-hover:shadow-sm transition-all shrink-0">
                        {s.firstName?.charAt(0)}{s.lastName?.charAt(0) || s.email.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-[#2c2e4b] leading-none">
                          {s.firstName ? `${s.firstName} ${s.lastName || ''}`.trim() : '—'}
                        </p>
                        <p className="text-xs text-[#2c2e4b]/50 font-medium mt-1">
                          {s.email}
                          {s.role === Role.DOCTOR && s.doctorSpecialization ? (
                            <span className="text-[#2c2e4b]/30"> • {s.doctorSpecialization}</span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Role */}
                  <TableCell className="py-5">
                    <Badge className={cn('font-bold text-[10px] uppercase tracking-wider border px-2.5', ROLE_COLORS[s.role] || 'text-[#2c2e4b] bg-[#e7d6bf]/10 border-[#e7d6bf]')}>
                      {ROLE_LABELS[s.role] || s.role}
                    </Badge>
                  </TableCell>

                  {/* Contact */}
                  <TableCell className="py-5">
                    <span className="text-xs font-bold text-[#2c2e4b]">{s.phone || '—'}</span>
                  </TableCell>

                  {/* Last Login */}
                  <TableCell className="py-5">
                    {s.lastLoginAt ? (
                      <span className="text-xs font-bold text-[#2c2e4b]">
                        {format(new Date(s.lastLoginAt), 'dd MMM yyyy, HH:mm')}
                      </span>
                    ) : (
                      <span className="text-xs text-[#2c2e4b]/40 font-medium italic">Never</span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-5">
                    <Badge
                      className={cn('font-bold text-[9px] uppercase tracking-wider border px-2 py-0.5',
                        s.status === Status.ACTIVE
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : s.status === Status.INACTIVE
                          ? 'bg-[#e7d6bf]/10 text-[#2c2e4b]/50 border-[#e7d6bf]'
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
                        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-[#e7d6bf]/20">
                          <MoreHorizontal className="h-4 w-4 text-[#2c2e4b]/60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="border-[#e7d6bf] w-48 p-2 shadow-xl">
                        <DropdownMenuItem
                          className="font-bold cursor-pointer gap-3"
                          onClick={() => { setSelectedStaff(s); setShowUpdateDialog(true); }}
                        >
                          <Pencil className="h-4 w-4 text-[#2c2e4b]/40" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 bg-[#e7d6bf]" />
                        <DropdownMenuItem
                          className={cn(
                            'font-bold cursor-pointer gap-3',
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

      {/* Dialogs */}
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
    </div>
  );
}
