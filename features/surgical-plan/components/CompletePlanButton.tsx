'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PlanningReadinessItem {
    key: string;
    label: string;
    done: boolean;
    required: boolean;
}

interface CompletePlanButtonProps {
    caseId: string;
}

export function CompletePlanButton({ caseId }: CompletePlanButtonProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showMissingModal, setShowMissingModal] = useState(false);
    const [missingItems, setMissingItems] = useState<PlanningReadinessItem[]>([]);

    const handleComplete = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/doctor/surgical-cases/${caseId}/mark-ready`, {
                method: 'POST',
            });

            const data = await res.json();

            if (res.status === 422 && data.missingItems) {
                // Readiness validation failed
                setMissingItems(data.missingItems);
                setShowMissingModal(true);
            } else if (!res.ok) {
                throw new Error(data.error || 'Failed to complete plan');
            } else {
                // Success
                router.push('/doctor/surgical-cases'); // Redirect back to cases list or show success toast
            }
        } catch (error) {
            console.error('Error completing plan:', error);
            alert('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Button 
                onClick={handleComplete} 
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Complete
            </Button>

            <Dialog open={showMissingModal} onOpenChange={setShowMissingModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-rose-600 flex items-center gap-2">
                            <XCircle className="h-5 w-5" />
                            Incomplete Surgical Plan
                        </DialogTitle>
                        <DialogDescription>
                            Please complete the following required items before sending this case to the front desk for theater scheduling.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                        <ul className="space-y-3">
                            {missingItems.filter(item => item.required).map((item, index) => (
                                <li key={item.key || `item-${index}`} className="flex items-start gap-3 text-sm">
                                    {item.done ? (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-slate-300 shrink-0" />
                                    )}
                                    <span className={item.done ? "text-slate-600 line-through" : "text-slate-900 font-medium"}>
                                        {item.label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowMissingModal(false)}>
                            Continue Editing
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
