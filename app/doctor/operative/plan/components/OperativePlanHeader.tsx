'use client';

import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  ExternalLink, 
  Loader2, 
  Send, 
  CalendarCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProfileImage } from '@/components/profile-image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Readiness Badge Helper
export function ReadinessBadge({ status }: { status?: string }) {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
        READY: { label: 'Ready for Surgery', variant: 'default' },
        IN_PROGRESS: { label: 'In Progress', variant: 'secondary' },
        NOT_STARTED: { label: 'Not Started', variant: 'outline' },
        PENDING_LABS: { label: 'Pending Labs', variant: 'secondary' },
        PENDING_CONSENT: { label: 'Pending Consent', variant: 'secondary' },
        PENDING_REVIEW: { label: 'Pending Review', variant: 'secondary' },
        ON_HOLD: { label: 'On Hold', variant: 'destructive' },
    };
    const c = config[status || 'NOT_STARTED'] || config.NOT_STARTED;
    return <Badge variant={c.variant} className="text-xs">{c.label}</Badge>;
}

// Age Helper
export function calculateAge(dob?: string | Date): string | null {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return `${age}y`;
}

interface OperativePlanHeaderProps {
    patientName: string;
    patientId: string;
    fileNumber?: string;
    gender?: string;
    dateOfBirth?: string | Date;
    appointmentDate: string | Date;
    appointmentTime: string;
    readinessStatus?: string;
    surgicalCaseStatus?: string;
    surgicalCaseId?: string | number;
    isPendingMarkReady: boolean;
    onMarkReady: (id: string) => void;
}

export function OperativePlanHeader({
    patientName,
    patientId,
    fileNumber,
    gender,
    dateOfBirth,
    appointmentDate,
    appointmentTime,
    readinessStatus,
    surgicalCaseStatus,
    surgicalCaseId,
    isPendingMarkReady,
    onMarkReady,
}: OperativePlanHeaderProps) {
    const router = useRouter();
    const age = calculateAge(dateOfBirth);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 -ml-2 h-8 text-muted-foreground hover:text-foreground"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                </Button>
            </div>

            <div className="rounded-xl border bg-card shadow-sm">
                <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                        <ProfileImage name={patientName} className="h-11 w-11 shrink-0 text-sm" />
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg font-bold truncate">{patientName}</h1>
                                <ReadinessBadge status={readinessStatus} />
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5 flex-wrap">
                                {fileNumber && (
                                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                        {fileNumber}
                                    </span>
                                )}
                                {gender && <span>{gender}</span>}
                                {age && <span>{age}</span>}
                                <span className="hidden sm:inline text-border">·</span>
                                <span className="hidden sm:inline-flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {format(new Date(appointmentDate), 'MMM d, yyyy')}
                                </span>
                                <span className="hidden sm:inline-flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {appointmentTime}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/doctor/patients/${patientId}`}>
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                                <ExternalLink className="h-3 w-3" />
                                Patient Profile
                            </Button>
                        </Link>

                        {surgicalCaseStatus === 'PLANNING' && surgicalCaseId && (
                            <Button
                                size="sm"
                                className="gap-1.5 text-xs h-8"
                                disabled={isPendingMarkReady}
                                onClick={() => onMarkReady(surgicalCaseId.toString())}
                            >
                                {isPendingMarkReady ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Send className="h-3 w-3" />
                                )}
                                Mark Ready for Ward Prep
                            </Button>
                        )}

                        {surgicalCaseStatus === 'READY_FOR_WARD_PREP' && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs gap-1">
                                <CalendarCheck className="h-3 w-3" />
                                Ready for Ward Prep
                            </Badge>
                        )}
                        {surgicalCaseStatus === 'SCHEDULED' && (
                            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs gap-1">
                                <CalendarCheck className="h-3 w-3" />
                                Scheduled
                            </Badge>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
