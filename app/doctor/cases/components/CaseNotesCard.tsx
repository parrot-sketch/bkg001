'use client';

import Link from 'next/link';
import { FileText, Play } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CaseNotesCardProps {
    note: string | null;
    appointmentId: number;
}

export function CaseNotesCard({ note, appointmentId }: CaseNotesCardProps) {
    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-slate-400" />
                    Clinical Notes
                </CardTitle>
            </CardHeader>
            <CardContent>
                {note ? (
                    <div className="bg-yellow-50/50 p-6 rounded-xl border border-yellow-100 text-slate-800 text-sm leading-relaxed">
                        {note}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-400 text-sm italic">
                        No preliminary notes recorded for this appointment.
                    </div>
                )}
            </CardContent>
            <CardFooter className="border-t bg-slate-50/50 p-4">
                <Link href={`/doctor/consultations/${appointmentId}/session`} className="w-full">
                    <Button variant="outline" className="w-full gap-2">
                        <Play className="h-4 w-4" />
                        View Full Consultation Session
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
}
