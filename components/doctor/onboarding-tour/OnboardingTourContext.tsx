'use client';

/**
 * Onboarding Tour Engine
 *
 * A global, tooltip-driven guided tour for first-time doctors.
 * - Uses getBoundingClientRect to locate DOM anchor elements
 * - Renders a semi-transparent spotlight overlay that cuts out the target area
 * - Displays a premium floating tooltip card with step controls
 * - Persists the active step to localStorage so the tour resumes on reload
 * - Cross-page: the tour advances when the correct page + element is in the DOM
 */

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { X, ArrowRight, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';

// ─── Step Definitions ─────────────────────────────────────────────────────────

export type TourStepId =
    | 'welcome'
    | 'goto-profile'
    | 'edit-profile'
    | 'billing'
    | 'account-settings'
    | 'goto-schedule'
    | 'weekly-hours'
    | 'slot-config'
    | 'complete';

interface TourStep {
    id: TourStepId;
    /** Pathname required for this step to be visible */
    path: string;
    /** DOM element id to anchor the tooltip to (null = centered modal) */
    targetId: string | null;
    /** Which side of the target to place the tooltip */
    placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
    /**
     * Rendering mode:
     * - overlay: spotlight + tooltip (may visually block/obscure UI)
     * - subtle:  small non-blocking coach card (no backdrop/spotlight)
     */
    ui?: 'overlay' | 'subtle';
    title: string;
    body: string;
    /** Label for the primary action */
    nextLabel: string;
    /** If set, clicking Next navigates to this path before advancing */
    navigateTo?: string;
    /** Step advances automatically when the target element appears (used after page nav) */
    waitForElement?: boolean;
}

export const TOUR_STEPS: TourStep[] = [
    {
        id: 'welcome',
        path: '/doctor/dashboard',
        targetId: null,
        placement: 'center',
        title: 'Welcome to Tibaflow 👋',
        body: "Let's get your account set up in 3 quick steps: fill out your clinical profile, set your consultation fee, and configure your weekly schedule. This tour will guide you through each one.",
        nextLabel: 'Start Setup',
    },
    {
        id: 'goto-profile',
        path: '/doctor/dashboard',
        targetId: 'tour-profile-link-dashboard',
        placement: 'bottom',
        title: 'Step 1 — Your Profile',
        body: "Click here to open your Profile page. You'll add your specialization, clinic location, and other key details so patients and staff know who you are.",
        nextLabel: 'Go to Profile',
        navigateTo: '/doctor/profile',
    },
    {
        id: 'edit-profile',
        path: '/doctor/profile',
        targetId: 'tour-edit-profile-btn',
        placement: 'bottom',
        title: 'Edit Your Clinical Identity',
        body: 'Click Edit to add your specialization, room/clinic location, bio, and professional credentials. This information appears on every patient record you touch.',
        nextLabel: 'Next',
    },
    {
        id: 'billing',
        path: '/doctor/profile',
        targetId: 'tour-billing-card',
        placement: 'top',
        title: 'Set Your Consultation Fee',
        body: 'Enter your default consultation fee (KSH) here. It will be automatically applied to the charge sheet whenever you complete a patient consultation.',
        nextLabel: 'Next',
    },
    {
        id: 'account-settings',
        path: '/doctor/profile',
        targetId: 'tour-account-settings-btn',
        placement: 'bottom',
        title: 'Secure Your Account',
        body: 'Click Account to change your password and keep your clinical account secure. We recommend setting a strong, unique password now.',
        nextLabel: 'Next',
    },
    {
        id: 'goto-schedule',
        path: '/doctor/profile',
        targetId: 'tour-schedule-link',
        placement: 'bottom',
        title: 'Step 2 — Set Your Schedule',
        body: 'Once your profile is complete, click the Schedule button to open your configuration panel right here.',
        nextLabel: 'Next',
    },
    {
        id: 'weekly-hours',
        path: '/doctor/profile',
        targetId: 'tour-weekly-hours',
        placement: 'top',
        ui: 'subtle',
        title: 'Configure Working Days & Hours',
        body: 'Toggle each day on or off and set your clinic start/end times. You can apply presets across multiple days at once to save time.',
        nextLabel: 'Next',
    },
    {
        id: 'slot-config',
        path: '/doctor/profile',
        targetId: 'tour-slot-config',
        placement: 'top',
        ui: 'subtle',
        title: 'Appointment Rules',
        body: 'Set your default appointment duration, slot interval, and buffer time between patients. Saving these settings will complete your onboarding and activate your account.',
        nextLabel: 'Finish Setup ✓',
    },
    {
        id: 'complete',
        path: '/doctor/dashboard',
        targetId: null,
        placement: 'center',
        title: "You're all set! 🎉",
        body: "Your account is now active. Patients can book appointments, and your schedule is live. Welcome to Tibaflow — let's get to work.",
        nextLabel: 'Go to Dashboard',
    },
];

// ─── Constants (module-level for stable references) ─────────────────────────────

const STORAGE_KEY = 'tibaflow_onboarding_tour_step';
const TOOLTIP_W = 380;
const TOOLTIP_H = 230;

// ─── Context ──────────────────────────────────────────────────────────────────

interface OnboardingTourContextValue {
    isActive: boolean;
    currentStepIndex: number;
    currentStep: TourStep | null;
    /** True when localStorage has no tour key yet (brand-new doctor/session) */
    isFirstTime: boolean;
    resumeTour: () => void;
    skipTour: () => void;
    nextStep: () => void;
    prevStep: () => void;
}

const OnboardingTourContext = createContext<OnboardingTourContextValue>({
    isActive: false,
    currentStepIndex: -1,
    currentStep: null,
    isFirstTime: false,
    skipTour: () => {},
    nextStep: () => {},
    prevStep: () => {},
    resumeTour: () => {},
});

export function useOnboardingTour() {
    return useContext(OnboardingTourContext);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStoredStep(): number {
    if (typeof window === 'undefined') return -1;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return -2; // -2 means 'never seen'
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= -1 && n < TOUR_STEPS.length ? n : -1;
}

function setStoredStep(index: number) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, String(index));
}

