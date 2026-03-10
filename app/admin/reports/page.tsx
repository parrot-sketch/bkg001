'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useAuditLogs, useGenerateReport } from '@/hooks/reports/useAdminReports';
import { 
  FileText, Download, Clock, BarChart3, Users, CalendarCheck, ShieldAlert,
  Loader2, Filter, ChevronLeft, ChevronRight, Activity, Database
} from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { GenerateReportDto } from '@/lib/api/admin';

export default function AdminReportsPage() {
  const { user, isAuthenticated } = useAuth();
  
  // Audit Logs Pagination
  const [page, setPage] = useState(1);
  const limit = 20;
  const offset = (page - 1) * limit;

  // Hooks
  const { data: logsData, isLoading: logsLoading } = useAuditLogs(limit, offset, isAuthenticated && !!user);
  const { mutateAsync: generateReport, isPending: generating } = useGenerateReport();

  // Report Generator State
  const [reportType, setReportType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [reportResult, setReportResult] = useState<any | null>(null);

  // Default dates
  const today = new Date();
  const [startDate, setStartDate] = useState<string>(today.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(today.toISOString().split('T')[0]);

  const handleTypeChange = (type: 'DAILY' | 'WEEKLY' | 'MONTHLY') => {
    setReportType(type);
    const end = new Date();
    let start = new Date();
    if (type === 'DAILY') start = subDays(end, 1);
    if (type === 'WEEKLY') start = subDays(end, 7);
    if (type === 'MONTHLY') start = subMonths(end, 1);
    
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  const handleGenerateClick = async () => {
    try {
      const dto: GenerateReportDto = {
        reportType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        includePatients: true,
        includeStaff: true,
        includeAppointments: true,
      };

      const result = await generateReport(dto);
      setReportResult(result);
      toast.success(`${reportType} analytical report generated.`);
    } catch (error) {
      toast.error('Failed to generate report');
    }
  };

  const downloadMockReport = () => {
    if (!reportResult) return;
    const jsonStr = JSON.stringify(reportResult, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sys-report-${reportType.toLowerCase()}-${format(new Date(), 'yyyyMMdd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report downloaded (JSON)');
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-slate-300 animate-spin" />
      </div>
    );
  }

  const logs = logsData?.data || [];
  const totalLogs = logsData?.meta?.total || 0;
  const totalPages = Math.ceil(totalLogs / limit);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Analytics & Audit</h2>
        <p className="text-slate-500 font-medium">Generate metric reports and monitor system activity</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Report Generator */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Report Generator</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Custom parameters</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Period Type</Label>
                  <div className="flex bg-slate-100 p-1.5 rounded-xl">
                    {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => handleTypeChange(type)}
                        className={cn(
                          'flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize',
                          reportType === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                        )}
                      >
                        {type.toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 font-medium text-slate-700 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 font-medium text-slate-700 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleGenerateClick}
                  disabled={generating}
                  className="w-full h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/10"
                >
                  {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  {generating ? 'Compiling Data...' : 'Generate New Report'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Display */}
          {reportResult && (
            <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden border-indigo-100 bg-indigo-50/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-slate-900">Insight Results</h3>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">
                      {format(new Date(reportResult.startDate), 'MMM d')} - {format(new Date(reportResult.endDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Button
                    onClick={downloadMockReport}
                    variant="outline" size="icon"
                    className="h-9 w-9 rounded-xl bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center"><Users className="h-4 w-4 text-blue-600" /></div>
                      <span className="text-sm font-bold text-slate-700">New Patients</span>
                    </div>
                    <span className="text-lg font-black text-slate-900">{reportResult.patients?.total || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center"><CalendarCheck className="h-4 w-4 text-emerald-600" /></div>
                      <span className="text-sm font-bold text-slate-700">Appointments</span>
                    </div>
                    <span className="text-lg font-black text-slate-900">{reportResult.appointments?.total || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center"><ShieldAlert className="h-4 w-4 text-violet-600" /></div>
                      <span className="text-sm font-bold text-slate-700">Staff Joined</span>
                    </div>
                    <span className="text-lg font-black text-slate-900">{reportResult.staff?.total || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Audit Logs */}
        <div className="lg:col-span-2">
          <Card className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden h-full flex flex-col pt-0">
            <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center">
                  <Database className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">System Activity Stream</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live audit logs</p>
                </div>
              </div>
              <Badge variant="outline" className="rounded-lg font-bold bg-slate-50 text-slate-500 border-slate-200 px-3 py-1">
                {totalLogs.toLocaleString()} Events Maintained
              </Badge>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50/30">
              <Table>
                <TableHeader className="bg-white sticky top-0 shadow-sm z-10 hidden md:table-header-group">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="h-11 pl-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamp</TableHead>
                    <TableHead className="h-11 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Event</TableHead>
                    <TableHead className="h-11 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entity</TableHead>
                    <TableHead className="h-11 pr-6 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-[400px] text-center">
                        <Loader2 className="h-6 w-6 text-slate-300 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-[400px] text-center">
                        <Activity className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-400 font-medium">No system activity recorded.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log: any) => (
                      <TableRow key={log.id} className="group border-slate-100 hover:bg-white transition-colors">
                        <TableCell className="pl-6 py-4 align-top">
                          <p className="text-sm font-bold text-slate-700 leading-none">
                            {format(new Date(log.createdAt), 'MMM dd')}
                          </p>
                          <div className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-slate-400">
                            <Clock className="h-3 w-3" />
                            {format(new Date(log.createdAt), 'HH:mm:ss')}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 align-top">
                          <p className={cn(
                            'text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block mb-1.5',
                            log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-600' :
                            log.action === 'UPDATE' ? 'bg-amber-50 text-amber-600' :
                            log.action === 'DELETE' ? 'bg-rose-50 text-rose-600' :
                            'bg-indigo-50 text-indigo-600'
                          )}>
                            {log.action}
                          </p>
                          {log.details && (
                            <p className="text-xs font-medium text-slate-500 leading-relaxed max-w-[280px]">
                              {log.details}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="py-4 align-top">
                          <p className="text-sm font-bold text-slate-700">{log.model || 'System'}</p>
                          {log.recordId && (
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">ID: {log.recordId}</p>
                          )}
                        </TableCell>
                        <TableCell className="pr-6 py-4 align-top text-right">
                          <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                            {log.user?.role || 'AUTO'}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" size="sm"
                    className="h-8 rounded-lg font-bold border-slate-200 text-slate-600"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || logsLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="h-8 rounded-lg font-bold border-slate-200 text-slate-600"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || logsLoading}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
