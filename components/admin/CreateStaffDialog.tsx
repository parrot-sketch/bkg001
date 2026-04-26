'use client';

import { useState } from 'react';
import { Check, Copy, Eye, EyeOff, Loader2, Wand2 } from 'lucide-react';
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
import { useCreateStaff } from '@/hooks/staff/useStaff';
import type { CreateStaffDto } from '@/application/dtos/CreateStaffDto';
import { Role } from '@/domain/enums/Role';
import { ADMIN_MANAGED_ROLES, DOCTOR_SPECIALIZATION_PRESETS, ROLE_LABELS } from '@/features/admin/staff/staffRoles';

interface CreateStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EMPTY_FORM: Partial<CreateStaffDto> = {
  email: '', password: '', role: Role.DOCTOR, firstName: '', lastName: '', phone: '',
  doctorSpecialization: 'General Practice',
  allowAdmin: false,
};

function generateTemporaryPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const all = `${upper}${lower}${digits}`;

  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  const result = [pick(upper), pick(lower), pick(digits)];
  while (result.length < length) result.push(pick(all));

  // shuffle
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join('');
}

export function CreateStaffDialog({ open, onOpenChange, onSuccess }: CreateStaffDialogProps) {
  const [formData, setFormData] = useState<Partial<CreateStaffDto>>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const createMutation = useCreateStaff();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.role) {
      toast.error('Email, password, and role are required');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      await createMutation.mutateAsync({
        email: formData.email!,
        password: formData.password!,
        role: formData.role!,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        phone: formData.phone || undefined,
        doctorSpecialization: formData.role === Role.DOCTOR ? (formData.doctorSpecialization || undefined) : undefined,
        allowAdmin: formData.role === Role.ADMIN ? !!formData.allowAdmin : undefined,
      });
      toast.success('Staff member onboarded successfully');
      setFormData(EMPTY_FORM);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create staff member');
    }
  };

  const handleCopyPassword = async () => {
    const password = formData.password?.trim();
    if (!password) {
      toast.error('No password to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      toast.success('Temporary password copied');
    } catch {
      toast.error('Failed to copy password');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setFormData(EMPTY_FORM); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
        <div className="h-1.5 w-full bg-slate-900" />
        <div className="p-8">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-2xl font-bold text-slate-900">Onboard Staff Member</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Create a new institutional account. The staff member can change their password on first login.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  placeholder="e.g. James"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</Label>
                <Input
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  placeholder="e.g. Muthomi"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address *</Label>
                <Input
                  type="email"
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  placeholder="staff@nairobisculpt.com"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</Label>
                <Input
                  type="tel"
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                  placeholder="+254 7XX XXX XXX"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={createMutation.isPending}
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
                      allowAdmin: nextRole === Role.ADMIN ? prev.allowAdmin ?? false : false,
                    }));
                  }}
                  disabled={createMutation.isPending}
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
                    disabled={createMutation.isPending}
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

              {formData.role === Role.ADMIN && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-rose-600 uppercase tracking-wider">Admin Safety</Label>
                  <label className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={!!formData.allowAdmin}
                      onChange={(e) => setFormData({ ...formData, allowAdmin: e.target.checked })}
                      disabled={createMutation.isPending}
                    />
                    <span className="text-sm font-medium text-rose-700">
                      I confirm this user should have full administrator access.
                    </span>
                  </label>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Temporary Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    className="rounded-xl border-slate-200 bg-slate-50/50 pr-28"
                    placeholder="Min. 8 characters"
                    value={formData.password || ''}
                    onChange={(e) => { setCopied(false); setFormData({ ...formData, password: e.target.value }); }}
                    required
                    disabled={createMutation.isPending}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={createMutation.isPending}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        const next = generateTemporaryPassword();
                        setCopied(false);
                        setFormData({ ...formData, password: next });
                        toast.success('Generated a strong temporary password');
                      }}
                      disabled={createMutation.isPending}
                      aria-label="Generate password"
                    >
                      <Wand2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      onClick={handleCopyPassword}
                      disabled={createMutation.isPending || !formData.password?.trim()}
                      aria-label="Copy password"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400 font-medium">
                    Use a temporary password and share it securely.
                  </p>
                  {formData.password?.trim() && (formData.password.trim().length < 8) ? (
                    <p className="text-xs font-bold text-rose-600">Min. 8 characters</p>
                  ) : null}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-8 gap-3 border-t border-slate-100 pt-6">
              <Button
                type="button" variant="ghost" onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
                className="rounded-xl font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-xl bg-slate-900 px-8 font-bold shadow-lg shadow-slate-900/10"
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Onboard Staff
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
