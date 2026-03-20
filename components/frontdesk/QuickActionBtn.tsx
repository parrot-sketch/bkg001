/**
 * Quick Action Button Component
 * 
 * Reusable button for dashboard quick actions.
 * Uses unified professional slate theme.
 */

import Link from 'next/link';

interface QuickActionBtnProps {
  href?: string;
  icon: React.ElementType;
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
    <div className="flex items-center gap-3 p-2.5 rounded-lg transition-colors cursor-pointer hover:bg-slate-100">
      <div className="p-1.5 rounded-md bg-slate-100">
        <Icon className="h-4 w-4 text-slate-600" />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {hasPulse && <span className="ml-auto h-2 w-2 rounded-full bg-slate-400 animate-pulse" />}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return <div onClick={onClick}>{content}</div>;
}
