'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Users,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  Scissors,
  FileText,
  ChevronRight,
  Loader2,
  RefreshCw,
  Stethoscope,
  ClipboardList,
  Package,
  LayoutDashboard,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  total: number;
  draft: number;
  planning: number;
  readyForPrep: number;
  scheduled: number;
  inPrep: number;
  inTheater: number;
  recovery: number;
  completed: number;
}

interface RecentCase {
  id: string;
  status: string;
  procedure_name: string | null;
  created_at: string;
  patient: {
    first_name: string;
    last_name: string;
    file_number: string | null;
  };
  primary_surgeon: {
    name: string;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'border border-slate-200 bg-slate-100 text-slate-700' },
  PLANNING: { label: 'Planning', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
  READY_FOR_WARD_PREP: { label: 'Ward Prep', className: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
  IN_WARD_PREP: { label: 'In Ward Prep', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
  READY_FOR_THEATER_BOOKING: { label: 'Ready for Booking', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
  SCHEDULED: { label: 'Scheduled', className: 'border border-slate-300 bg-slate-100 text-slate-700' },
  IN_PREP: { label: 'In Prep', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
  IN_THEATER: { label: 'In Theater', className: 'border border-red-200 bg-red-50 text-red-700' },
  RECOVERY: { label: 'Recovery', className: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
  COMPLETED: { label: 'Completed', className: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
};

export default function TheaterTechDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    draft: 0,
    planning: 0,
    readyForPrep: 0,
    scheduled: 0,
    inPrep: 0,
    inTheater: 0,
    recovery: 0,
    completed: 0,
  });
  const [recentCases, setRecentCases] = useState<RecentCase[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/theater-tech/surgical-cases');
        const data = await res.json();
        
        if (data.success && data.data) {
          const cases = data.data as RecentCase[];
          
          const newStats: DashboardStats = {
            total: cases.length,
            draft: cases.filter((c) => c.status === 'DRAFT').length,
            planning: cases.filter((c) => c.status === 'PLANNING').length,
            readyForPrep: cases.filter((c) => ['READY_FOR_WARD_PREP', 'IN_WARD_PREP', 'READY_FOR_THEATER_BOOKING'].includes(c.status)).length,
            scheduled: cases.filter((c) => ['READY_FOR_THEATER_BOOKING', 'SCHEDULED'].includes(c.status)).length,
            inPrep: cases.filter((c) => c.status === 'IN_PREP').length,
            inTheater: cases.filter((c) => c.status === 'IN_THEATER').length,
            recovery: cases.filter((c) => c.status === 'RECOVERY').length,
            completed: cases.filter((c) => c.status === 'COMPLETED').length,
          };
          
          setStats(newStats);
          setRecentCases(cases.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCaseClick = (caseId: string, status: string) => {
    if (status === 'DRAFT' || status === 'PLANNING') {
      router.push(`/theater-tech/surgical-cases/${caseId}/edit`);
    } else {
      router.push(`/theater-tech/surgical-cases/${caseId}/plan`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Theater Tech Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Coordinate surgical cases from ward readiness through live theater activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.refresh()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          stats.readyForPrep > 0 && "border-amber-300 bg-amber-50"
        )}
        onClick={() => router.push('/theater-tech/surgical-cases?status=READY_FOR_WARD_PREP,IN_WARD_PREP,READY_FOR_THEATER_BOOKING')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Coordination</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{stats.readyForPrep}</div>
            <p className="text-xs text-muted-foreground mt-1">Cases in ward prep or ready for booking</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            stats.inPrep > 0 && "border-amber-400 bg-amber-50"
          )}
          onClick={() => router.push('/theater-tech/dayboard?status=IN_PREP')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Preparation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">{stats.inPrep}</div>
            <p className="text-xs text-muted-foreground mt-1">Cases in pre-op</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            stats.inTheater > 0 && "border-red-400 bg-red-50"
          )}
          onClick={() => router.push('/theater-tech/dayboard?status=IN_THEATER')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Theater</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.inTheater}</div>
            <p className="text-xs text-muted-foreground mt-1">Active surgeries</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-md"
          onClick={() => router.push('/theater-tech/dayboard?status=RECOVERY')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Recovery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{stats.recovery}</div>
            <p className="text-xs text-muted-foreground mt-1">Post-operative</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start h-11"
              onClick={() => router.push('/theater-tech/dayboard')}
            >
              <LayoutDashboard className="h-4 w-4 mr-3" />
              <span className="flex-1 text-left">Operations Dayboard</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-11"
              onClick={() => router.push('/theater-tech/patients')}
            >
              <Users className="h-4 w-4 mr-3" />
              <span className="flex-1 text-left">New Surgical Case</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-11"
              onClick={() => router.push('/theater-tech/consultations')}
            >
              <Stethoscope className="h-4 w-4 mr-3" />
              <span className="flex-1 text-left">From Consultations</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-11"
              onClick={() => router.push('/theater-tech/surgical-cases')}
            >
              <ClipboardList className="h-4 w-4 mr-3" />
              <span className="flex-1 text-left">All Cases</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-11"
              onClick={() => router.push('/theater-tech/inventory/items')}
            >
              <Package className="h-4 w-4 mr-3" />
              <span className="flex-1 text-left">Inventory</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Cases</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/theater-tech/surgical-cases')}
              >
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentCases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Scissors className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No surgical cases yet</p>
                <Button 
                  variant="link" 
                  className="mt-2"
                  onClick={() => router.push('/theater-tech/patients')}
                >
                  Create your first case
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentCases.map((caseItem) => {
                  const statusCfg = STATUS_CONFIG[caseItem.status] || { 
                    label: caseItem.status, 
                    className: 'border border-slate-200 bg-slate-100 text-slate-700' 
                  };
                  return (
                    <div
                      key={caseItem.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleCaseClick(caseItem.id, caseItem.status)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {caseItem.patient.first_name} {caseItem.patient.last_name}
                          </p>
                          {caseItem.patient.file_number && (
                            <span className="text-xs font-mono text-muted-foreground">
                              #{caseItem.patient.file_number}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {caseItem.procedure_name || 'No procedure specified'} •{' '}
                          Dr. {caseItem.primary_surgeon?.name || '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-normal", statusCfg.className)}>
                          {statusCfg.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-all"
          onClick={() => router.push('/theater-tech/surgical-cases?status=DRAFT,PLANNING')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-slate-500" />
              <span className="text-sm text-muted-foreground">Draft/Planning</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.draft + stats.planning}</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-all"
          onClick={() => router.push('/theater-tech/surgical-cases?status=READY_FOR_THEATER_BOOKING,SCHEDULED')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-slate-500" />
              <span className="text-sm text-muted-foreground">Booking</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.scheduled}</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-all"
          onClick={() => router.push('/theater-tech/surgical-cases?status=IN_PREP')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-sm text-muted-foreground">In Prep</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.inPrep}</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-all"
          onClick={() => router.push('/theater-tech/surgical-cases?status=IN_THEATER')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">In Theater</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.inTheater}</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-all"
          onClick={() => router.push('/theater-tech/surgical-cases?status=COMPLETED')}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
