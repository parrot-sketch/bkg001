'use client';

/**
 * Consents Tab Container
 *
 * Manages consent forms for a surgical case. Shows existing consents,
 * allows the doctor to create new ones using ACTIVE ConsentTemplates,
 * and shows the signing status of each.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { consentTemplateApi, ConsentTemplateDto } from '@/lib/api/consent-templates';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { LoadingState } from '../../shared/components/LoadingState';
import {
    Plus,
    FileText,
    Clock,
    CheckCircle,
    XCircle,
    QrCode,
    Loader2,
    AlertTriangle,
    Copy,
    Check,
    ExternalLink,
    RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ConsentType, ConsentStatus } from '@prisma/client';

const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
    GENERAL_PROCEDURE: 'General Procedure',
    ANESTHESIA: 'Anesthesia',
    BLOOD_TRANSFUSION: 'Blood Transfusion',
    PHOTOGRAPHY: 'Clinical Photography',
    SPECIAL_PROCEDURE: 'Special Procedure',
};

const STATUS_CONFIG: Record<ConsentStatus, { label: string; color: string; icon: React.ReactNode }> = {
    DRAFT: {
        label: 'Draft',
        color: 'bg-slate-100 text-slate-600',
        icon: <FileText className="h-3 w-3 mr-1" />,
    },
    PENDING_SIGNATURE: {
        label: 'Awaiting Patient Signature',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <Clock className="h-3 w-3 mr-1" />,
    },
    SIGNED: {
        label: 'Signed ✓',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
    },
    REVOKED: {
        label: 'Revoked',
        color: 'bg-red-50 text-red-700 border-red-200',
        icon: <XCircle className="h-3 w-3 mr-1" />,
    },
    EXPIRED: {
        label: 'Expired',
        color: 'bg-slate-100 text-slate-600',
        icon: <Clock className="h-3 w-3 mr-1" />,
    },
};

interface ConsentFormItem {
    id: string;
    title: string;
    type: ConsentType;
    status: ConsentStatus;
    version: number;
    created_at: string;
    qr_code?: string | null;
    template_id?: string | null;
}

interface QrDialogData {
    consentTitle: string;
    qrCodeDataUrl: string;
    signingUrl: string;
    qrCode: string;
}

interface ConsentsTabContainerProps {
    caseId: string;
}

export function ConsentsTabContainer({ caseId }: ConsentsTabContainerProps) {
    const [consents, setConsents] = useState<ConsentFormItem[]>([]);
    const [activeTemplates, setActiveTemplates] = useState<ConsentTemplateDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [selectedType, setSelectedType] = useState<ConsentType | ''>('');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('__inline__');
    const [customTitle, setCustomTitle] = useState('');
    const [generatingQr, setGeneratingQr] = useState<string | null>(null);
    const [qrDialog, setQrDialog] = useState<QrDialogData | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchConsents = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.get<ConsentFormItem[]>(
                `/doctor/surgical-cases/${caseId}/consents`
            );
            if (response.success && response.data) {
                setConsents(response.data);
            }
        } catch {
            // silent — handled by empty state
        } finally {
            setLoading(false);
        }
    }, [caseId]);

    const fetchActiveTemplates = useCallback(async () => {
        const response = await consentTemplateApi.getAll({ status: 'ACTIVE' as any });
        if (response.success && response.data) {
            setActiveTemplates(response.data);
        }
    }, []);

    useEffect(() => {
        fetchConsents();
        fetchActiveTemplates();
    }, [fetchConsents, fetchActiveTemplates]);

    const handleCreateConsent = async () => {
        if (!selectedType) {
            toast.error('Please select a consent type');
            return;
        }
        setCreateLoading(true);
        try {
            const body: any = { type: selectedType };
            if (customTitle.trim()) body.title = customTitle.trim();
            if (selectedTemplateId && selectedTemplateId !== '__inline__') {
                body.template_id = selectedTemplateId;
            }

            const response = await apiClient.post<ConsentFormItem>(
                `/doctor/surgical-cases/${caseId}/consents`,
                body
            );
            if (response.success) {
                toast.success('Consent form created');
                setShowCreateDialog(false);
                setSelectedType('');
                setSelectedTemplateId('__inline__');
                setCustomTitle('');
                fetchConsents();
            } else {
                toast.error((response as any).error || 'Failed to create consent');
            }
        } catch {
            toast.error('Failed to create consent');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleGenerateQr = async (consent: ConsentFormItem) => {
        setGeneratingQr(consent.id);
        try {
            const response = await apiClient.post<{
                qrCode: string;
                signingUrl: string;
                qrCodeDataUrl: string;
            }>(`/doctor/consents/${consent.id}/generate-qr`, {});

            if (response.success && response.data) {
                setQrDialog({
                    consentTitle: consent.title,
                    qrCodeDataUrl: response.data.qrCodeDataUrl,
                    signingUrl: response.data.signingUrl,
                    qrCode: response.data.qrCode,
                });
                fetchConsents();
            } else {
                toast.error((response as any).error || 'Failed to generate signing link');
            }
        } catch {
            toast.error('Failed to generate signing link');
        } finally {
            setGeneratingQr(null);
        }
    };

    const handleCopyLink = async () => {
        if (!qrDialog) return;
        await navigator.clipboard.writeText(qrDialog.signingUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Filter templates by the selected consent type
    const templatesForType = activeTemplates.filter(
        (t) => !selectedType || t.type === selectedType
    );

    if (loading) {
        return <LoadingState variant="minimal" />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">Consent Forms</h3>
                    <p className="text-sm text-slate-500">
                        Manage patient consent for this surgical case
                    </p>
                </div>
                <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Add Consent
                </Button>
            </div>

            {/* Consent List */}
            {consents.length === 0 ? (
                <Card className="border-2 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="bg-slate-100 p-4 rounded-full mb-4">
                            <FileText className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 mb-1">
                            No consent forms yet
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Add consent forms for this surgical case.
                        </p>
                        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            Add First Consent
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {consents.map((consent) => {
                        const statusInfo = STATUS_CONFIG[consent.status] ?? STATUS_CONFIG.PENDING_SIGNATURE;
                        return (
                            <Card key={consent.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-sm font-medium">
                                                {consent.title}
                                            </CardTitle>
                                            <CardDescription>
                                                {CONSENT_TYPE_LABELS[consent.type]} · v{consent.version}
                                                {' · '}
                                                {format(new Date(consent.created_at), 'MMM d, yyyy')}
                                            </CardDescription>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={statusInfo.color}
                                        >
                                            {statusInfo.icon}
                                            {statusInfo.label}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                {consent.status === 'PENDING_SIGNATURE' && (
                                    <CardContent className="pt-0">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-1.5"
                                            disabled={generatingQr === consent.id}
                                            onClick={() => handleGenerateQr(consent)}
                                        >
                                            {generatingQr === consent.id ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <QrCode className="h-3.5 w-3.5" />
                                            )}
                                            {generatingQr === consent.id ? 'Generating…' : 'Generate Signing Link'}
                                        </Button>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Active templates info banner */}
            {activeTemplates.length === 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                        No active consent templates found. Consents will be created using built-in templates.{' '}
                        <a
                            href="/doctor/consents/templates"
                            className="underline font-medium"
                            target="_blank"
                        >
                            Manage templates →
                        </a>
                    </p>
                </div>
            )}

            {/* Create Consent Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Consent Form</DialogTitle>
                        <DialogDescription>
                            Create a new consent form for this surgical case.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="consent-type">Consent Type *</Label>
                            <Select
                                value={selectedType}
                                onValueChange={(v) => {
                                    setSelectedType(v as ConsentType);
                                    setSelectedTemplateId('__inline__');
                                }}
                            >
                                <SelectTrigger id="consent-type">
                                    <SelectValue placeholder="Select consent type..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(CONSENT_TYPE_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedType && templatesForType.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="template-select">
                                    Use Template{' '}
                                    <span className="text-slate-400 font-normal">(optional)</span>
                                </Label>
                                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                    <SelectTrigger id="template-select">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__inline__">
                                            Use built-in template
                                        </SelectItem>
                                        {templatesForType.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.title} (v{t.version})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-500">
                                    ACTIVE templates above were reviewed and approved by an admin.
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="custom-title">
                                Custom Title{' '}
                                <span className="text-slate-400 font-normal">(optional)</span>
                            </Label>
                            <Input
                                id="custom-title"
                                placeholder="Leave blank to use default title"
                                value={customTitle}
                                onChange={(e) => setCustomTitle(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCreateDialog(false);
                                setSelectedType('');
                                setSelectedTemplateId('__inline__');
                                setCustomTitle('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleCreateConsent} disabled={!selectedType || createLoading}>
                            {createLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Plus className="h-4 w-4 mr-2" />
                            )}
                            Create Consent
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* QR Code Dialog — shown after generating a signing link */}
            <Dialog open={!!qrDialog} onOpenChange={() => setQrDialog(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <QrCode className="h-4 w-4" />
                            Patient Signing Link
                        </DialogTitle>
                        <DialogDescription>
                            <span className="font-medium text-slate-800">{qrDialog?.consentTitle}</span>
                            {' — '}Patient scans the QR code, verifies their identity, reads the consent, then signs.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* QR Code Image */}
                        {qrDialog?.qrCodeDataUrl && (
                            <div className="flex justify-center">
                                <img
                                    src={qrDialog.qrCodeDataUrl}
                                    alt="Consent signing QR code"
                                    className="w-48 h-48 border rounded-lg"
                                />
                            </div>
                        )}

                        {/* Signing URL — copy or open */}
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-500">Signing URL (share with patient)</Label>
                            <div className="flex gap-2">
                                <Input
                                    readOnly
                                    value={qrDialog?.signingUrl || ''}
                                    className="text-xs font-mono"
                                />
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={handleCopyLink}
                                    title="Copy link"
                                >
                                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500">
                            The link expires in <strong>48 hours</strong>. The patient will need to verify
                            their name and date of birth before signing.
                        </p>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setQrDialog(null)}>Close</Button>
                        <Button
                            onClick={() => qrDialog && window.open(qrDialog.signingUrl, '_blank')}
                            className="gap-1.5"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Open in Browser
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
