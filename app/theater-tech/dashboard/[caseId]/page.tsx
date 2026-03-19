'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Users, Package, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
    id?: string;
    role: string;
    name: string;
    userId?: string;
}

const TEAM_ROLES = [
    { key: 'SURGEON', label: 'Lead Surgeon', placeholder: 'Dr. Name' },
    { key: 'ANAESTHESIOLOGIST', label: 'Anaesthesiologist', placeholder: 'Dr. Name' },
    { key: 'ASSISTANT', label: 'Surgical Assistant(s)', placeholder: 'Names' },
    { key: 'SCRUB_NURSE', label: 'Scrub Nurse', placeholder: 'Nurse Name' },
    { key: 'CIRCULATING_NURSE', label: 'Circulating Nurse', placeholder: 'Nurse Name' },
];

export default function TheaterPrepPage() {
    const params = useParams();
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const caseId = params.caseId as string;

    const [loading, setLoading] = useState(true);
    const [fetched, setFetched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [caseData, setCaseData] = useState<any>(null);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

    useEffect(() => {
        if (!caseId || fetched) return;

        const fetchCase = async () => {
            try {
                const res = await fetch(`/api/theater-tech/surgical-cases/${caseId}/theater-prep`);
                const data = await res.json();
                if (data.success) {
                    setCaseData(data.data.case);
                    // Initialize team members from existing data
                    const existingMembers = data.data.teamMembers || [];
                    const members = TEAM_ROLES.map(role => {
                        const existing = existingMembers.find((m: any) => m.role === role.key);
                        return {
                            role: role.key,
                            name: existing?.name || '',
                            userId: existing?.user_id || '',
                        };
                    });
                    setTeamMembers(members);
                }
            } catch (error) {
                console.error('Error fetching case:', error);
                toast.error('Failed to load case');
            } finally {
                setLoading(false);
                setFetched(true);
            }
        };

        fetchCase();
    }, [caseId, fetched]);

    const handleTeamMemberChange = (role: string, name: string) => {
        setTeamMembers(prev => 
            prev.map(m => m.role === role ? { ...m, name } : m)
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/theater-tech/surgical-cases/${caseId}/theater-prep`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamMembers }),
            });
            const data = await res.json();
            
            if (data.success) {
                toast.success('Team members saved');
            } else {
                toast.error(data.error || 'Failed to save');
            }
        } catch (error) {
            console.error('Error saving:', error);
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleComplete = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/theater-tech/surgical-cases/${caseId}/theater-prep`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamMembers, action: 'complete' }),
            });
            const data = await res.json();
            
            if (data.success) {
                toast.success('Case submitted for theater booking');
                router.push('/theater-tech/dashboard');
            } else {
                toast.error(data.error || 'Failed to complete');
            }
        } catch (error) {
            console.error('Error completing:', error);
            toast.error('Failed to complete');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-64" />
                <Skeleton className="h-48" />
            </div>
        );
    }

    if (!caseData) {
        return (
            <div className="p-6">
                <p>Case not found</p>
            </div>
        );
    }

    const isEditable = caseData.status === 'READY_FOR_SCHEDULING' || caseData.status === 'READY_FOR_THEATER_PREP';

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Theater Preparation</h1>
                    <p className="text-slate-500">Add team members and verify planned items</p>
                </div>
            </div>

            {/* Patient Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Case Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-slate-500">Patient</Label>
                            <p className="font-medium">{caseData.patient?.first_name} {caseData.patient?.last_name}</p>
                            {caseData.patient?.file_number && (
                                <p className="text-sm text-slate-400">File #: {caseData.patient.file_number}</p>
                            )}
                        </div>
                        <div>
                            <Label className="text-slate-500">Procedure</Label>
                            <p className="font-medium">{caseData.procedureName || 'Not specified'}</p>
                        </div>
                        <div>
                            <Label className="text-slate-500">Surgeon</Label>
                            <p className="font-medium">{caseData.surgeon?.name || 'Not assigned'}</p>
                        </div>
                        <div>
                            <Label className="text-slate-500">Status</Label>
                            <Badge variant="outline">{caseData.status}</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Team Members */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Surgical Team
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {TEAM_ROLES.map(role => (
                        <div key={role.key} className="grid grid-cols-3 items-center gap-4">
                            <Label className="text-slate-600">{role.label}</Label>
                            <Input
                                value={teamMembers.find(m => m.role === role.key)?.name || ''}
                                onChange={(e) => handleTeamMemberChange(role.key, e.target.value)}
                                placeholder={role.placeholder}
                                disabled={!isEditable}
                                className="col-span-2"
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Planned Items */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Planned Items
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {caseData.plannedItems?.length > 0 ? (
                        <div className="space-y-2">
                            {caseData.plannedItems.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between p-3 bg-slate-50 rounded">
                                    <span>{item.inventory_item?.name || item.service?.service_name}</span>
                                    <span className="text-slate-500">Qty: {item.planned_quantity}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400">No planned items. Add items from inventory.</p>
                    )}
                </CardContent>
            </Card>

            {/* Actions */}
            {isEditable && (
                <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Draft
                    </Button>
                    <Button onClick={handleComplete} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        Submit for Booking
                    </Button>
                </div>
            )}
        </div>
    );
}
