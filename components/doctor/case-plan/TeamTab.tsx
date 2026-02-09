'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Users } from 'lucide-react';
import { CasePlanResponseDto } from '@/lib/api/case-plan';

interface TeamTabProps {
    casePlan?: CasePlanResponseDto | null;
}

export function TeamTab({ casePlan }: TeamTabProps) {
    const staff = casePlan?.procedure_record?.staff || [];
    const hasRecord = !!casePlan?.procedure_record;

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
                <Button className="mt-5">Initialize Procedure Record</Button>
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
                <Button size="sm" className="gap-2" variant="outline">
                    <UserPlus className="h-4 w-4" />
                    Assign Member
                </Button>
            </div>

            {/* Team List */}
            {staff.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-8 text-center">
                    No team members assigned yet. Click &quot;Assign Member&quot; to add staff.
                </p>
            ) : (
                <div className="space-y-2">
                    {staff.map((member, idx) => (
                        <div
                            key={idx}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback className="text-xs font-semibold">
                                        {member.user.firstName[0]}{member.user.lastName[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="font-medium text-sm">
                                        {member.user.firstName} {member.user.lastName}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">{member.user.role}</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                                {member.role.replace(/_/g, ' ')}
                            </Badge>
                        </div>
                    ))}
                </div>
            )}

            {/* Info about anesthesia from procedure record */}
            {casePlan?.procedure_record?.anesthesia_type && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border text-sm">
                    <span className="font-medium">Anesthesia Type:</span>
                    <Badge variant="secondary">{casePlan.procedure_record.anesthesia_type}</Badge>
                </div>
            )}
        </div>
    );
}
