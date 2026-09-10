import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Page chrome for nurse shell (dark branded background).
 * Titles/descriptions use light text so they stay readable outside white cards/tables.
 */
export function NursePageHeader(props: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        props.className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
          {props.title}
        </h1>
        {props.description ? (
          <p className="text-sm text-white/65 mt-1">{props.description}</p>
        ) : null}
      </div>
      {props.actions ? (
        <div className="flex items-center gap-2 shrink-0">{props.actions}</div>
      ) : null}
    </div>
  );
}
