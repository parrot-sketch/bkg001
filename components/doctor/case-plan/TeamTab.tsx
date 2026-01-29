'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserPlus, User } from 'lucide-react';
import { CasePlanResponseDto } from '@/lib/api/case-plan';

interface TeamTabProps {
    casePlan?: CasePlanResponseDto | null;
}

export function TeamTab({ casePlan }: TeamTabProps) {
    const staff = casePlan?.procedure_record?.staff || [];

    // Fallback if no procedure record exists yet
    const hasRecord = !!casePlan?.procedure_record;

    if (!hasRecord) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                <div className="bg-slate-100 p-4 rounded-full">
                    <User className="h-8 w-8 text-slate-400" />
                </div>
                <div>
                    <h3 className="text-lg font-medium">No Surgical Team Assigned</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-2">
                        Initialize the surgical procedure record to assign staff members.
                    </p>
                </div>
                <Button>Initialize Procedure Record</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Surgical Team</h3>
                    <p className="text-sm text-muted-foreground">Assign roles for the operation</p>
                </div>
                <Button size="sm" className="gap-2" variant="outline">
                    <UserPlus className="h-4 w-4" />
                    Assign Member
                </Button>
            </div>

            <div className="grid gap-4">
                {staff.map((member, idx) => (
                    <Card key={idx}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarFallback>{member.user.firstName[0]}{member.user.lastName[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="font-medium">{member.user.firstName} {member.user.lastName}</h4>
                                    <p className="text-xs text-muted-foreground">{member.user.role}</p>
                                </div>
                            </div>
                            <Badge variant="outline">{member.role.replace('_', ' ')}</Badge>
                        </CardContent>
                    </Card>
                ))}

                {staff.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No team members assigned yet.</p>
                )}
            </div>
        </div>
    );
}
