'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { adminApi } from '@/lib/api/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  UserCheck,
  Calendar,
  AlertCircle,
  TrendingUp,
  Activity,
  Package,
  Plus,
  ArrowUpRight,
  ClipboardList,
  Stethoscope,
  Scissors,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer 
} from 'recharts';

interface DashboardStats {
  totalPatients: number;
  totalStaff: number;
  totalDoctors: number;
  totalNurses: number;
  totalFrontdesk: number;
  appointmentsToday: number;
  appointmentsUpcoming: number;
  pendingPreOp: number;
  pendingPostOp: number;
  pendingApprovals: number;
}

interface RevenueSummary {
  totalBilled: number;
  totalCollected: number;
}

export default function AdminDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [appointmentTrends, setAppointmentTrends] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, trendsResponse, revenueResponse] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getAppointmentTrends(30),
        fetch('/api/payments/all').then(r => r.json()).catch(() => ({ success: false, data: { summary: { totalCollected: 0, totalBilled: 0 } } })),
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      } else {
        const errorMsg = statsResponse.success === false ? statsResponse.error : 'Unknown error';
        if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
            console.warn('Dashboard stats request rejected (401). Might be mid-auth.');
        } else {
            toast.error('Failed to sync dashboard intelligence: ' + errorMsg);
        }
      }

      if (trendsResponse.success && trendsResponse.data) {
        setAppointmentTrends(trendsResponse.data);
      }

      if (revenueResponse.success && revenueResponse.data?.summary) {
        setRevenue(revenueResponse.data.summary);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && isAuthenticated && user) {
      loadDashboardData();
    }
  }, [mounted, isAuthenticated, user]);

  if (isLoading || !mounted) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <Activity className="h-10 w-10 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-500">Initializing Executive Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Card className="max-w-md mx-auto mt-20 p-8 text-center border-slate-200 shadow-xl rounded-3xl">
        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <LockIcon className="h-8 w-8 text-slate-400" />
        </div>
        <CardTitle className="text-2xl mb-2 font-bold text-slate-900">Protected Session</CardTitle>
        <CardDescription className="mb-6">Please verify your credentials to access clinical operations.</CardDescription>
        <Link href="/login">
            <Button className="w-full rounded-xl py-6 font-bold shadow-lg shadow-primary/20">Sign In to Dashboard</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Overview Headings and Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Operations Control</h2>
          <p className="text-slate-500 font-medium">Real-time overview of Nairobi Sculpt clinical metrics</p>
        </div>
        <div className="flex items-center gap-2">
            <Link href="/admin/appointments">
                <Button className="rounded-xl shadow-lg shadow-primary/10 border-slate-200" variant="outline">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    View Schedule
                </Button>
            </Link>
            <Link href="/admin/staff/new">
                <Button className="rounded-xl bg-slate-900 shadow-lg shadow-slate-900/10">
                    <Plus className="mr-2 h-4 w-4" />
                    Onboard Staff
                </Button>
            </Link>
        </div>
      </div>

      {/* Top Ledger: Executive Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
            title="Surgical Volume" 
            value={stats?.appointmentsToday ?? 0}
            subtext={`${stats?.appointmentsUpcoming ?? 0} cases pending`}
            trend="+12%"
            variant="indigo"
        />
        <MetricCard 
            title="Active Patients" 
            value={stats?.totalPatients ?? 0}
            subtext="Lifetime registrations"
            variant="sky"
        />
        <MetricCard 
            title="Revenue Ledger" 
            value={revenue ? `KSh ${(revenue.totalCollected / 1000000).toFixed(1)}M` : 'KSh --'}
            subtext="Total collected"
            trend={revenue && revenue.totalBilled > 0 ? `${Math.round((revenue.totalCollected / revenue.totalBilled) * 100)}%` : undefined}
            variant="emerald"
        />
        <MetricCard 
            title="Safety Alerts" 
            value={ (stats?.pendingPreOp ?? 0) + (stats?.pendingPostOp ?? 0) }
            subtext="Pre/Post care tasks"
            variant="rose"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Main Analytics: Volume Trends */}
        <Card className="lg:col-span-4 border-slate-200/60 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="text-lg font-bold">Patient Throughput</CardTitle>
                <CardDescription>Appointment volume across the last 30 days</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold px-3 py-1">Last 30 Days</Badge>
          </CardHeader>
          <CardContent className="pt-4 h-[350px]">
            {loading ? (
                <div className="h-full flex items-center justify-center">
                    <Activity className="h-8 w-8 text-primary animate-pulse" />
                </div>
            ) : appointmentTrends.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <TrendingUp className="h-12 w-12 mb-2 opacity-20" />
                    <p className="text-sm font-medium">Historical volume baseline being established</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={appointmentTrends}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 10, fill: '#64748b'}}
                            tickFormatter={(str) => {
                                const date = new Date(str);
                                return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                            }}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                        <Tooltip 
                            contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                            labelStyle={{fontWeight: 'bold', marginBottom: '4px'}}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#0f172a" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorValue)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Operational Widgets: Staff & Inventory */}
        <div className="lg:col-span-3 space-y-6">
            {/* Inventory Pulse */}
            <Card className="border-slate-200/60 shadow-sm rounded-3xl">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Package className="h-5 w-5 text-indigo-500" />
                            Inventory Health
                        </CardTitle>
                        <Link href="/admin/inventory">
                            <Button variant="ghost" size="sm" className="text-xs font-bold text-slate-500 group">
                                Manage
                                <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-500/10 rounded-xl">
                                <AlertCircle className="h-5 w-5 text-rose-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 leading-none">Critical Low Stock</p>
                                <p className="text-xs text-rose-600 font-medium mt-1">Reconciliation required</p>
                            </div>
                        </div>
                        <Badge variant="destructive" className="font-bold">LOW</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Active Items</p>
                            <p className="text-xl font-bold text-slate-900 mt-1">115</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Suppliers</p>
                            <p className="text-xl font-bold text-slate-900 mt-1">12</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Staff Deployment */}
            <Card className="border-slate-200/60 shadow-sm rounded-3xl">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-sky-500" />
                        Staff Resilience
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <StaffRow label="Doctors" count={stats?.totalDoctors ?? 0} icon={Stethoscope} color="bg-indigo-500" />
                        <StaffRow label="Nurses" count={stats?.totalNurses ?? 0} icon={Activity} color="bg-sky-500" />
                        <StaffRow label="Service Admin" count={stats?.totalFrontdesk ?? 0} icon={Users} color="bg-emerald-500" />
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* Action Alerts */}
      <div className="grid gap-6 md:grid-cols-2">
          {/* Theater Occupancy (Mock for now, but in plan) */}
          <Card className="border-slate-200/60 shadow-sm rounded-3xl">
              <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">Theater Status</CardTitle>
                    <CardDescription>Real-time room availability</CardDescription>
                  </div>
                  <Link href="/admin/theaters">
                    <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs h-8">Full Schedule</Button>
                  </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                  <TheaterStatusRow name="Theater 1 (Main)" status="AVAILABLE" info="Ready for next case" />
                  <TheaterStatusRow name="Theater 2 (Minor)" status="OCCUPIED" info="Rhinoplasty in progress" />
                  <TheaterStatusRow name="Procedure Room" status="CLEANING" info="Next ready in 15m" />
              </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card className="border-slate-200/60 shadow-sm rounded-3xl">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-amber-500" />
                        Compliance & Access
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {stats && stats.pendingApprovals > 0 ? (
                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <UserIcon className="h-10 w-10 text-amber-600 bg-amber-100 rounded-full p-2" />
                                <div>
                                    <p className="text-sm font-bold text-slate-900 leading-none">{stats.pendingApprovals} Pending Approvals</p>
                                    <p className="text-xs text-amber-600 font-medium mt-1">Awaiting registration review</p>
                                </div>
                            </div>
                            <Link href="/admin/patients?status=PENDING">
                                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 font-bold rounded-xl h-9">Review</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <ShieldCheck className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                            <p className="text-sm font-bold text-slate-400">All security queues cleared</p>
                        </div>
                    )}
                </CardContent>
          </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Internal Components