function shouldAdvance(step: TourStep, pathname: string): boolean {
    if (!step.targetId) return true;
    if (step.path !== pathname) return true;
    return Boolean(document.getElementById(step.targetId));
}

// ─── Overlay / Spotlight ──────────────────────────────────────────────────────

interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

interface TooltipPosition {
    top: number;
    left: number;
    transform: string;
}

function computeTooltipPosition(
    target: Rect | null,
    placement: TourStep['placement'],
    tooltipWidth: number,
    tooltipHeight: number,
    padding = 14,
): TooltipPosition {
    if (!target || placement === 'center') {
        return {
            top: window.innerHeight / 2,
            left: window.innerWidth / 2,
            transform: 'translate(-50%, -50%)',
        };
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = 0;
    let left = 0;
    let transform = '';

    switch (placement) {
        case 'bottom':
            top = target.top + target.height + padding;
            left = target.left + target.width / 2;
            transform = 'translateX(-50%)';
            break;
        case 'top':
            top = target.top - tooltipHeight - padding;
            left = target.left + target.width / 2;
            transform = 'translateX(-50%)';
            break;
        case 'right':
            top = target.top + target.height / 2;
            left = target.left + target.width + padding;
            transform = 'translateY(-50%)';
            break;
        case 'left':
            top = target.top + target.height / 2;
            left = target.left - tooltipWidth - padding;
            transform = 'translateY(-50%)';
            break;
    }

    // Clamp so tooltip stays within viewport
    const margin = 12;
    const estimatedLeft = (() => {
        if (transform.includes('translateX(-50%)')) return left - tooltipWidth / 2;
        return left;
    })();

    if (estimatedLeft < margin) left += margin - estimatedLeft;
    if (estimatedLeft + tooltipWidth > vw - margin)
        left -= estimatedLeft + tooltipWidth - (vw - margin);
    if (top < margin) top = margin;
    if (top + tooltipHeight > vh - margin) top = vh - tooltipHeight - margin;

    return { top, left, transform };
}

// ─── Overlay Component ────────────────────────────────────────────────────────

interface OverlayProps {
    step: TourStep;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
    stepIndex: number;
    totalSteps: number;
}

function TourOverlay({ step, onNext, onPrev, onSkip, stepIndex, totalSteps }: OverlayProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);
  const rafRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(0);

  const updateRect = useCallback(() => {
    const now = performance.now();
    // Throttle to 30fps max
    if (now - lastUpdateRef.current < 33) return;
    lastUpdateRef.current = now;

    if (!step.targetId) {
      setTargetRect(null);
      return;
    }
    const el = document.getElementById(step.targetId);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step.targetId]);

  useLayoutEffect(() => {
    setMounted(true);
    updateRect();

    const tick = () => {
      updateRect();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [updateRect]);

    if (!mounted) return null;

    const PADDING = 8; // spotlight padding around target
    const isCenter = step.placement === 'center' || !targetRect;

    // Spotlight cutout dimensions
    const spotTop = targetRect ? targetRect.top - PADDING : 0;
    const spotLeft = targetRect ? targetRect.left - PADDING : 0;
    const spotW = targetRect ? targetRect.width + PADDING * 2 : 0;
    const spotH = targetRect ? targetRect.height + PADDING * 2 : 0;

    const tooltipPos = computeTooltipPosition(
        targetRect,
        step.placement,
        TOOLTIP_W,
        TOOLTIP_H,
    );

    const isFirst = stepIndex === 0;
    const isLast = stepIndex === totalSteps - 1;
    const isComplete = step.id === 'complete';
    const uiMode = step.ui ?? 'overlay';

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] overflow-hidden pointer-events-none"
            role="dialog"
            aria-modal="true"
            aria-label={`Onboarding tour step ${stepIndex + 1} of ${totalSteps}: ${step.title}`}
        >
            {uiMode === 'overlay' && (
                <>
                    {/* ── Backdrop / spotlight overlay using clip-path ── */}
                    {isCenter ? (
                        /* Full dimmed backdrop for centred modal */
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-all duration-300 pointer-events-none"
                        />
                    ) : (
                        /* SVG cutout spotlight */
                        <svg
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            style={{ mixBlendMode: 'normal' }}
                        >
                            <defs>
                                <mask id="tour-spotlight-mask">
                                    <rect width="100%" height="100%" fill="white" />
                                    <rect
                                        x={spotLeft}
                                        y={spotTop}
                                        width={spotW}
                                        height={spotH}
                                        rx={6}
                                        fill="black"
                                    />
                                </mask>
                            </defs>
                            <rect
                                width="100%"
                                height="100%"
                                fill="rgba(0,0,0,0.62)"
                                mask="url(#tour-spotlight-mask)"
                            />
                        </svg>
                    )}

                    {/* ── Glowing border around target element ── */}
                    {targetRect && (
                        <div
                            className="absolute pointer-events-none rounded-md transition-all duration-200"
                            style={{
                                top: spotTop,
                                left: spotLeft,
                                width: spotW,
                                height: spotH,
                                boxShadow:
                                    '0 0 0 2px #6366f1, 0 0 0 4px rgba(99,102,241,0.25), 0 0 20px rgba(99,102,241,0.4)',
                                zIndex: 10001,
                            }}
                        />
                    )}
                </>
            )}

            {/* ── Tooltip Card ── */}
            <div
                className="absolute pointer-events-auto"
                style={{
                    top: uiMode === 'subtle' ? undefined : tooltipPos.top,
                    left: uiMode === 'subtle' ? undefined : tooltipPos.left,
                    transform: uiMode === 'subtle' ? undefined : tooltipPos.transform,
                    width: uiMode === 'subtle' ? 360 : TOOLTIP_W,
                    right: uiMode === 'subtle' ? 20 : undefined,
                    bottom: uiMode === 'subtle' ? 20 : undefined,
                    zIndex: 10002,
                }}
            >
                <div
                    className="rounded-2xl border border-white/10 bg-[#0f1117] text-white shadow-2xl overflow-hidden"
                    style={{
                        boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                        <div className="flex items-center gap-2">
                            {isComplete ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                            ) : (
                                <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
                            )}
                            <h3 className="text-sm font-semibold text-white leading-snug">
                                {step.title}
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={onSkip}
                            className="shrink-0 h-6 w-6 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                            aria-label="Skip tour"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* Body */}
                    <p className="px-5 pb-5 text-sm text-white/70 leading-relaxed">
                        {step.body}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-white/[0.07] bg-white/[0.03]">
                        {/* Progress dots */}
                        <div className="flex items-center gap-1.5">
                            {TOUR_STEPS.map((_, i) => (
                                <div
                                    key={i}
                                    className="h-1.5 rounded-full transition-all duration-300"
                                    style={{
                                        width: i === stepIndex ? 20 : 6,
                                        backgroundColor:
                                            i === stepIndex
                                                ? '#6366f1'
                                                : i < stepIndex
                                                    ? 'rgba(99,102,241,0.4)'
                                                    : 'rgba(255,255,255,0.15)',
                                    }}
                                />
                            ))}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                            {!isFirst && !isComplete && (
                                <button
                                    type="button"
                                    onClick={onPrev}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" />
                                    Back
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onNext}
                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    isComplete
                                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                }`}
                            >
                                {step.nextLabel}
                                {!isComplete && <ArrowRight className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface OnboardingTourProviderProps {
    children: React.ReactNode;
    /** Onboarding status from the doctor profile. If ACTIVE, tour won't auto-start. */
    onboardingStatus?: string | null;
}

export function OnboardingTourProvider({
    children,
    onboardingStatus,
}: OnboardingTourProviderProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [stepIndex, setStepIndex] = useState<number>(-1);
    // Avoid hydration mismatch: read localStorage after mount
    const [hydrated, setHydrated] = useState(false);
    const [isFirstTime, setIsFirstTime] = useState(false);

    useEffect(() => {
        setHydrated(true);
        const stored = getStoredStep();
        setIsFirstTime(stored === -2);
        if (stored >= 0) {
            setStepIndex(stored);
        } else if (stored === -2 && onboardingStatus && onboardingStatus !== 'ACTIVE') {
            // Tour never seen, and doctor has not completed onboarding
            const targetStep = 0; // Always start with welcome to avoid "resume" confusion
            setStepIndex(targetStep);
            setStoredStep(targetStep);
        }
    }, [onboardingStatus]);

    const isActive = hydrated && stepIndex >= 0 && stepIndex < TOUR_STEPS.length;
    const currentStep = isActive ? TOUR_STEPS[stepIndex] : null;

    // When the tour has a target step for this page but the element isn't yet
    // in the DOM (e.g. after navigation), wait for it to appear.
    const [waitingForEl, setWaitingForEl] = useState(false);
    useEffect(() => {
        if (!isActive || !currentStep) return;
        if (currentStep.path !== pathname) return;
        if (!currentStep.targetId) return;

        const el = document.getElementById(currentStep.targetId);
        if (el) {
            setWaitingForEl(false);
            return;
        }

        setWaitingForEl(true);
        const observer = new MutationObserver(() => {
            const found = document.getElementById(currentStep.targetId!);
            if (found) {
                observer.disconnect();
                setWaitingForEl(false);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, [isActive, currentStep, pathname]);

    const resumeTour = useCallback(() => {
        if (!onboardingStatus || onboardingStatus === 'ACTIVE') return;

        // Start/resume at the most logical step based on backend onboarding status.
        // - Brand-new (ACTIVATED): welcome on dashboard (step 0)
        // - Profile already completed: jump to schedule setup CTA on profile (step 5)
        let targetStep = 0;
        if (onboardingStatus === 'PROFILE_COMPLETED' || onboardingStatus === 'SCHEDULE_SETUP') {
            targetStep = 5;
        }

        if (targetStep === 0) {
            router.push('/doctor/dashboard');
        } else {
            router.push('/doctor/profile');
        }

        setStepIndex(targetStep);
        setStoredStep(targetStep);
    }, [onboardingStatus, router]);

    const skipTour = useCallback(() => {
        setStepIndex(-1);
        setStoredStep(-1);
    }, []);

    const nextStep = useCallback(() => {
        if (!currentStep) return;

        // Prevent advancing into an invisible "waiting for element" state.
        // If the current step points at a targetId on this page, require it to exist.
        if (!shouldAdvance(currentStep, pathname)) return;

        // If this step requires navigation, navigate first then advance
        if (currentStep.navigateTo) {
            router.push(currentStep.navigateTo);
        }

        const next = stepIndex + 1;
        if (next >= TOUR_STEPS.length) {
            // Tour complete
            setStepIndex(-1);
            setStoredStep(-1);
            return;
        }
        setStepIndex(next);
        setStoredStep(next);
    }, [currentStep, stepIndex, router]);

    const prevStep = useCallback(() => {
        const prev = stepIndex - 1;
        if (prev < 0) return;
        const prevStepDef = TOUR_STEPS[prev];
        if (prevStepDef?.path && prevStepDef.path !== pathname) {
            router.push(prevStepDef.path);
        }
        setStepIndex(prev);
        setStoredStep(prev);
    }, [stepIndex, pathname, router]);

    // Show overlay only when we're on the correct page for the current step
    const onCorrectPage = currentStep?.path === pathname;
    const shouldRenderOverlay = isActive && onCorrectPage && !waitingForEl;

    const value: OnboardingTourContextValue = {
        isActive,
        currentStepIndex: stepIndex,
        currentStep,
        isFirstTime,
        resumeTour,
        skipTour,
        nextStep,
        prevStep,
    };

    return (
        <OnboardingTourContext.Provider value={value}>
            {children}
            {shouldRenderOverlay && currentStep && (
                <TourOverlay
                    step={currentStep}
                    stepIndex={stepIndex}
                    totalSteps={TOUR_STEPS.length}
                    onNext={nextStep}
                    onPrev={prevStep}
                    onSkip={skipTour}
                />
            )}
        </OnboardingTourContext.Provider>
    );
}
