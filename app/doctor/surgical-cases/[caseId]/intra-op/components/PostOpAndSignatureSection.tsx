'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import { FileText, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface PostOpAndSignatureSectionProps {
    postOpInstructions: string;
    signatures: {
        surgeon?: {
            name: string;
            timestamp: string;
        };
    };
    updateField: (path: string, value: any) => void;
    readOnly: boolean;
    isFinalizing: boolean;
    onFinalize: (signature: string) => Promise<void>;
    canTransition: boolean;
    onTransitionToRecovery: () => Promise<void>;
    isTransitioning: boolean;
}

export function PostOpAndSignatureSection({ 
    postOpInstructions,
    signatures,
    updateField, 
    readOnly,
    isFinalizing,
    onFinalize,
    canTransition,
    onTransitionToRecovery,
    isTransitioning,
}: PostOpAndSignatureSectionProps) {
    const [signature, setSignature] = useState('');
    const [showSignDialog, setShowSignDialog] = useState(false);

    const handleSign = async () => {
        if (!signature.trim()) return;
        await onFinalize(signature);
        setShowSignDialog(false);
        setSignature('');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-stone-500" />
                <h3 className="text-sm font-semibold text-stone-700">Post-Operative Instructions</h3>
            </div>
            
            <RichTextEditor
                content={postOpInstructions}
                onChange={(val) => updateField('postOpInstructions', val)}
                placeholder="Pain management, wound care, activity restrictions, follow-up, medications, warning signs, diet/lifestyle..."
                readOnly={readOnly}
                minHeight="250px"
            />

            {/* Signature Section */}
            <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="h-4 w-4 text-stone-500" />
                    <h3 className="text-sm font-semibold text-stone-700">Confirmation & Signature</h3>
                </div>

                {signatures.surgeon ? (
                    <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-200">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            <span className="font-medium text-emerald-800">Operative Record Finalized</span>
                        </div>
                        <div className="text-sm text-emerald-700">
                            <p>Signed by: <strong>{signatures.surgeon.name}</strong></p>
                            <p className="text-xs text-emerald-600 mt-1">
                                {format(new Date(signatures.surgeon.timestamp), 'PPpp')}
                            </p>
                        </div>
                        
                        {/* Transition to Recovery Button */}
                        {canTransition && (
                            <Button
                                onClick={onTransitionToRecovery}
                                disabled={isTransitioning}
                                className="mt-4 bg-blue-600 hover:bg-blue-700"
                            >
                                {isTransitioning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Move to Recovery
                            </Button>
                        )}
                    </div>
                ) : readOnly ? (
                    <div className="bg-stone-50 p-6 rounded-lg border border-stone-200">
                        <p className="text-sm text-stone-500">Signature required to finalize</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-stone-600">
                            Sign to finalize this operative record. This action cannot be undone.
                        </p>
                        
                        {showSignDialog ? (
                            <div className="bg-stone-50 p-4 rounded-lg border space-y-4">
                                <div>
                                    <Label className="text-sm text-stone-600">Type your full name to sign</Label>
                                    <Input 
                                        value={signature}
                                        onChange={(e) => setSignature(e.target.value)}
                                        placeholder="Enter your full name"
                                        className="max-w-md mt-1"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSign()}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button 
                                        onClick={handleSign}
                                        disabled={!signature.trim() || isFinalizing}
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        {isFinalizing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                        Confirm & Sign
                                    </Button>
                                    <Button 
                                        variant="outline"
                                        onClick={() => setShowSignDialog(false)}
                                        disabled={isFinalizing}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Button 
                                onClick={() => setShowSignDialog(true)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Sign Operative Record
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
