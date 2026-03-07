'use client';

/**
 * Frontdesk Theater Scheduling Page
 *
 * View and book theater slots for surgical cases ready for theater booking.
 * Cases must be in READY_FOR_SCHEDULING status (doctor surgical plan finalized).
 *
 * Features:
 * - Filter by surgeon, urgency, date
 * - Search by patient name
 * - Sort by urgency and date
 */

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useTheaterSchedulingQueue } from '@/hooks/frontdesk/useTheaterScheduling';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Building2,
    User,
    Stethoscope,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Loader2,
    Search,
    Filter,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { BookTheaterSlotDialog } from '@/components/frontdesk/theater/BookTheaterSlotDialog';

export default function TheaterSchedulingPage() {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const { data, isLoading, error } = useTheaterSchedulingQueue(isAuthenticated && !!user);

    const [selectedCase, setSelectedCase] = useState<any | null>(null);
    const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [surgeonFilter, setSurgeonFilter] = useState<string>('all');
    const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('all');

    // Get unique surgeons for filter
    const surgeons = useMemo(() => {
        if (!data?.cases) return [];
        const uniqueSurgeons = new Map<string, { id: string; name: string }>();
        data.cases.forEach(c => {
            if (c.surgeon && !uniqueSurgeons.has(c.surgeon.id)) {
                uniqueSurgeons.set(c.surgeon.id, c.surgeon);
            }
        });
        return Array.from(uniqueSurgeons.values());
    }, [data?.cases]);

    // Filter cases
    const filteredCases = useMemo(() => {
        if (!data?.cases) return [];

        return data.cases.filter(c => {
            // Search query
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesName = c.patient?.name?.toLowerCase().includes(query);
                const matchesFileNumber = c.patient?.fileNumber?.toLowerCase().includes(query);
                const matchesProcedure = c.procedure.toLowerCase().includes(query);
                if (!matchesName && !matchesFileNumber && !matchesProcedure) {
                    return false;
                }
            }

            // Surgeon filter
            if (surgeonFilter !== 'all' && c.surgeon?.id !== surgeonFilter) {
                return false;
            }

            // Urgency filter
            if (urgencyFilter !== 'all' && c.urgency !== urgencyFilter) {
                return false;
            }

            // Date filter (based on surgical case creation / plan finalization proxy)
            if (dateFilter !== 'all' && c.createdAt) {
                const caseDate = format(new Date(c.createdAt), 'yyyy-MM-dd');
                if (dateFilter === 'today') {
                    const today = format(new Date(), 'yyyy-MM-dd');
                    if (caseDate !== today) return false;
                } else if (dateFilter === 'week') {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    if (new Date(c.createdAt) < weekAgo) return false;
                }
            }

            return true;
        }).sort((a, b) => {
            // Sort by urgency (Emergency > Urgent > Elective)
            const urgencyOrder = { EMERGENCY: 0, URGENT: 1, ELECTIVE: 2 };
            const urgencyDiff = (urgencyOrder[a.urgency as keyof typeof urgencyOrder] ?? 2) - 
                               (urgencyOrder[b.urgency as keyof typeof urgencyOrder] ?? 2);
            if (urgencyDiff !== 0) return urgencyDiff;

            // Then by date (newest first)
            if (a.createdAt && b.createdAt) {
                return new Date(b.createdAt).getTime() - 
                       new Date(a.createdAt).getTime();
            }
            return 0;
        });
    }, [data?.cases, searchQuery, surgeonFilter, urgencyFilter, dateFilter]);

    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-[80vh]">
                <div className="text-center">
                    <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-cyan-500 animate-spin mx-auto mb-4" />
                    <p className="text-sm font-medium text-slate-500">Loading theater scheduling...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md">
                    <p className="text-slate-500 mb-8">Please log in to access theater scheduling.</p>
                    <Link href="/login">
                        <Button size="lg" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg">
                            Return to Login
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <header className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Theater Scheduling</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Book theater slots for cases ready for scheduling
                        </p>
                    </div>
                    <Link href="/frontdesk/dashboard">
                        <Button variant="outline" size="sm">
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search patient, file number, procedure..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Surgeon Filter */}
                    <Select value={surgeonFilter} onValueChange={setSurgeonFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Surgeons" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Surgeons</SelectItem>
                            {surgeons.map(surgeon => (
                                <SelectItem key={surgeon.id} value={surgeon.id}>
                                    {surgeon.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Urgency Filter */}
                    <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Urgencies" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Urgencies</SelectItem>
                            <SelectItem value="EMERGENCY">Emergency</SelectItem>
                            <SelectItem value="URGENT">Urgent</SelectItem>
                            <SelectItem value="ELECTIVE">Elective</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Date Filter */}
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Dates" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Dates</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">Last 7 Days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Active Filters */}
                {(searchQuery || surgeonFilter !== 'all' || urgencyFilter !== 'all' || dateFilter !== 'all') && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className="text-xs text-slate-500">Active filters:</span>
                        {searchQuery && (
                            <Badge variant="secondary" className="text-xs">
                                Search: {searchQuery}
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="ml-1 hover:text-slate-900"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                        {surgeonFilter !== 'all' && (
                            <Badge variant="secondary" className="text-xs">
                                Surgeon: {surgeons.find(s => s.id === surgeonFilter)?.name}
                                <button
                                    onClick={() => setSurgeonFilter('all')}
                                    className="ml-1 hover:text-slate-900"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                        {urgencyFilter !== 'all' && (
                            <Badge variant="secondary" className="text-xs">
                                Urgency: {urgencyFilter}
                                <button
                                    onClick={() => setUrgencyFilter('all')}
                                    className="ml-1 hover:text-slate-900"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                        {dateFilter !== 'all' && (
                            <Badge variant="secondary" className="text-xs">
                                Date: {dateFilter === 'today' ? 'Today' : 'Last 7 Days'}
                                <button
                                    onClick={() => setDateFilter('all')}
                                    className="ml-1 hover:text-slate-900"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6"
                            onClick={() => {
                                setSearchQuery('');
                                setSurgeonFilter('all');
                                setUrgencyFilter('all');
                                setDateFilter('all');
                            }}
                        >
                            Clear all
                        </Button>
                    </div>
                )}
            </header>

            {/* Content */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="border-slate-200">
                            <CardContent className="p-6">
                                <Skeleton className="h-6 w-64 mb-4" />
                                <Skeleton className="h-4 w-48" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : error ? (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            <div>
                                <p className="font-medium text-red-900">Error loading theater scheduling queue</p>
                                <p className="text-sm text-red-700 mt-1">{error.message}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : !data || data.count === 0 ? (
                <Card className="border-slate-200">
                    <CardContent className="p-12 text-center">
                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">No cases ready for theater booking</h3>
                        <p className="text-sm text-slate-500 max-w-md mx-auto">
                            Cases will appear here once the doctor has marked the surgical plan as ready for scheduling.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {/* Summary */}
                    <Card className="border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">
                                            {filteredCases.length} of {data.count} {data.count === 1 ? 'case' : 'cases'} ready for theater booking
                                        </p>
                                        <p className="text-xs text-slate-600 mt-0.5">
                                            {filteredCases.length !== data.count && `Showing ${filteredCases.length} filtered results`}
                                            {filteredCases.length === data.count && 'Surgical plans finalized, ready to schedule'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Cases List */}
                    {filteredCases.length === 0 ? (
                        <Card className="border-slate-200">
                            <CardContent className="p-12 text-center">
                                <Filter className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">No cases match your filters</h3>
                                <p className="text-sm text-slate-500">
                                    Try adjusting your search or filter criteria.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredCases.map((c) => (
                        <Card key={c.id} className="border-slate-200 hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between gap-4">
                                    {/* Left: Patient & Case Info */}
                                    <div className="flex-1 space-y-3">
                                        {/* Patient Info */}
                                        <div className="flex items-start gap-4">
                                            <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                                {c.patient?.name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'P'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-lg font-semibold text-slate-900">
                                                        {c.patient?.name || 'Unknown Patient'}
                                                    </h3>
                                                    {c.patient?.fileNumber && (
                                                        <span className="text-xs text-slate-500">
                                                            #{c.patient.fileNumber}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'text-xs',
                                                            c.urgency === 'EMERGENCY' && 'bg-rose-50 text-rose-700 border-rose-200',
                                                            c.urgency === 'URGENT' && 'bg-amber-50 text-amber-700 border-amber-200',
                                                            c.urgency === 'ELECTIVE' && 'bg-slate-50 text-slate-700 border-slate-200'
                                                        )}
                                                    >
                                                        {c.urgency}
                                                    </Badge>
                                                    {c.preOpChecklistFinalized && (
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                                            Pre-op Complete
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Procedure & Surgeon */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-16">
                                            <div className="flex items-start gap-2">
                                                <Stethoscope className="h-4 w-4 text-slate-400 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-slate-500">Procedure</p>
                                                    <p className="text-sm font-medium text-slate-900">{c.procedure}</p>
                                                </div>
                                            </div>
                                            {c.surgeon && (
                                                <div className="flex items-start gap-2">
                                                    <User className="h-4 w-4 text-slate-400 mt-0.5" />
                                                    <div>
                                                        <p className="text-xs text-slate-500">Surgeon</p>
                                                        <p className="text-sm font-medium text-slate-900">{c.surgeon.name}</p>
                                                        {c.surgeon.specialization && (
                                                            <p className="text-xs text-slate-500">{c.surgeon.specialization}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {c.createdAt && (
                                            <div className="pl-16">
                                                <p className="text-xs text-slate-500">
                                                    Plan completed: {format(new Date(c.createdAt), 'MMM d, yyyy HH:mm')}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex flex-col items-end gap-3">
                                        {c.existingBooking ? (
                                            <div className="text-right">
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mb-2">
                                                    Already Booked
                                                </Badge>
                                                <p className="text-xs text-slate-500">
                                                    {format(new Date(c.existingBooking.startTime), 'MMM d, yyyy')}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {format(new Date(c.existingBooking.startTime), 'HH:mm')} - {format(new Date(c.existingBooking.endTime), 'HH:mm')}
                                                </p>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-700"
                                                onClick={() => {
                                                    setSelectedCase(c);
                                                    setIsBookingDialogOpen(true);
                                                }}
                                            >
                                                Book Theater
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        ))
                    )}
                </div>
            )}

            <BookTheaterSlotDialog 
                open={isBookingDialogOpen}
                onOpenChange={setIsBookingDialogOpen}
                surgicalCase={selectedCase}
                onSuccess={() => window.location.reload()}
            />
        </div>
    );
}