// ============================================================================

function MetricCard({ title, value, subtext, trend, variant }: { title: string, value: string | number, subtext: string, trend?: string, variant: 'indigo' | 'sky' | 'emerald' | 'rose' }) {
    const variants = {
        indigo: 'text-indigo-600',
        sky: 'text-sky-600',
        emerald: 'text-emerald-600',
        rose: 'text-rose-600',
    };

    return (
        <Card className="border-slate-200/60 rounded-3xl transition-all hover:bg-slate-50/50 group relative overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold tracking-tight text-slate-900">{value}</div>
                    {trend && (
                        <div className="flex items-center text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                            <ArrowUpRight className="h-3 w-3 mr-0.5" />
                            {trend}
                        </div>
                    )}
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">{subtext}</p>
            </CardContent>
        </Card>
    );
}

function StaffRow({ label, count, icon: Icon, color }: { label: string, count: number, icon: any, color: string }) {
    return (
        <div className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-110", color)}>
                    <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-bold text-slate-700">{label}</span>
            </div>
            <span className="text-lg font-bold text-slate-900">{count}</span>
        </div>
    );
}

function TheaterStatusRow({ name, status, info }: { name: string, status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING', info: string }) {
    const statusConfig = {
        AVAILABLE: { color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
        OCCUPIED: { color: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50', dot: 'bg-rose-500' },
        CLEANING: { color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
    };

    const config = statusConfig[status];

    return (
        <div className="flex items-center justify-between p-3 border border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">{name}</span>
                <span className="text-[10px] text-slate-500 font-medium">{info}</span>
            </div>
            <div className={cn("px-2.5 py-1 rounded-full flex items-center gap-1.5 ring-1 ring-inset ring-slate-200", config.bg)}>
                <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", config.dot)} />
                <span className={cn("text-[10px] font-bold uppercase tracking-wider", config.text)}>{status}</span>
            </div>
        </div>
    );
}

function LockIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    )
}

function ShieldCheck(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}

function UserIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}
