'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CaseActionPanelProps {
    appointmentId: number;
}

export function CaseActionPanel({ appointmentId }: CaseActionPanelProps) {
    return (
        <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <CardHeader>
                <CardTitle className="text-indigo-900">Next Actions</CardTitle>
                <CardDescription className="text-indigo-700/80">Recommended steps for this case</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 relative z-10">
                <Link href={`/doctor/operative/plan/${appointmentId}/new`}>
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200" size="lg">
                        Plan Surgery
                    </Button>
                </Link>
                <Link href={`/doctor/consultations/session/${appointmentId}`}>
                    <Button variant="outline" className="w-full bg-white hover:bg-slate-50 border-indigo-200 text-indigo-700">
                        Resume Consultation
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}
