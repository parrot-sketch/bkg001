/**
 * Quick Action Button Component
 * 
 * Reusable button for dashboard quick actions.
 * Uses unified professional slate theme.
 */

import Link from 'next/link';

interface QuickActionBtnProps {
  href?: string;
  icon?: React.ElementType;
  label: string;
  hasPulse?: boolean;
  onClick?: () => void;
}

export function QuickActionBtn({
  href,
  icon: Icon,
  label,
  hasPulse = false,
  onClick,
}: QuickActionBtnProps): React.ReactElement {
  const content = (
    <div className="flex items-center gap-3 px-3 py-2 transition-colors cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-b-0">
      {Icon ? (
        <div className="shrink-0">
          <Icon className="h-4 w-4 text-slate-400" />
        </div>
      ) : null}
      <span className="text-sm font-medium text-slate-800">{label}</span>
      {hasPulse && <span className="ml-auto h-2 w-2 rounded-full bg-slate-400 animate-pulse" />}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return <div onClick={onClick}>{content}</div>;
}
