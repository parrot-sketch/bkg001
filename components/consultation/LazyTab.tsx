'use client';

/**
 * Lazy Tab Component
 * 
 * Wraps tab content with lazy loading and suspend behavior.
 * Only mounts the content when the tab becomes active for the first time.
 * Keeps content mounted after first activation to preserve state.
 * 
 * Performance benefits:
 * - Rich text editors only load when needed
 * - Reduces initial bundle size
 * - Faster time-to-interactive
 */

import { Suspense, useState, useEffect, memo, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LazyTabProps {
  /** Is this tab currently active */
  isActive: boolean;
  /** Tab content to render */
  children: ReactNode;
  /** Optional loading fallback */
  fallback?: ReactNode;
  /** Keep mounted after first activation (default: true) */
  keepMounted?: boolean;
  /** Additional className */
  className?: string;
}

const DefaultFallback = memo(function DefaultFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );
});

export function LazyTab({
  isActive,
  children,
  fallback,
  keepMounted = true,
  className,
}: LazyTabProps) {
  // Track if tab has ever been activated
  const [hasActivated, setHasActivated] = useState(false);
  
  useEffect(() => {
    if (isActive && !hasActivated) {
      setHasActivated(true);
    }
  }, [isActive, hasActivated]);
  
  // Don't render if never activated and keepMounted is true
  // Or don't render if not active and keepMounted is false
  const shouldRender = keepMounted ? hasActivated : isActive;
  
  if (!shouldRender) {
    return null;
  }
  
  return (
    <div
      className={cn(
        'transition-opacity duration-200',
        isActive ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none',
        className
      )}
      style={{ display: isActive ? 'block' : 'none' }}
    >
      <Suspense fallback={fallback || <DefaultFallback />}>
        {children}
      </Suspense>
    </div>
  );
}

/**
 * Hook to track tab activation state
 * Useful for triggering data fetching only when tab becomes active
 */
export function useTabActivation(isActive: boolean) {
  const [hasActivated, setHasActivated] = useState(false);
  const [activationCount, setActivationCount] = useState(0);
  
  useEffect(() => {
    if (isActive) {
      if (!hasActivated) {
        setHasActivated(true);
      }
      setActivationCount(prev => prev + 1);
    }
  }, [isActive, hasActivated]);
  
  return {
    hasActivated,
    activationCount,
    isFirstActivation: hasActivated && activationCount === 1,
  };
}
