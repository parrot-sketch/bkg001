import type { ReactNode } from 'react';
import Image from 'next/image';
import { Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function IntakeLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-[0_0_0_1px_rgba(202,162,106,0.45)]">
        <Image src="/logo.png" alt="" width={36} height={36} className="h-full w-full object-contain" priority />
      </div>
      <div className="leading-tight">
        <p className="text-[15px] font-semibold tracking-tight text-[#2c2e4b]">Nairobi Sculpt</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b8913e]">Aesthetic Centre</p>
      </div>
    </div>
  );
}

export function IntakeTrustFooter({ className }: { className?: string }) {
  return (
    <p className={cn('flex items-center justify-center gap-1.5 text-xs text-[#2c2e4b]/45', className)}>
      <ShieldCheck className="h-3.5 w-3.5 text-[#caa26a]" />
      Your details are private and shared only with your care team.
    </p>
  );
}

interface IntakeStatusScreenProps {
  icon: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'error';
  title: string;
  message: ReactNode;
  action?: { href: string; label: string };
  footnote?: ReactNode;
  children?: ReactNode;
}

const toneStyles: Record<NonNullable<IntakeStatusScreenProps['tone']>, string> = {
  neutral: 'bg-[#e7d6bf]/40 text-[#2c2e4b]',
  success: 'bg-[#caa26a] text-white',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red-50 text-red-600',
};

/** Full-screen, centred message used for loading, expiry, errors and success. */
export function IntakeStatusScreen({
  icon,
  tone = 'neutral',
  title,
  message,
  action,
  footnote,
  children,
}: IntakeStatusScreenProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f7f4ef]">
      <header className="flex justify-center border-b border-[#e7d6bf]/70 bg-white px-5 py-4">
        <IntakeLogo />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <div className={cn('mb-6 flex h-20 w-20 items-center justify-center rounded-full', toneStyles[tone])}>
          {icon}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#2c2e4b]">{title}</h1>
        <div className="mt-3 text-[15px] leading-relaxed text-[#2c2e4b]/65">{message}</div>
        {children}
        {action && (
          <a
            href={action.href}
            className="mt-8 flex h-14 w-full items-center justify-center rounded-2xl bg-[#2c2e4b] text-base font-semibold text-white shadow-sm transition active:scale-[0.99]"
          >
            {action.label}
          </a>
        )}
        {footnote && <p className="mt-4 text-sm text-[#2c2e4b]/45">{footnote}</p>}
      </main>
      <footer className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <IntakeTrustFooter />
      </footer>
    </div>
  );
}

export function IntakeLoadingScreen({ message }: { message: string }) {
  return (
    <IntakeStatusScreen
      icon={<Loader2 className="h-8 w-8 animate-spin text-[#caa26a]" />}
      title="One moment"
      message={message}
    />
  );
}
