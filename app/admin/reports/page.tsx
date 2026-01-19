'use client';

/**
 * Admin Reports Page
 * 
 * Generate and view reports:
 * - Daily/weekly/monthly reports
 * - Patient and staff statistics
 * - Audit logs
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { adminApi } from '@/lib/api/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, FileText, Download, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { GenerateReportDto } from '@/lib/api/admin';

export default function AdminReportsPage() {
  const { user, isAuthenticated } = useAuth();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadAuditLogs();
    }
  }, [isAuthenticated, user]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAuditLogs(50, 0);

      if (response.success && response.data) {
        setAuditLogs(response.data);
      } else if (!response.success) {
        toast.error(response.error || 'Failed to load audit logs');
      } else {
        toast.error('Failed to load audit logs');
      }
    } catch (error) {
      toast.error('An error occurred while loading audit logs');
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);

    try {
      const dto: GenerateReportDto = {
        reportType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        includePatients: true,
        includeStaff: true,
        includeAppointments: true,
      };

      const response = await adminApi.generateReport(dto);

      if (response.success && response.data) {
        toast.success('Report generated successfully');
        // In a real app, this would download the report file
        console.log('Report data:', response.data);
      } else if (!response.success) {
        toast.error(response.error || 'Failed to generate report');
      } else {
        toast.error('Failed to generate report');
      }
    } catch (error) {
      toast.error('An error occurred while generating report');
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view reports</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="mt-2 text-muted-foreground">Generate reports and view audit logs</p>
      </div>

      {/* Generate Report */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
          <CardDescription>Create custom reports for patients, staff, and appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="reportType">Report Type</Label>
                <select
                  id="reportType"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={handleGenerateReport} disabled={generating}>
              {generating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Logs</CardTitle>
          <CardDescription>System activity and user actions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading audit logs...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No audit logs found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{log.action || 'Action'}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>User: {log.userId || 'N/A'}</span>
                        <span>•</span>
                        <span>Model: {log.model || 'N/A'}</span>
                        {log.recordId && (
                          <>
                            <span>•</span>
                            <span>Record: {log.recordId}</span>
                          </>
                        )}
                      </div>
                      {log.details && (
                        <p className="text-xs text-muted-foreground">{log.details}</p>
                      )}
                      {log.createdAt && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
