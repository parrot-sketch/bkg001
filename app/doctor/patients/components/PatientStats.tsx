'use client';

/**
 * PatientStats
 *
 * Four summary stat cards for the doctor's patient roster.
 * - Each card acts as an interactive filter shortcut.
 * - Separate `loading` prop so cards can shimmer independently of the list.
 */

import { cn } from '@/lib/utils';
import { Users, UserPlus, AlertTriangle, Stethoscope } from 'lucide-react';

interface StatCard {
  label:   string;
  value:   number;
  icon:    React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  accentColor: string;
}

export type ActiveStatCardType = 'total' | 'new' | 'allergies' | 'conditions' | null;

interface PatientStatsProps {
  stats: {
    total:          number;
    newThisMonth:   number;
    withAllergies:  number;
    withConditions: number;
  };
  loading:          boolean;
  /** Which stat card is currently active (highlighted) */
  activeCard?:      ActiveStatCardType;
  onTotalFilter?:     () => void;
  onNewFilter?:       () => void;
  onAllergyFilter?:   () => void;
  onConditionsFilter?: () => void;
}

function StatCardSkeleton() {
  return (
    <div className="border border-white/10 bg-white/5 rounded-xl px-4 py-3 animate-pulse">
      <div className="h-6 w-10 bg-white/10 rounded mb-2" />
      <div className="h-3 w-20 bg-white/8 rounded" />
    </div>
  );
}

function StatCardItem({
  label, value, icon, active, onClick, accentColor,
}: StatCard) {
  const isClickable = !!onClick;
  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick?.() : undefined}
      className={cn(
        'relative border rounded-xl px-4 py-3 transition-all duration-200',
        isClickable && 'cursor-pointer select-none',
        active
          ? `border-[${accentColor}]/50 bg-[${accentColor}]/10 ring-1 ring-[${accentColor}]/30`
          : 'border-white/10 bg-white/5',
        isClickable && !active && 'hover:border-white/20 hover:bg-white/8',
      )}
    >
      {/* Icon in top-right */}
      <div className={cn(
        'absolute top-3 right-3 opacity-30',
        active && 'opacity-60',
      )}>
        {icon}
      </div>

      <div className={cn(
        'text-2xl font-bold tabular-nums leading-none',
        active ? 'text-white' : 'text-white/90',
      )}>
        {value}
      </div>
      <div className={cn(
        'mt-1.5 text-[10px] font-semibold uppercase tracking-wider',
        active ? 'text-white/90' : 'text-white/70',
      )}>
        {label}
      </div>

      {/* Active indicator dot */}
      {active && (
        <span className="absolute bottom-2 right-2.5 h-1.5 w-1.5 rounded-full bg-[#caa26a]" />
      )}
    </div>
  );
}

export function PatientStats({
  stats,
  loading,
  activeCard,
  onTotalFilter,
  onNewFilter,
  onAllergyFilter,
  onConditionsFilter,
}: PatientStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  const cards: StatCard[] = [
    {
      label:       'Total patients',
      value:       stats.total,
      icon:        <Users className="h-4 w-4 text-white" />,
      active:      activeCard === 'total',
      onClick:     onTotalFilter,
      accentColor: '#caa26a',
    },
    {
      label:       'New this month',
      value:       stats.newThisMonth,
      icon:        <UserPlus className="h-4 w-4 text-emerald-400" />,
      active:      activeCard === 'new',
      onClick:     onNewFilter,
      accentColor: '#34d399',
    },
    {
      label:       'With allergies',
      value:       stats.withAllergies,
      icon:        <AlertTriangle className="h-4 w-4 text-rose-400" />,
      active:      activeCard === 'allergies',
      onClick:     onAllergyFilter,
      accentColor: '#f87171',
    },
    {
      label:       'Medical conditions',
      value:       stats.withConditions,
      icon:        <Stethoscope className="h-4 w-4 text-amber-400" />,
      active:      activeCard === 'conditions',
      onClick:     onConditionsFilter,
      accentColor: '#fbbf24',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {cards.map((card) => (
        <StatCardItem key={card.label} {...card} />
      ))}
    </div>
  );
}
