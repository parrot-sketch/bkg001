/**
 * Timeline Tab View
 * 
 * Presentational component for timeline tab (read-only).
 * No API calls, no parsing, no business logic.
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '../../shared/components/LoadingState';
import { ErrorState } from '../../shared/components/ErrorState';
import { Clock, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { TimelineTabViewModel } from './timelineMappers';

interface TimelineTabViewProps {
  // Data
  viewModel: TimelineTabViewModel | null;
  
  // Loading states
  isLoading: boolean;
  
  // Errors
  error: Error | null;
  
  // Actions
  onRetry: () => void;
}

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return 'Not recorded';
  try {
    return format(new Date(timestamp), 'MMM d, yyyy HH:mm');
  } catch {
    return 'Invalid date';
  }
}

export function TimelineTabView({
  viewModel,
  isLoading,
  error,
  onRetry,
}: TimelineTabViewProps) {
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (!viewModel) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium">No timeline data</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Operative Timeline</h3>
        <Badge variant="outline">{viewModel.caseStatus}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Timeline Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {viewModel.events.map((event) => (
              <div key={event.key} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  {event.isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{event.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTimestamp(event.timestamp)}
                    </p>
                  </div>
                </div>
                {event.isComplete && (
                  <Badge variant="default" className="bg-green-600">
                    Complete
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {Object.values(viewModel.durations).some((d) => d !== null) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Durations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {viewModel.durations.orTimeMinutes !== null && (
                <div>
                  <p className="text-muted-foreground">OR Time:</p>
                  <p className="font-medium">{viewModel.durations.orTimeMinutes} min</p>
                </div>
              )}
              {viewModel.durations.surgeryTimeMinutes !== null && (
                <div>
                  <p className="text-muted-foreground">Surgery Time:</p>
                  <p className="font-medium">{viewModel.durations.surgeryTimeMinutes} min</p>
                </div>
              )}
              {viewModel.durations.anesthesiaTimeMinutes !== null && (
                <div>
                  <p className="text-muted-foreground">Anesthesia Time:</p>
                  <p className="font-medium">{viewModel.durations.anesthesiaTimeMinutes} min</p>
                </div>
              )}
              {viewModel.durations.prepTimeMinutes !== null && (
                <div>
                  <p className="text-muted-foreground">Prep Time:</p>
                  <p className="font-medium">{viewModel.durations.prepTimeMinutes} min</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {viewModel.missingItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Missing Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {viewModel.missingItems.map((item, idx) => (
                <p key={idx} className="text-sm text-muted-foreground">
                  • {item.label}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
