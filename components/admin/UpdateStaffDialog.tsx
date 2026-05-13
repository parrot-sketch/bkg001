'use client';

import { useState, useEffect } from 'react';
import { Loader2, Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUpdateStaff } from '@/hooks/staff/useStaff';
import type { UserResponseDto } from '@/application/dtos/UserResponseDto';
import type { CreateStaffDto } from '@/application/dtos/CreateStaffDto';
import { Role } from '@/domain/enums/Role';
import { ADMIN_MANAGED_ROLES, DOCTOR_SPECIALIZATION_PRESETS, ROLE_LABELS } from '@/features/admin/staff/staffRoles';

interface UpdateStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  staff: UserResponseDto;
}

export function UpdateStaffDialog({ open, onOpenChange, onSuccess, staff }: UpdateStaffDialogProps) {
  const [formData, setFormData] = useState<Partial<CreateStaffDto> & { 
    confirmPassword?: string; 
    showPassword?: boolean;
  }>({
    email: staff.email,
    role: staff.role as CreateStaffDto['role'],
    firstName: staff.firstName || '',
    lastName: staff.lastName || '',
    phone: staff.phone || '',
    password: '',
    confirmPassword: '',
    showPassword: false,
    doctorSpecialization: staff.doctorSpecialization || (staff.role === Role.DOCTOR ? 'General Practice' : undefined),
    allowAdmin: false,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        email: staff.email,
        role: staff.role as CreateStaffDto['role'],
        firstName: staff.firstName || '',
        lastName: staff.lastName || '',
        phone: staff.phone || '',
        password: '',
        confirmPassword: '',
        showPassword: false,
        doctorSpecialization: staff.doctorSpecialization || (staff.role === Role.DOCTOR ? 'General Practice' : undefined),
        allowAdmin: false,
      });
    }
  }, [open, staff]);

  // Calculate password strength
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (pwd.length >= 12) score += 15;
    if (/[a-z]/.test(pwd)) score += 15;
    if (/[A-Z]/.test(pwd)) score += 15;
    if (/[0-9]/.test(pwd)) score += 15;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 15;

    if (score >= 80) return { score, label: 'Strong', color: 'bg-emerald-500' };
    if (score >= 60) return { score, label: 'Good', color: 'bg-lime-500' };
    if (score >= 40) return { score, label: 'Fair', color: 'bg-amber-500' };
    if (score > 0) return { score, label: 'Weak', color: 'bg-orange-500' };
    return { score: 0, label: '', color: '' };
  };

  const passwordStrength = formData.password ? getPasswordStrength(formData.password) : null;
  const passwordMismatch = formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword;
  const isPasswordValid = formData.password && formData.password.length >= 8 && !passwordMismatch;

  const updateMutation = useUpdateStaff();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.role) {
      toast.error('Email and role are required');
      return;
    }

    const roleChangeInvolvesAdmin =
      (staff.role === Role.ADMIN && formData.role !== Role.ADMIN) ||
      (staff.role !== Role.ADMIN && formData.role === Role.ADMIN);
    if (roleChangeInvolvesAdmin && !formData.allowAdmin) {
      toast.error('Confirm admin role change to proceed');
      return;
    }

    // Password validation
    if (formData.password?.trim()) {
      if (formData.password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    }

    const updates: Partial<CreateStaffDto> = {
      email: formData.email,
      role: formData.role,
      firstName: formData.firstName || undefined,
      lastName: formData.lastName || undefined,
      phone: formData.phone || undefined,
      doctorSpecialization: formData.role === Role.DOCTOR ? (formData.doctorSpecialization || undefined) : undefined,
      allowAdmin: roleChangeInvolvesAdmin ? true : undefined,
    };
    if (formData.password?.trim()) {
      updates.password = formData.password;
    }

    try {
      await updateMutation.mutateAsync({ id: staff.id, updates });
      toast.success('Staff profile updated');
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update staff member');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
        <div className="h-1.5 w-full bg-indigo-600" />
        <div className="p-8">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-2xl font-bold text-slate-900">Edit Staff Profile</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Update institutional account details for {staff.firstName || staff.email}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address *</Label>
                <Input
                  type="email"
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</Label>
                <Input
                  type="tel"
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Institutional Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) => {
                    const nextRole = val as CreateStaffDto['role'];
                    setFormData((prev) => ({
                      ...prev,
                      role: nextRole,
                      doctorSpecialization:
                        nextRole === Role.DOCTOR ? (prev.doctorSpecialization || 'General Practice') : undefined,
                      allowAdmin: false,
                    }));
                  }}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-10">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {ADMIN_MANAGED_ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="rounded-lg">
                        {r === Role.DOCTOR ? 'Doctor (Surgeon/Anaesthesiologist)' : (ROLE_LABELS[r] || r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.role === Role.DOCTOR && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doctor Specialization</Label>
                  <Select
                    value={formData.doctorSpecialization || 'General Practice'}
                    onValueChange={(val) => setFormData({ ...formData, doctorSpecialization: val })}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-10">
                      <SelectValue placeholder="Select specialization" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {DOCTOR_SPECIALIZATION_PRESETS.map((s) => (
                        <SelectItem key={s} value={s} className="rounded-lg">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

               {((staff.role === Role.ADMIN && formData.role !== Role.ADMIN) || (staff.role !== Role.ADMIN && formData.role === Role.ADMIN)) && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-rose-600 uppercase tracking-wider">Admin Safety</Label>
                  <label className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={!!formData.allowAdmin}
                      onChange={(e) => setFormData({ ...formData, allowAdmin: e.target.checked })}
                      disabled={updateMutation.isPending}
                    />
                    <span className="text-sm font-medium text-rose-700">
                      I confirm this role change should grant/remove administrator access.
                    </span>
                  </label>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Lock className="h-3 w-3" />
                  Password
                </Label>
                
                <div className="space-y-3">
                  {/* New Password Field */}
                  <div className="relative">
                    <Input
                      type={formData.showPassword ? 'text' : 'password'}
                      className="rounded-xl border-slate-200 bg-slate-50/50 pr-10"
                      placeholder="Leave blank to keep current password (min. 8 characters)"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value, confirmPassword: '' })}
                      disabled={updateMutation.isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, showPassword: !formData.showPassword })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {formData.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {passwordStrength && formData.password && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Strength</span>
                        <span className={cn(
                          'font-medium',
                          passwordStrength.score >= 80 ? 'text-emerald-600' :
                          passwordStrength.score >= 60 ? 'text-lime-600' :
                          passwordStrength.score >= 40 ? 'text-amber-600' : 'text-orange-600'
                        )}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={cn(
                            'h-full transition-all duration-200',
                            passwordStrength.color
                          )}
                          style={{ width: `${passwordStrength.score}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1 text-[10px] text-slate-400">
                        {!/([a-z])/.test(formData.password) && <span className="text-red-500">lowercase</span>}
                        {!/([A-Z])/.test(formData.password) && <span className="text-red-500">uppercase</span>}
                        {!/([0-9])/.test(formData.password) && <span className="text-red-500">number</span>}
                        {!/[^a-zA-Z0-9]/.test(formData.password) && <span className="text-red-500">symbol</span>}
                        {formData.password.length < 8 && <span className="text-red-500">min 8 chars</span>}
                        {formData.password.length >= 8 && <span className="text-slate-400">length ✓</span>}
                      </div>
                    </div>
                  )}

                  {/* Confirm Password Field (only if password entered) */}
                  {formData.password && (
                    <div className="relative">
                      <Input
                        type={formData.showPassword ? 'text' : 'password'}
                        className="rounded-xl border-slate-200 bg-slate-50/50"
                        placeholder="Confirm new password"
                        value={formData.confirmPassword || ''}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        disabled={updateMutation.isPending}
                      />
                      {formData.confirmPassword && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {passwordMismatch ? (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {passwordMismatch && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Passwords do not match
                    </p>
                  )}
                  
                  {/* Info text */}
                  {!formData.password && (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Lock className="h-3 w-3" />
                      Leave blank to keep the current password unchanged
                    </p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-8 gap-3 border-t border-slate-100 pt-6">
              <Button
                type="button" variant="ghost" onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
                className="rounded-xl font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-8 font-bold shadow-lg shadow-indigo-600/10"
              >
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
