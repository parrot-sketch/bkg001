'use client';

/**
 * Admin: Consent Template Approval Page
 *
 * Lists all PENDING_APPROVAL consent templates across all doctors.
 * Admins can approve (→ ACTIVE) or reject (→ DRAFT) each template.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { useRouter } from 'next/navigation';
import { consentTemplateApi, ConsentTemplateDto } from '@/lib/api/consent-templates';
import { apiClient } from '@/lib/api/client';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PdfViewer } from '@/components/pdf/PdfViewer';
import {
    CheckCircle,
    XCircle,
    Clock,
    FileText,
    Loader2,
    AlertTriangle,
    RefreshCw,
    Eye,
    File,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ConsentType, TemplateFormat } from '@prisma/client';

const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
    GENERAL_PROCEDURE: 'General Procedure',
    ANESTHESIA: 'Anesthesia',
    BLOOD_TRANSFUSION: 'Blood Transfusion',
    PHOTOGRAPHY: 'Clinical Photography',
    SPECIAL_PROCEDURE: 'Special Procedure',
};

interface PendingTemplate extends ConsentTemplateDto {
    doctor_name?: string;
}

export default function AdminConsentApprovalsPage() {
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();
    const [templates, setTemplates] = useState<PendingTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<PendingTemplate | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [actionNotes, setActionNotes] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || !user) {
            router.push('/login');
        }
    }, [isAuthenticated, user, router]);

    const fetchPendingTemplates = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch all templates across all doctors (admin endpoint)
            const response = await apiClient.get<PendingTemplate[]>(
                '/admin/consents/templates?status=PENDING_APPROVAL'
            );
            if (response.success && response.data) {
                setTemplates(response.data);
            } else {
                // Fallback: use doctor endpoint filtered to PENDING_APPROVAL
                // This works because admin users pass the role check
                const fallback = await consentTemplateApi.getAll({
                    status: 'PENDING_APPROVAL' as any,
                    includeInactive: true,
                });
                if (fallback.success && fallback.data) {
                    setTemplates(fallback.data);
                }
            }
        } catch {
            toast.error('Failed to load pending templates');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && user?.role === 'ADMIN') {
            fetchPendingTemplates();
        }
    }, [isAuthenticated, user, fetchPendingTemplates]);

    const handleApprove = async () => {
        if (!selectedTemplate) return;
        setActionLoading(true);
        try {
            const response = await consentTemplateApi.approve(selectedTemplate.id, actionNotes || undefined);
            if (response.success) {
                toast.success(`Template "${selectedTemplate.title}" approved and activated`);
                setShowApproveDialog(false);
                setSelectedTemplate(null);
                setActionNotes('');
                fetchPendingTemplates();
            } else {
                toast.error((response as any).error || 'Failed to approve template');
            }
        } catch {
            toast.error('Failed to approve template');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedTemplate || !actionNotes.trim()) {
            toast.error('Please provide a rejection reason');
            return;
        }
        setActionLoading(true);
        try {
            const response = await consentTemplateApi.reject(selectedTemplate.id, actionNotes);
            if (response.success) {
                toast.success(`Template "${selectedTemplate.title}" rejected`);
                setShowRejectDialog(false);
                setSelectedTemplate(null);
                setActionNotes('');
                fetchPendingTemplates();
            } else {
                toast.error((response as any).error || 'Failed to reject template');
            }
        } catch {
            toast.error('Failed to reject template');
        } finally {
            setActionLoading(false);
        }
    };

    if (!isAuthenticated || !user) return null;

    if (user.role !== 'ADMIN') {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <p className="text-lg font-semibold">Access Denied</p>
                    <p className="text-sm text-slate-500 mt-1">Admin access required.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-16">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Consent Template Approvals</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Review and approve consent templates submitted by doctors
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchPendingTemplates} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg">
                                <Clock className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{loading ? '—' : templates.length}</p>
                                <p className="text-sm text-slate-500">Awaiting Review</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Template List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : templates.length === 0 ? (
                <Card className="border-2 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="bg-emerald-100 p-4 rounded-full mb-4">
                            <CheckCircle className="h-8 w-8 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">All caught up!</h3>
                        <p className="text-sm text-slate-500">No templates are pending approval.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {templates.map((template) => (
                        <Card key={template.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-base">{template.title}</CardTitle>
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                                                <Clock className="h-3 w-3 mr-1" />
                                                Pending Approval
                                            </Badge>
                                            {template.template_format === TemplateFormat.PDF && (
                                                <Badge variant="outline" className="text-[10px] bg-slate-50 shrink-0">
                                                    <File className="h-3 w-3 mr-1" />
                                                    PDF
                                                </Badge>
                                            )}
                                        </div>
                                        <CardDescription className="mt-1">
                                            {CONSENT_TYPE_LABELS[template.type]} · v{template.version}
                                            {template.doctor_name && ` · Submitted by ${template.doctor_name}`}
                                        </CardDescription>
                                        {template.description && (
                                            <p className="text-sm text-slate-600 mt-2">{template.description}</p>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 shrink-0 ml-4">
                                        {format(new Date(template.updated_at), 'MMM d, yyyy')}
                                    </p>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    {template.pdf_url && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedTemplate(template);
                                                setShowPreview(true);
                                            }}
                                            className="gap-1.5"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            Preview PDF
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                                        onClick={() => {
                                            setSelectedTemplate(template);
                                            setActionNotes('');
                                            setShowApproveDialog(true);
                                        }}
                                    >
                                        <CheckCircle className="h-3.5 w-3.5" />
                                        Approve
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                                        onClick={() => {
                                            setSelectedTemplate(template);
                                            setActionNotes('');
                                            setShowRejectDialog(true);
                                        }}
                                    >
                                        <XCircle className="h-3.5 w-3.5" />
                                        Reject
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* PDF Preview Dialog */}
            {selectedTemplate?.pdf_url && (
                <Dialog open={showPreview} onOpenChange={setShowPreview}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{selectedTemplate.title}</DialogTitle>
                            <DialogDescription>
                                {CONSENT_TYPE_LABELS[selectedTemplate.type]} · v{selectedTemplate.version}
                            </DialogDescription>
                        </DialogHeader>
                        <PdfViewer file={selectedTemplate.pdf_url} height={600} showDownload />
                    </DialogContent>
                </Dialog>
            )}

            {/* Approve Dialog */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                            Approve Template
                        </DialogTitle>
                        <DialogDescription>
                            Approving will set{' '}
                            <strong>"{selectedTemplate?.title}"</strong> to{' '}
                            <strong>ACTIVE</strong> — doctors will be able to use it on patient cases.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Label htmlFor="approve-notes">Release Notes (optional)</Label>
                        <Textarea
                            id="approve-notes"
                            placeholder="Add any notes about this approval..."
                            value={actionNotes}
                            onChange={(e) => setActionNotes(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleApprove}
                            disabled={actionLoading}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {actionLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Approve & Activate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-destructive" />
                            Reject Template
                        </DialogTitle>
                        <DialogDescription>
                            Rejecting will return{' '}
                            <strong>"{selectedTemplate?.title}"</strong> to{' '}
                            <strong>DRAFT</strong>. The doctor will be notified.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Label htmlFor="reject-reason">
                            Rejection Reason <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="reject-reason"
                            placeholder="Explain why this template needs revision..."
                            value={actionNotes}
                            onChange={(e) => setActionNotes(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={actionLoading || !actionNotes.trim()}
                        >
                            {actionLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <XCircle className="h-4 w-4 mr-2" />
                            )}
                            Reject Template
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
