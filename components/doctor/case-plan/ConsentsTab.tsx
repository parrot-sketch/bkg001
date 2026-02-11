'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Plus, AlertTriangle, CheckCircle2, Clock, Loader2, PenTool } from 'lucide-react';
import { CasePlanResponseDto } from '@/lib/api/case-plan';
import { useCreateConsent, useSignConsent } from '@/hooks/doctor/useCasePlan';
import { cn } from '@/lib/utils';

interface ConsentsTabProps {
    casePlan?: CasePlanResponseDto | null;
    caseId?: string;
}

const CONSENT_TYPES = [
    { value: 'GENERAL_PROCEDURE', label: 'General Procedure Consent' },
    { value: 'ANESTHESIA', label: 'Anesthesia Consent' },
    { value: 'PHOTOGRAPHY', label: 'Clinical Photography Consent' },
    { value: 'SPECIAL_PROCEDURE', label: 'Special Procedure Consent' },
    { value: 'BLOOD_TRANSFUSION', label: 'Blood Transfusion Consent' },
];

const STATUS_STYLES: Record<string, { icon: typeof CheckCircle2; bg: string; text: string }> = {
    SIGNED: { icon: CheckCircle2, bg: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-700' },
    PENDING_SIGNATURE: { icon: Clock, bg: 'bg-amber-100 text-amber-600', text: 'text-amber-700' },
    DRAFT: { icon: FileText, bg: 'bg-muted text-muted-foreground', text: 'text-muted-foreground' },
    REVOKED: { icon: AlertTriangle, bg: 'bg-red-100 text-red-600', text: 'text-red-700' },
};

export function ConsentsTab({ casePlan, caseId }: ConsentsTabProps) {
    const consents = casePlan?.consents || [];
    const createConsent = useCreateConsent(caseId ?? '');
    const signConsent = useSignConsent(caseId ?? '');

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showSignDialog, setShowSignDialog] = useState(false);
    const [selectedConsentId, setSelectedConsentId] = useState<string | null>(null);
    const [createType, setCreateType] = useState('GENERAL_PROCEDURE');
    const [createTitle, setCreateTitle] = useState('');
    const [signatureText, setSignatureText] = useState('');
    const [witnessName, setWitnessName] = useState('');

    const canCreate = !!caseId;

    const handleCreate = async () => {
        if (!caseId) return;
        await createConsent.mutateAsync({
            type: createType,
            title: createTitle || CONSENT_TYPES.find(t => t.value === createType)?.label || 'Consent Form',
        });
        setShowCreateDialog(false);
        setCreateTitle('');
        setCreateType('GENERAL_PROCEDURE');
    };

    const handleSign = async () => {
        if (!selectedConsentId) return;
        await signConsent.mutateAsync({
            consentId: selectedConsentId,
            patientSignature: signatureText,
            witnessName: witnessName || undefined,
        });
        setShowSignDialog(false);
        setSignatureText('');
        setWitnessName('');
        setSelectedConsentId(null);
    };

    const openSignDialog = (consentId: string) => {
        setSelectedConsentId(consentId);
        setShowSignDialog(true);
    };

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Surgical Consents</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage and track patient consent forms</p>
                </div>
                {canCreate && (
                    <Button size="sm" className="gap-2" onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4" />
                        Generate Consent
                    </Button>
                )}
            </div>

            {/* Consent List */}
            {consents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
                    <div className="bg-muted p-3 rounded-full mb-4">
                        <FileText className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <h4 className="font-semibold text-foreground">No consents generated</h4>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                        Generate the standard consent bundle or create a custom consent form to get started.
                    </p>
                    {canCreate && (
                        <Button
                            variant="outline"
                            className="mt-5"
                            onClick={() => setShowCreateDialog(true)}
                        >
                            Generate Standard Bundle
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {consents.map((consent) => {
                        const style = STATUS_STYLES[consent.status] ?? STATUS_STYLES.DRAFT;
                        const StatusIcon = style.icon;
                        return (
                            <div
                                key={consent.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn('p-2 rounded-lg shrink-0', style.bg)}>
                                        <StatusIcon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-medium text-sm truncate">{consent.title}</h4>
                                        <p className="text-xs text-muted-foreground">
                                            {consent.type?.replace(/_/g, ' ')} · Created{' '}
                                            {new Date(consent.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <Badge variant={consent.status === 'SIGNED' ? 'default' : 'secondary'}>
                                        {consent.status === 'PENDING_SIGNATURE' ? 'Pending' : consent.status}
                                    </Badge>
                                    {consent.status === 'PENDING_SIGNATURE' && caseId && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs gap-1.5"
                                            onClick={() => openSignDialog(consent.id)}
                                        >
                                            <PenTool className="h-3 w-3" />
                                            Sign
                                        </Button>
                                    )}
                                    {consent.status === 'SIGNED' && (
                                        <span className="text-xs text-muted-foreground">
                                            Signed
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Legal Reminder */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                <div className="text-sm">
                    <p className="font-medium">Legal Requirement</p>
                    <p className="mt-0.5 text-amber-800">
                        All consent forms must be signed by the patient and witnessed before theater admission.
                        Digital signatures are legally binding.
                    </p>
                </div>
            </div>

            {/* ── Create Consent Dialog ─────────────────────────────── */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Generate Consent Form</DialogTitle>
                        <DialogDescription>
                            Select the consent type. A pre-filled template will be generated.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Consent Type</Label>
                            <Select value={createType} onValueChange={setCreateType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CONSENT_TYPES.map((ct) => (
                                        <SelectItem key={ct.value} value={ct.value}>
                                            {ct.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">
                                Custom Title <span className="text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <Input
                                value={createTitle}
                                onChange={(e) => setCreateTitle(e.target.value)}
                                placeholder="Leave blank for default title"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={createConsent.isPending}
                            className="gap-2"
                        >
                            {createConsent.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Generate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Sign Consent Dialog ──────────────────────────────── */}
            <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Record Patient Signature</DialogTitle>
                        <DialogDescription>
                            Confirm the patient has reviewed and signed the consent form.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Patient Signature</Label>
                            <Textarea
                                value={signatureText}
                                onChange={(e) => setSignatureText(e.target.value)}
                                placeholder="Patient's full name as signature"
                                rows={2}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">
                                Witness Name <span className="text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <Input
                                value={witnessName}
                                onChange={(e) => setWitnessName(e.target.value)}
                                placeholder="Name of witness"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSignDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSign}
                            disabled={signConsent.isPending || !signatureText.trim()}
                            className="gap-2"
                        >
                            {signConsent.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            <PenTool className="h-4 w-4" />
                            Confirm Signature
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
