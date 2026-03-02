/**
 * Loading State Component
 * 
 * Standardized loading display for surgical plan feature.
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

interface LoadingStateProps {
  variant?: 'default' | 'minimal';
}

export function LoadingState({ variant = 'default' }: LoadingStateProps) {
  if (variant === 'minimal') {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-8">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
