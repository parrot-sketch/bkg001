'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
                setMissingItems(data.missingItems);
                setShowMissingModal(true);
            } else if (!res.ok) {
                toast.error(data.error || 'Failed to complete plan');
            } else {
                toast.success('Surgical plan completed');
                router.push('/doctor/surgical-cases');
            }
        } catch (error) {
            console.error('Error completing plan:', error);
            toast.error('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Button 
                onClick={handleComplete} 
                disabled={isLoading}
                className="bg-stone-900 hover:bg-black text-white"
            >
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Complete Plan
            </Button>

            <Dialog open={showMissingModal} onOpenChange={setShowMissingModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-stone-900">
                            <XCircle className="h-5 w-5 text-stone-400" />
                            Incomplete Plan
                        </DialogTitle>
                        <DialogDescription>
                            Complete these required items before sending to theater scheduling.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                        <ul className="space-y-2.5">
                            {missingItems.filter(item => item.required).map((item, index) => (
                                <li key={item.key || `item-${index}`} className="flex items-start gap-2.5 text-sm">
                                    {item.done ? (
                                        <CheckCircle2 className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
                                    ) : (
                                        <XCircle className="h-4 w-4 text-stone-300 shrink-0 mt-0.5" />
                                    )}
                                    <span className={item.done ? "text-stone-400 line-through" : "text-stone-700"}>
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
