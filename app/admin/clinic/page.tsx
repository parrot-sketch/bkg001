'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/patient/useAuth';
import { Role } from '@/domain/enums/Role';
import { useRouter } from 'next/navigation';

interface ClinicSettings {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    primary_color: string;
}

export default function ClinicSettingsPage() {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [settings, setSettings] = useState<ClinicSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || user?.role !== Role.ADMIN)) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, user, router]);

    useEffect(() => {
        if (isAuthenticated && user?.role === Role.ADMIN) {
            fetch('/api/admin/clinic')
                .then(res => res.json())
                .then(data => {
                    setSettings(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [isAuthenticated, user]);

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const res = await fetch('/api/admin/clinic', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });

            if (!res.ok) throw new Error('Failed to save');

            toast.success('Settings Saved', {
                description: 'Clinic configuration has been updated.',
            });
        } catch (error) {
            toast.error('Error', {
                description: 'Could not save settings.',
            });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Clinic Configuration</h1>
                <p className="text-muted-foreground mt-2">Manage the core details of your surgical center.</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-indigo-600" />
                        <CardTitle>General Information</CardTitle>
                    </div>
                    <CardDescription>
                        These details appear on patient portals, invoices, and automated communications.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Clinic Name</Label>
                        <Input
                            value={settings?.name || ''}
                            onChange={e => setSettings(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Address</Label>
                        <Input
                            value={settings?.address || ''}
                            onChange={e => setSettings(prev => prev ? ({ ...prev, address: e.target.value }) : null)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input
                                value={settings?.phone || ''}
                                onChange={e => setSettings(prev => prev ? ({ ...prev, phone: e.target.value }) : null)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input
                                value={settings?.email || ''}
                                onChange={e => setSettings(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Website</Label>
                        <Input
                            value={settings?.website || ''}
                            onChange={e => setSettings(prev => prev ? ({ ...prev, website: e.target.value }) : null)}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Configurations
                </Button>
            </div>
        </div>
    );
}
