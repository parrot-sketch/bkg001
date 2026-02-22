/**
 * Component: DayboardCaseCard
 *
 * Displays a single surgical case card with status, patient info, actions, and blockers.
 */

import { format, parseISO } from 'date-fns';
import {
  Activity,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Stethoscope,
  Timer,
  Wrench,
  Play,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { DayboardCaseDto } from '@/application/dtos/TheaterTechDtos';
import { STATUS_CONFIG, computePrimaryCta, computeBlockerLevel } from '@/lib/theater-tech/dayboardHelpers';
import { BlockerIndicator } from './BlockerIndicator';
import { BlockerChips } from './BlockerChips';

interface DayboardCaseCardProps {
  caseData: DayboardCaseDto;
  onTransition: (action: string, label: string) => void;
  onChecklist: (phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT') => void;
  onViewBlockers: () => void;
  onTimeline: () => void;
}

const NEXT_ACTION_ICONS: Record<string, typeof Wrench> = {
  IN_PREP: Wrench,
  IN_THEATER: Play,
  RECOVERY: Heart,
  COMPLETED: CheckCircle2,
};

export function DayboardCaseCard({
  caseData,
  onTransition,
  onChecklist,
  onViewBlockers,
  onTimeline,
}: DayboardCaseCardProps) {
  const statusCfg = STATUS_CONFIG[caseData.status] || STATUS_CONFIG.SCHEDULED;
  const StatusIcon = statusCfg.icon;
  const nextAction = computePrimaryCta(caseData);
  const blockers = caseData.blockers;
  const blockerLevel = computeBlockerLevel(blockers);

  const startTime = format(parseISO(caseData.booking.startTime), 'HH:mm');
  const endTime = format(parseISO(caseData.booking.endTime), 'HH:mm');

  return (
    <Card className="overflow-hidden hover:shadow-sm transition-shadow border-slate-200">
      <CardContent className="p-0">
        <div className="flex">
          {/* Left accent bar */}
          <div
            className={cn(
              'w-1 shrink-0',
              blockerLevel === 'blocked'
                ? 'bg-red-500'
                : blockerLevel === 'warning'
                ? 'bg-amber-400'
                : 'bg-emerald-500'
            )}
          />

          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-3">
              {/* Left: Patient + Case Info */}
              <div className="flex-1 min-w-0">
                {/* Status + Urgency + Time */}
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] font-semibold px-2 py-0.5', statusCfg.bg, statusCfg.color)}
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusCfg.label}
                  </Badge>
                  {caseData.urgency !== 'ELECTIVE' && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {caseData.urgency}
                    </Badge>
                  )}
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {startTime} – {endTime}
                  </span>
                  {caseData.estimatedDurationMinutes && (
                    <span className="text-[10px] text-muted-foreground">
                      ({caseData.estimatedDurationMinutes}min)
                    </span>
                  )}
                </div>

                {/* Patient */}
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {caseData.patient.fullName}
                  </p>
                  {caseData.patient.fileNumber && (
                    <span className="text-[11px] text-muted-foreground">
                      #{caseData.patient.fileNumber}
                    </span>
                  )}
                  {caseData.patient.hasAllergies && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 border-red-300 text-red-600 bg-red-50"
                        >
                          ALLERGY
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Patient has documented allergies — check chart</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Procedure */}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {caseData.procedureName || 'Procedure TBD'}
                  {caseData.side && ` — ${caseData.side}`}
                </p>

                {/* Surgeon */}
                <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground">
                  <Stethoscope className="h-3 w-3" />
                  <span>{caseData.primarySurgeon.name}</span>
                </div>
              </div>

              {/* Right: Actions + Checklist */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* WHO Checklist chips */}
                <div className="flex items-center gap-1">
                  {(['SIGN_IN', 'TIME_OUT', 'SIGN_OUT'] as const).map((phase) => {
                    const phaseKey =
                      phase === 'SIGN_IN'
                        ? 'signInCompleted'
                        : phase === 'TIME_OUT'
                        ? 'timeOutCompleted'
                        : 'signOutCompleted';
                    const completed = caseData.checklist[phaseKey as keyof typeof caseData.checklist];
                    const label = phase === 'SIGN_IN' ? 'SI' : phase === 'TIME_OUT' ? 'TO' : 'SO';

                    return (
                      <Tooltip key={phase}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onChecklist(phase)}
                            className={cn(
                              'h-7 px-2 rounded-md text-[10px] font-bold border transition-colors',
                              completed
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-white border-slate-200 text-slate-400 hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700'
                            )}
                          >
                            {completed ? (
                              <CheckCircle2 className="h-3 w-3 inline mr-0.5" />
                            ) : (
                              <ClipboardCheck className="h-3 w-3 inline mr-0.5" />
                            )}
                            {label}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            {completed
                              ? `View ${phase.replace(/_/g, '-')} checklist`
                              : `Complete ${phase.replace(/_/g, '-')}`}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>

                {/* Timeline button — visible for active cases */}
                {['IN_PREP', 'IN_THEATER', 'RECOVERY', 'COMPLETED'].includes(caseData.status) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={onTimeline}
                        className={cn(
                          'h-7 px-2.5 rounded-md text-[10px] font-bold border transition-colors',
                          caseData.timeline &&
                            (caseData.timeline.wheelsIn || caseData.timeline.incisionTime)
                            ? 'bg-cyan-50 border-cyan-300 text-cyan-700 hover:bg-cyan-100'
                            : 'bg-white border-slate-200 text-slate-400 hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700'
                        )}
                      >
                        <Timer className="h-3 w-3 inline mr-0.5" />
                        Timeline
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Operative timeline timestamps</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Primary CTA */}
                {nextAction && (
                  <Button
                    size="sm"
                    className="text-xs h-8 min-w-[120px]"
                    onClick={() => onTransition(nextAction.action, nextAction.label)}
                  >
                    {(() => {
                      const Icon = NEXT_ACTION_ICONS[nextAction.action] || Wrench;
                      return <Icon className="h-3 w-3 mr-1.5" />;
                    })()}
                    {nextAction.label}
                  </Button>
                )}

                {caseData.status === 'COMPLETED' && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-slate-100 text-slate-600"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
                    Done
                  </Badge>
                )}
              </div>
            </div>

            {/* ── Blockers Panel ── */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BlockerIndicator blockers={blockers} />
                  <BlockerChips blockers={blockers} status={caseData.status} timeline={caseData.timeline} />
                </div>
                <button
                  onClick={onViewBlockers}
                  className="text-[10px] text-muted-foreground hover:text-slate-600 transition-colors"
                >
                  Details →
                </button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
