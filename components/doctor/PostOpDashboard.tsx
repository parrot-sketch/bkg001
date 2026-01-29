'use client';

/**
 * Post-Op Monitoring Dashboard
 * 
 * Surgeons deeply care about outcomes. This dashboard shows:
 * - My recent surgeries
 * - Patients with pain issues
 * - Complications
 * - Missed follow-ups
 * - Red flags
 * - Quick access to patient thread
 * 
 * Improves patient safety and surgeon confidence.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Clock, FileText, AlertCircle, TrendingUp } from 'lucide-react';
import { format, isAfter, subDays } from 'date-fns';
import { OutcomeStatus, getOutcomeStatusLabel, getOutcomeStatusColor } from '@/domain/enums/OutcomeStatus';
import Link from 'next/link';

interface PostOpCase {
  appointment_id: number;
  patient_id: string;
  patient_name: string;
  procedure_type: string;
  surgery_date: Date;
  outcome_status?: OutcomeStatus;
  has_complications: boolean;
  missed_followup: boolean;
  pain_issues: boolean;
  days_since_surgery: number;
  next_followup?: Date;
}

interface PostOpDashboardProps {
  cases: PostOpCase[];
  loading?: boolean;
}

export function PostOpDashboard({ cases, loading = false }: PostOpDashboardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Post-Op Monitoring</CardTitle>
          <CardDescription>Track outcomes and complications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentCases = cases.filter(c => c.days_since_surgery <= 30).slice(0, 10);
  const complications = cases.filter(c => c.has_complications || c.outcome_status === OutcomeStatus.COMPLICATION);
  const missedFollowups = cases.filter(c => c.missed_followup);
  const painIssues = cases.filter(c => c.pain_issues);
  const redFlags = cases.filter(
    c => c.has_complications || c.missed_followup || c.pain_issues || c.outcome_status === OutcomeStatus.COMPLICATION
  );

  const stats = {
    total: cases.length,
    recent: recentCases.length,
    complications: complications.length,
    missedFollowups: missedFollowups.length,
    painIssues: painIssues.length,
    redFlags: redFlags.length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview - Refactored for better viewport distribution */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3">
        <StatCard
          title="Recent Surgeries"
          value={stats.recent}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Last 30 days"
        />
        <StatCard
          title="Red Flags"
          value={stats.redFlags}
          icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
          description="Need attention"
          variant={stats.redFlags > 0 ? 'destructive' : 'default'}
        />
        <StatCard
          title="Complications"
          value={stats.complications}
          icon={<AlertCircle className="h-4 w-4 text-orange-600" />}
          description="Active issues"
          variant={stats.complications > 0 ? 'destructive' : 'default'}
        />
        <StatCard
          title="Pain Issues"
          value={stats.painIssues}
          icon={<FileText className="h-4 w-4" />}
          description="Reported pain"
        />
        <StatCard
          title="Missed Follow-ups"
          value={stats.missedFollowups}
          icon={<Clock className="h-4 w-4" />}
          description="Overdue"
          variant={stats.missedFollowups > 0 ? 'destructive' : 'default'}
        />
        <StatCard
          title="Total Cases"
          value={stats.total}
          icon={<CheckCircle2 className="h-4 w-4" />}
          description="Tracked"
        />
      </div>

      {/* Red Flags - Most Important */}
      {redFlags.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Red Flags - Immediate Attention Required
            </CardTitle>
            <CardDescription>{redFlags.length} case{redFlags.length !== 1 ? 's' : ''} need your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {redFlags.map((case_) => (
                <RedFlagCase key={case_.appointment_id} case_={case_} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Surgeries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Surgeries</CardTitle>
          <CardDescription>Last 30 days - {recentCases.length} case{recentCases.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentCases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent surgeries in the last 30 days
            </div>
          ) : (
            <div className="space-y-3">
              {recentCases.map((case_) => (
                <PostOpCaseCard key={case_.appointment_id} case_={case_} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
  variant = 'default',
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
  variant?: 'default' | 'destructive';
}) {
  return (
    <Card className={variant === 'destructive' && value > 0 ? 'border-red-200 bg-red-50/50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={variant === 'destructive' && value > 0 ? 'text-red-600' : 'text-muted-foreground'}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variant === 'destructive' && value > 0 ? 'text-red-700' : ''}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function RedFlagCase({ case_: case_ }: { case_: PostOpCase }) {
  const issues: string[] = [];
  if (case_.has_complications) issues.push('Complications');
  if (case_.missed_followup) issues.push('Missed Follow-up');
  if (case_.pain_issues) issues.push('Pain Issues');
  if (case_.outcome_status === OutcomeStatus.COMPLICATION) issues.push('Complication Status');

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold">{case_.patient_name}</h4>
          <Badge variant="destructive" className="text-xs">
            {issues.join(', ')}
          </Badge>
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium">{case_.procedure_type}</span> • {case_.days_since_surgery} days post-op
          {case_.next_followup && (
            <>
              {' • '}
              Next follow-up: {format(case_.next_followup, 'MMM d, yyyy')}
            </>
          )}
        </div>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/doctor/post-op/${case_.appointment_id}`}>View</Link>
      </Button>
    </div>
  );
}

function PostOpCaseCard({ case_: case_ }: { case_: PostOpCase }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium">{case_.patient_name}</h4>
          {case_.outcome_status && (
            <Badge className={getOutcomeStatusColor(case_.outcome_status)}>
              {getOutcomeStatusLabel(case_.outcome_status)}
            </Badge>
          )}
          {case_.has_complications && (
            <Badge variant="destructive" className="text-xs">
              Complication
            </Badge>
          )}
          {case_.missed_followup && (
            <Badge variant="destructive" className="text-xs">
              Missed Follow-up
            </Badge>
          )}
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium">{case_.procedure_type}</span> • {format(case_.surgery_date, 'MMM d, yyyy')} ({case_.days_since_surgery} days ago)
          {case_.next_followup && (
            <>
              {' • '}
              Next: {format(case_.next_followup, 'MMM d')}
            </>
          )}
        </div>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/doctor/post-op/${case_.appointment_id}`}>View</Link>
      </Button>
    </div>
  );
}
