'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Users, Loader2, Trash2 } from 'lucide-react';
import { CasePlanResponseDto } from '@/lib/api/case-plan';
import { useInitProcedureRecord, useAssignStaff, useRemoveStaff } from '@/hooks/doctor/useCasePlan';

interface TeamTabProps {
    casePlan?: CasePlanResponseDto | null;
    caseId?: string;
}

const SURGICAL_ROLES = [
    { value: 'SURGEON', label: 'Surgeon' },
    { value: 'ASSISTANT_SURGEON', label: 'Assistant Surgeon' },
    { value: 'ANESTHESIOLOGIST', label: 'Anesthesiologist' },
    { value: 'ANESTHETIST_NURSE', label: 'Anesthetist Nurse' },
    { value: 'SCRUB_NURSE', label: 'Scrub Nurse' },
    { value: 'CIRCULATING_NURSE', label: 'Circulating Nurse' },
    { value: 'THEATER_TECHNICIAN', label: 'Theater Technician' },
];

const ROLE_COLORS: Record<string, string> = {
    SURGEON: 'bg-blue-100 text-blue-700 border-blue-200',
    ASSISTANT_SURGEON: 'bg-blue-50 text-blue-600 border-blue-150',
    ANESTHESIOLOGIST: 'bg-purple-100 text-purple-700 border-purple-200',
    ANESTHETIST_NURSE: 'bg-purple-50 text-purple-600 border-purple-150',
    SCRUB_NURSE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    CIRCULATING_NURSE: 'bg-teal-100 text-teal-700 border-teal-200',
    THEATER_TECHNICIAN: 'bg-amber-100 text-amber-700 border-amber-200',
};

export function TeamTab({ casePlan, caseId }: TeamTabProps) {
    const staff = casePlan?.procedure_record?.staff || [];
    const hasRecord = !!casePlan?.procedure_record;

    const initRecord = useInitProcedureRecord(caseId ?? '');
    const assignStaff = useAssignStaff(caseId ?? '');
    const removeStaff = useRemoveStaff(caseId ?? '');

    const [showAssignDialog, setShowAssignDialog] = useState(false);
    const [assignUserId, setAssignUserId] = useState('');
    const [assignRole, setAssignRole] = useState('SCRUB_NURSE');

    const canManage = !!caseId;

    const handleInit = async () => {
        await initRecord.mutateAsync();
    };

    const handleAssign = async () => {
        if (!assignUserId.trim()) return;
        await assignStaff.mutateAsync({
            userId: assignUserId.trim(),
            role: assignRole,
        });
        setShowAssignDialog(false);
        setAssignUserId('');
        setAssignRole('SCRUB_NURSE');
    };

    const handleRemove = async (staffId: number) => {
        await removeStaff.mutateAsync(staffId);
    };

    if (!hasRecord) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
                <div className="bg-muted p-3 rounded-full mb-4">
                    <Users className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">No Surgical Team Assigned</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    Initialize the surgical procedure record to assign staff members and roles.
                </p>
                {canManage && (
                    <Button
                        className="mt-5 gap-2"
                        onClick={handleInit}
                        disabled={initRecord.isPending}
                    >
                        {initRecord.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Initialize Procedure Record
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Surgical Team</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Assign roles for the operation</p>
                </div>
                {canManage && (
                    <Button
                        size="sm"
                        className="gap-2"
                        variant="outline"
                        onClick={() => setShowAssignDialog(true)}
                    >
                        <UserPlus className="h-4 w-4" />
                        Assign Member
                    </Button>
                )}
            </div>

            {/* Team List */}
            {staff.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
                    <Users className="h-6 w-6 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                        No team members assigned yet. Click &quot;Assign Member&quot; to add staff.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {staff.map((member: any, idx: number) => {
                        const roleColor = ROLE_COLORS[member.role] || 'bg-muted text-muted-foreground';
                        const initials = member.user
                            ? `${member.user.firstName?.[0] || ''}${member.user.lastName?.[0] || ''}`
                            : '??';
                        const displayName = member.user
                            ? `${member.user.firstName} ${member.user.lastName}`
                            : 'Unknown User';
                        const userRole = member.user?.role || '';

                        return (
                            <div
                                key={member.id ?? idx}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback className="text-xs font-semibold">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h4 className="font-medium text-sm">{displayName}</h4>
                                        <p className="text-xs text-muted-foreground">{userRole}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={`text-xs ${roleColor}`}>
                                        {member.role.replace(/_/g, ' ')}
                                    </Badge>
                                    {canManage && member.id && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleRemove(member.id)}
                                            disabled={removeStaff.isPending}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Info about anesthesia from procedure record */}
            {casePlan?.procedure_record?.anesthesia_type && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border text-sm">
                    <span className="font-medium">Anesthesia Type:</span>
                    <Badge variant="secondary">{casePlan.procedure_record.anesthesia_type}</Badge>
                </div>
            )}

            {/* ── Assign Staff Dialog ──────────────────────────────── */}
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign Team Member</DialogTitle>
                        <DialogDescription>
                            Enter the user ID and select their surgical role.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">User ID</Label>
                            <Input
                                value={assignUserId}
                                onChange={(e) => setAssignUserId(e.target.value)}
                                placeholder="Enter the user's ID"
                            />
                            <p className="text-xs text-muted-foreground">
                                The unique identifier of the staff member to assign.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Surgical Role</Label>
                            <Select value={assignRole} onValueChange={setAssignRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SURGICAL_ROLES.map((r) => (
                                        <SelectItem key={r.value} value={r.value}>
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAssign}
                            disabled={assignStaff.isPending || !assignUserId.trim()}
                            className="gap-2"
                        >
                            {assignStaff.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            <UserPlus className="h-4 w-4" />
                            Assign
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
