'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CasePlanResponseDto } from '@/lib/api/case-plan';

interface ConsentsTabProps {
    casePlan?: CasePlanResponseDto | null;
}

export function ConsentsTab({ casePlan }: ConsentsTabProps) {
    const consents = casePlan?.consents || [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Surgical Consents</h3>
                    <p className="text-sm text-muted-foreground">Manage and track patient consent forms</p>
                </div>
                <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Generate Consent
                </Button>
            </div>

            {consents.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
                        <div className="bg-slate-100 p-3 rounded-full">
                            <FileText className="h-8 w-8 text-slate-400" />
                        </div>
                        <div>
                            <h4 className="font-medium text-slate-900">No consents generated</h4>
                            <p className="text-sm text-muted-foreground mt-1">Start by generating the General Surgery Consent form.</p>
                        </div>
                        <Button variant="outline">Generate Standard Bundle</Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {consents.map((consent) => (
                        <Card key={consent.id}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-50 p-2 rounded">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium">{consent.title}</h4>
                                        <p className="text-xs text-muted-foreground">Created {new Date(consent.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant={consent.status === 'SIGNED' ? 'default' : 'secondary'}>
                                        {consent.status}
                                    </Badge>
                                    <Button variant="ghost" size="sm">View</Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Card className="bg-amber-50 border-amber-200">
                <CardHeader>
                    <CardTitle className="text-sm text-amber-900 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Legal Requirement
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-amber-800">
                    Consent forms must be signed by the patient and witnessed before the patient enters the operating theater.
                    Digital signatures are legally binding.
                </CardContent>
            </Card>
        </div>
    );
}
