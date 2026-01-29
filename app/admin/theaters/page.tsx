'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Syringe, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/patient/useAuth';
import { Role } from '@/domain/enums/Role';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Theater {
    id: string;
    name: string;
    type: string;
    status: string;
    color_code: string;
}

export default function TheatersPage() {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [theaters, setTheaters] = useState<Theater[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);

    // New Theater Form State
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('MAJOR');
    const [newColor, setNewColor] = useState('#EF4444');

    const fetchTheaters = () => {
        setLoading(true);
        fetch('/api/admin/theaters')
            .then(async res => {
                if (res.status === 401) {
                    toast.error('Session expired. Please login again.');
                    router.push('/login');
                    // Return empty array to prevent further errors before redirect happens
                    return [];
                }
                if (!res.ok) throw new Error('Failed to fetch');
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    setTheaters(data);
                } else {
                    setTheaters([]);
                    console.error('Expected array but got:', data);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
                setTheaters([]);
            });
    };

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || user?.role !== Role.ADMIN)) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, user, router]);

    useEffect(() => {
        if (isAuthenticated && user?.role === Role.ADMIN) {
            fetchTheaters();
        }
    }, [isAuthenticated, user]);

    const handleAddTheater = async () => {
        try {
            const res = await fetch('/api/admin/theaters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName, type: newType, color_code: newColor }),
            });
            if (!res.ok) throw new Error('Failed');

            toast.success('Theater Added');
            setDialogOpen(false);
            setNewName('');
            fetchTheaters();
        } catch (e) {
            toast.error('Error adding theater');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this theater?')) return;
        try {
            const res = await fetch(`/api/admin/theaters/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            toast.success('Theater Deleted');
            fetchTheaters();
        } catch (e) {
            toast.error('Error deleting theater');
        }
    };

    if (authLoading || loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Operating Theaters</h1>
                    <p className="text-muted-foreground mt-2">Manage surgical suites and procedure rooms.</p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Theater
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Theater</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input id="name" value={newName} onChange={e => setNewName(e.target.value)} className="col-span-3" placeholder="e.g. Theater C (Laser)" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="type" className="text-right">Type</Label>
                                <div className="col-span-3">
                                    <Select value={newType} onValueChange={setNewType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MAJOR">Major Operating Room</SelectItem>
                                            <SelectItem value="MINOR">Minor Procedure Room</SelectItem>
                                            <SelectItem value="PROCEDURE_ROOM">Consultation/Procedure</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="color" className="text-right">Color</Label>
                                <div className="col-span-3 flex items-center gap-2">
                                    <Input id="color" type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-16 h-10 p-1" />
                                    <span className="text-sm text-muted-foreground">{newColor}</span>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddTheater}>Save Theater</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {theaters.map(theater => (
                    <Card key={theater.id} className="border-l-4" style={{ borderLeftColor: theater.color_code || '#ccc' }}>
                        <CardHeader className="flex flex-row items-start justify-between pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-lg">{theater.name}</CardTitle>
                                <CardDescription>{theater.type.replace('_', ' ')}</CardDescription>
                            </div>
                            <div className={`h-2 w-2 rounded-full ${theater.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-end pt-4">
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(theater.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
