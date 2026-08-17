'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useCreateStaff } from '@/hooks/staff/useStaff';
import type { CreateStaffDto } from '@/application/dtos/CreateStaffDto';
import { Role } from '@/domain/enums/Role';
import { ADMIN_MANAGED_ROLES, DOCTOR_SPECIALIZATION_PRESETS, ROLE_LABELS } from '@/features/admin/staff/staffRoles';

const EMPTY_FORM: Partial<CreateStaffDto> = {
  email: '', password: '', role: Role.DOCTOR, firstName: '', lastName: '', phone: '',
  doctorSpecialization: 'General Practice',
  allowAdmin: false,
};

export default function NewStaffPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<CreateStaffDto>>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const createMutation = useCreateStaff();

  useEffect(() => {
    if (createMutation.isSuccess) {
      router.push('/admin/staff');
    }
  }, [createMutation.isSuccess, router]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.role) {
      toast.error('Email, password, and role are required');
      return;
    }
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      toast.error(passwordError);
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
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create staff member');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/staff')}
            className="text-[#2c2e4b]/60 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/20"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Onboard Staff Member</h1>
            <p className="text-sm text-slate-300 mt-0.5">Create a new institutional account. The staff member can change their password on first login.</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white border border-[#e7d6bf] shadow-sm">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#2c2e4b]/70 uppercase tracking-wider">First Name</Label>
              <Input
                placeholder="e.g. James"
                value={formData.firstName || ''}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={createMutation.isPending}
                className="border-[#e7d6bf] bg-white focus-visible:ring-[#caa26a]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#2c2e4b]/70 uppercase tracking-wider">Last Name</Label>
              <Input
                placeholder="e.g. Muthomi"
                value={formData.lastName || ''}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={createMutation.isPending}
                className="border-[#e7d6bf] bg-white focus-visible:ring-[#caa26a]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#2c2e4b]/70 uppercase tracking-wider">Email Address *</Label>
              <Input
                type="email"
                placeholder="staff@nairobisculpt.com"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={createMutation.isPending}
                className="border-[#e7d6bf] bg-white focus-visible:ring-[#caa26a]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#2c2e4b]/70 uppercase tracking-wider">Phone</Label>
              <Input
                type="tel"
                placeholder="+254 7XX XXX XXX"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={createMutation.isPending}
                className="border-[#e7d6bf] bg-white focus-visible:ring-[#caa26a]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#2c2e4b]/70 uppercase tracking-wider">Institutional Role *</Label>
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
                <SelectTrigger className="h-10 border-[#e7d6bf] bg-white focus:ring-[#caa26a]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_MANAGED_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r === Role.DOCTOR ? 'Doctor (Surgeon/Anaesthesiologist)' : (ROLE_LABELS[r] || r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.role === Role.DOCTOR && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#2c2e4b]/70 uppercase tracking-wider">Doctor Specialization</Label>
                <Select
                  value={formData.doctorSpecialization || 'General Practice'}
                  onValueChange={(val) => setFormData({ ...formData, doctorSpecialization: val })}
                  disabled={createMutation.isPending}
                >
                  <SelectTrigger className="h-10 border-[#e7d6bf] bg-white focus:ring-[#caa26a]">
                    <SelectValue placeholder="Select specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCTOR_SPECIALIZATION_PRESETS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.role === Role.ADMIN && (
              <div className="md:col-span-2 space-y-2">
                <Label className="text-xs font-bold text-rose-600 uppercase tracking-wider">Admin Safety</Label>
                <label className="flex items-start gap-3 border border-rose-200 bg-rose-50/50 px-4 py-3">
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

            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs font-bold text-[#2c2e4b]/70 uppercase tracking-wider">Temporary Password *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={createMutation.isPending}
                  className="border-[#e7d6bf] bg-white pr-28 focus-visible:ring-[#caa26a]"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#2c2e4b]/50 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/20"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={createMutation.isPending}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-bold text-[#2c2e4b]/70 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/20"
                    onClick={() => {
                      const pwd = generateTemporaryPassword();
                      setFormData({ ...formData, password: pwd });
                      toast.success('Generated a strong temporary password');
                    }}
                    disabled={createMutation.isPending}
                  >
                    Generate
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-bold text-[#2c2e4b]/70 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/20"
                    onClick={async () => {
                      if (!formData.password?.trim()) {
                        toast.error('No password to copy');
                        return;
                      }
                      try {
                        await navigator.clipboard.writeText(formData.password.trim());
                        toast.success('Temporary password copied');
                      } catch {
                        toast.error('Failed to copy password');
                      }
                    }}
                    disabled={createMutation.isPending || !formData.password?.trim()}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              {formData.password?.trim() && formData.password.trim().length < 8 && (
                <p className="text-xs font-bold text-rose-600">Min. 8 characters</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-[#e7d6bf]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/admin/staff')}
              disabled={createMutation.isPending}
              className="font-bold text-[#2c2e4b]/70 hover:text-[#2c2e4b] hover:bg-[#e7d6bf]/20"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-[#2c2e4b] hover:bg-[#1a1c2e] text-white font-bold"
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Onboard Staff
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function generateTemporaryPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const all = `${upper}${lower}${digits}`;

  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  const result = [pick(upper), pick(lower), pick(digits)];
  while (result.length < length) result.push(pick(all));

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join('');
}
