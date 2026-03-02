'use client';

/**
 * Consent Template Management Page
 *
 * Simplified, clear workflow for managing consent templates.
 * Single functionality per view: Upload → Create → Manage
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { useConsentTemplates, useCreateConsentTemplate, useUpdateConsentTemplate, useDeleteConsentTemplate } from '@/hooks/doctor/useConsentTemplates';
import { ConsentTemplateDto, consentTemplateApi } from '@/lib/api/consent-templates';
import { ConsentType, TemplateStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { SecureConsentViewer } from '@/components/pdf/SecureConsentViewer';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    FileText,
    Plus,
    Edit,
    Trash2,
    Eye,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    X,
    Upload,
    File,
    Search,
    Archive,
    Copy,
    History,
    Activity,
    CheckCircle,
    Clock,
    ArrowRight,
    ArrowLeft,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
    GENERAL_PROCEDURE: 'General Procedure',
    ANESTHESIA: 'Anesthesia',
    BLOOD_TRANSFUSION: 'Blood Transfusion',
    PHOTOGRAPHY: 'Clinical Photography',
    SPECIAL_PROCEDURE: 'Special Procedure',
};

type ViewMode = 'list' | 'upload' | 'create';

export default function ConsentTemplatesPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [selectedTemplate, setSelectedTemplate] = useState<ConsentTemplateDto | null>(null);
    const [statusFilter, setStatusFilter] = useState<TemplateStatus | 'ALL'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [includeInactive, setIncludeInactive] = useState(true);
    const [showVersionsDialog, setShowVersionsDialog] = useState(false);
    const [showAuditDialog, setShowAuditDialog] = useState(false);
    const [showPreviewDialog, setShowPreviewDialog] = useState(false);
    const [uploadedPdfUrl, setUploadedPdfUrl] = useState<string | null>(null);

    const { data: templates, isLoading, refetch, error } = useConsentTemplates({
        includeInactive,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery || undefined,
    });

    // Debug: Log templates data
    useEffect(() => {
        if (templates !== undefined) {
            console.log('[ConsentTemplates] Templates loaded:', {
                count: templates?.length || 0,
                templates: templates,
                filters: { statusFilter, searchQuery, includeInactive },
            });
        }
        if (error) {
            console.error('[ConsentTemplates] Error loading templates:', error);
        }
    }, [templates, error, statusFilter, searchQuery, includeInactive]);

    const createMutation = useCreateConsentTemplate();
    const updateMutation = useUpdateConsentTemplate();
    const deleteMutation = useDeleteConsentTemplate();

    // Auth guard - must be in useEffect to avoid setState during render
    useEffect(() => {
        if (!isAuthenticated || !user) {
            router.push('/login');
        }
    }, [isAuthenticated, user, router]);

    // Early return if not authenticated (after useEffect handles redirect)
    if (!isAuthenticated || !user) {
        return null;
    }

    if (user.role !== 'DOCTOR') {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-slate-900">Access Denied</p>
                    <p className="text-sm text-slate-500 mt-1">Only doctors can manage consent templates.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-16">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Consent Templates</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {viewMode === 'list' && 'Manage your consent form templates'}
                        {viewMode === 'upload' && 'Upload a PDF consent document'}
                        {viewMode === 'create' && 'Create a new consent template'}
                    </p>
                </div>
                {viewMode === 'list' && (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setViewMode('upload')} className="gap-2">
                            <Upload className="h-4 w-4" />
                            Upload PDF
                        </Button>
                        <Button onClick={() => setViewMode('create')} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Template
                        </Button>
                    </div>
                )}
                {viewMode !== 'list' && (
                    <Button variant="outline" onClick={() => setViewMode('list')} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to List
                    </Button>
                )}
            </div>

            {/* View Mode Content */}
            {viewMode === 'list' && (
                <>
                    {/* Filters */}
                    <div className="flex flex-col gap-4">
                        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as TemplateStatus | 'ALL')}>
                            <TabsList>
                                <TabsTrigger value="ALL">All</TabsTrigger>
                                <TabsTrigger value="DRAFT">Draft</TabsTrigger>
                                <TabsTrigger value="PENDING_APPROVAL">Pending Approval</TabsTrigger>
                                <TabsTrigger value="ACTIVE">Active</TabsTrigger>
                                <TabsTrigger value="ARCHIVED">Archived</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex items-center gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search templates..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Button
                                variant={includeInactive ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setIncludeInactive(!includeInactive)}
                            >
                                {includeInactive ? 'Show Active Only' : 'Show All'}
                            </Button>
                        </div>
                    </div>

                    {/* Templates List */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : templates && templates.length > 0 ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-600">
                                    Showing {templates.length} template{templates.length !== 1 ? 's' : ''}
                                    {statusFilter !== 'ALL' && ` (${statusFilter.toLowerCase()})`}
                                </p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {templates.map((template) => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onEdit={() => {
                                            setSelectedTemplate(template);
                                            setViewMode('create');
                                        }}
                                        onPreview={() => {
                                            setSelectedTemplate(template);
                                            setShowPreviewDialog(true);
                                        }}
                                        onDelete={async () => {
                                            if (confirm(`Deactivate template "${template.title}"?`)) {
                                                deleteMutation.mutate(template.id, {
                                                    onSuccess: () => refetch(),
                                                });
                                            }
                                        }}
                                        onSubmitApproval={async () => {
                                            const notes = prompt('Add optional notes for the reviewer:') ?? undefined;
                                            const response = await consentTemplateApi.submitForApproval(template.id, notes || undefined);
                                            if (response.success) {
                                                toast.success('Template submitted for approval');
                                                refetch();
                                            } else {
                                                toast.error(response.error || 'Failed to submit for approval');
                                            }
                                        }}
                                        onActivate={async () => {
                                            const response = await consentTemplateApi.activate(template.id);
                                            if (response.success) {
                                                toast.success('Template activated');
                                                refetch();
                                            } else {
                                                toast.error(response.error || 'Failed to activate');
                                            }
                                        }}
                                        onArchive={async () => {
                                            const response = await consentTemplateApi.archive(template.id);
                                            if (response.success) {
                                                toast.success('Template archived');
                                                refetch();
                                            } else {
                                                toast.error(response.error || 'Failed to archive');
                                            }
                                        }}
                                        onDuplicate={async () => {
                                            const newTitle = prompt('Enter title for duplicate:', `${template.title} (Copy)`);
                                            if (newTitle) {
                                                const response = await consentTemplateApi.duplicate(template.id, newTitle);
                                                if (response.success) {
                                                    toast.success('Template duplicated');
                                                    refetch();
                                                } else {
                                                    toast.error(response.error || 'Failed to duplicate');
                                                }
                                            }
                                        }}
                                        onViewVersions={() => {
                                            setSelectedTemplate(template);
                                            setShowVersionsDialog(true);
                                        }}
                                        onViewAudit={() => {
                                            setSelectedTemplate(template);
                                            setShowAuditDialog(true);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <EmptyState
                                onUpload={() => setViewMode('upload')}
                                onCreate={() => setViewMode('create')}
                            />
                            {(searchQuery || statusFilter !== 'ALL') && (
                                <div className="text-center py-4">
                                    <p className="text-sm text-slate-500 mb-2">
                                        {searchQuery && `No templates found matching "${searchQuery}".`}
                                        {statusFilter !== 'ALL' && `No ${statusFilter.toLowerCase()} templates found.`}
                                    </p>
                                    <div className="flex items-center justify-center gap-2">
                                        {searchQuery && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSearchQuery('')}
                                            >
                                                Clear search
                                            </Button>
                                        )}
                                        {statusFilter !== 'ALL' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setStatusFilter('ALL')}
                                            >
                                                Show all templates
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {viewMode === 'upload' && (
                <UploadPdfView
                    onSuccess={(pdfUrl) => {
                        toast.success('PDF uploaded successfully');
                        setUploadedPdfUrl(pdfUrl);
                        setViewMode('create');
                    }}
                    onCancel={() => {
                        setViewMode('list');
                        setUploadedPdfUrl(null);
                    }}
                />
            )}

            {viewMode === 'create' && (
                <CreateTemplateView
                    template={selectedTemplate}
                    initialPdfUrl={uploadedPdfUrl}
                    onSuccess={() => {
                        toast.success(selectedTemplate ? 'Template updated' : 'Template created');
                        setViewMode('list');
                        setSelectedTemplate(null);
                        setUploadedPdfUrl(null);
                        refetch();
                    }}
                    onCancel={() => {
                        setViewMode('list');
                        setSelectedTemplate(null);
                        setUploadedPdfUrl(null);
                    }}
                />
            )}

            {/* Versions Dialog */}
            {selectedTemplate && (
                <VersionsDialog
                    open={showVersionsDialog}
                    onClose={() => {
                        setShowVersionsDialog(false);
                        setSelectedTemplate(null);
                    }}
                    templateId={selectedTemplate.id}
                />
            )}

            {/* Audit Dialog */}
            {selectedTemplate && (
                <AuditDialog
                    open={showAuditDialog}
                    onClose={() => {
                        setShowAuditDialog(false);
                        setSelectedTemplate(null);
                    }}
                    templateId={selectedTemplate.id}
                />
            )}

            {/* Preview Dialog */}
            {selectedTemplate && selectedTemplate.pdf_url && (
                <PreviewTemplateDialog
                    open={showPreviewDialog}
                    onClose={() => {
                        setShowPreviewDialog(false);
                        setSelectedTemplate(null);
                    }}
                    template={selectedTemplate}
                />
            )}
        </div>
    );
}

// ─── Template Card Component ──────────────────────────────────────────────

function TemplateCard({
    template,
    onEdit,
    onPreview,
    onDelete,
    onActivate,
    onArchive,
    onDuplicate,
    onViewVersions,
    onViewAudit,
    onSubmitApproval,
}: {
    template: ConsentTemplateDto;
    onEdit: () => void;
    onPreview: () => void;
    onDelete: () => void;
    onActivate?: () => void;
    onArchive?: () => void;
    onDuplicate?: () => void;
    onViewVersions?: () => void;
    onViewAudit?: () => void;
    onSubmitApproval?: () => void;
}) {
    const getStatusBadge = () => {
        switch (template.status) {
            case 'DRAFT':
                return (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <Clock className="h-3 w-3 mr-1" />
                        Draft
                    </Badge>
                );
            case 'PENDING_APPROVAL':
                return (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending Approval
                    </Badge>
                );
            case 'ACTIVE':
                return (
                    <Badge variant="default" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                    </Badge>
                );
            case 'ARCHIVED':
                return (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                        <Archive className="h-3 w-3 mr-1" />
                        Archived
                    </Badge>
                );
            default:
                return null;
        }
    };

    return (
        <Card className={cn('hover:shadow-md transition-shadow', template.status === 'ARCHIVED' && 'opacity-60')}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{template.title}</CardTitle>
                        <CardDescription className="mt-1">
                            {CONSENT_TYPE_LABELS[template.type]} · v{template.version}
                        </CardDescription>
                        {template.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.description}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {template.template_format === 'PDF' && (
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                <File className="h-3 w-3 mr-1" />
                                PDF
                            </Badge>
                        )}
                        {getStatusBadge()}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Updated {format(new Date(template.updated_at), 'MMM d, yyyy')}</span>
                    {template.usage_count > 0 && (
                        <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            Used {template.usage_count}x
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={onPreview}>
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Preview
                    </Button>
                    {template.status === 'DRAFT' && (
                        <Button variant="outline" size="sm" onClick={onEdit}>
                            <Edit className="h-3.5 w-3.5 mr-1.5" />
                            Edit
                        </Button>
                    )}
                    {/* Submit for approval — replaces direct Activate for DRAFT templates */}
                    {template.status === 'DRAFT' && onSubmitApproval && (
                        <Button size="sm" onClick={onSubmitApproval} className="gap-1.5">
                            <ArrowRight className="h-3.5 w-3.5" />
                            Submit for Approval
                        </Button>
                    )}
                    {template.status === 'ACTIVE' && onArchive && (
                        <Button variant="outline" size="sm" onClick={onArchive}>
                            <Archive className="h-3.5 w-3.5 mr-1.5" />
                            Archive
                        </Button>
                    )}
                    {onViewVersions && (
                        <Button variant="outline" size="sm" onClick={onViewVersions} title="Version History">
                            <History className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    {template.status !== 'PENDING_APPROVAL' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={onDelete}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────

function EmptyState({ onUpload, onCreate }: { onUpload: () => void; onCreate: () => void }) {
    return (
        <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="bg-slate-100 p-4 rounded-full mb-4">
                    <FileText className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">No templates yet</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-sm">
                    Get started by uploading a PDF consent document or creating a new template.
                </p>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={onUpload} className="gap-2">
                        <Upload className="h-4 w-4" />
                        Upload PDF
                    </Button>
                    <Button onClick={onCreate} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Template
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Upload PDF View (Simple, Single Function) ────────────────────────────

function UploadPdfView({ onSuccess, onCancel }: { onSuccess: (pdfUrl: string) => void; onCancel: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileSelect = (selectedFile: File) => {
        if (selectedFile.type !== 'application/pdf') {
            toast.error('Please select a PDF file');
            return;
        }
        if (selectedFile.size > 10 * 1024 * 1024) {
            toast.error('File size must be less than 10MB');
            return;
        }
        setFile(selectedFile);
        // Create preview URL
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        try {
            const response = await consentTemplateApi.uploadPdf(file);
            if (response.success && response.data) {
                onSuccess(response.data.url);
            } else {
                toast.error((response as any).error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upload PDF Consent Document</CardTitle>
                <CardDescription>
                    Upload your existing PDF consent form. After upload, you'll create a template from it.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                    {file ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center">
                                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">{file.name}</p>
                                <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            {previewUrl && (
                                <div className="mt-6 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-slate-900">Document Preview</p>
                                        <p className="text-xs text-slate-500">Read-only preview</p>
                                    </div>
                                    <SecureConsentViewer
                                        file={previewUrl}
                                        height={400}
                                        documentTitle={file.name}
                                        showWatermark={false}
                                    />
                                </div>
                            )}
                            <div className="flex items-center justify-center gap-3">
                                <Button variant="outline" onClick={() => { setFile(null); setPreviewUrl(null); }}>
                                    <X className="h-4 w-4 mr-2" />
                                    Remove
                                </Button>
                                <Button onClick={handleUpload} disabled={uploading}>
                                    {uploading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload PDF
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center">
                                <div className="bg-slate-100 p-4 rounded-full">
                                    <Upload className="h-8 w-8 text-slate-400" />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900 mb-1">
                                    Drag and drop your PDF here, or click to browse
                                </p>
                                <p className="text-xs text-slate-500">Maximum file size: 10MB</p>
                            </div>
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => {
                                    const selectedFile = e.target.files?.[0];
                                    if (selectedFile) handleFileSelect(selectedFile);
                                }}
                                className="hidden"
                                id="pdf-upload-input"
                            />
                            <Button
                                variant="outline"
                                onClick={() => document.getElementById('pdf-upload-input')?.click()}
                            >
                                <File className="h-4 w-4 mr-2" />
                                Choose PDF File
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Create Template View (Simple, Clear Steps) ───────────────────────────

function CreateTemplateView({
    template,
    initialPdfUrl,
    onSuccess,
    onCancel,
}: {
    template?: ConsentTemplateDto | null;
    initialPdfUrl?: string | null;
    onSuccess: () => void;
    onCancel: () => void;
}) {
    const [step, setStep] = useState(1);
    const [title, setTitle] = useState(template?.title || '');
    const [type, setType] = useState<ConsentType>(template?.type || ConsentType.GENERAL_PROCEDURE);
    const [description, setDescription] = useState(template?.description || '');
    const [pdfUrl, setPdfUrl] = useState<string | null>(template?.pdf_url || initialPdfUrl || null);
    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [versionNotes, setVersionNotes] = useState('');

    // Update pdfUrl when initialPdfUrl changes (from upload)
    useEffect(() => {
        if (initialPdfUrl && !template) {
            setPdfUrl(initialPdfUrl);
        }
    }, [initialPdfUrl, template]);

    const createMutation = useCreateConsentTemplate();
    const updateMutation = useUpdateConsentTemplate();

    const handlePdfUpload = async (file: File) => {
        setUploadingPdf(true);
        try {
            const response = await consentTemplateApi.uploadPdf(file);
            if (response.success && response.data) {
                setPdfUrl(response.data.url);
                toast.success('PDF uploaded successfully');
            } else {
                toast.error((response as any).error || 'Failed to upload PDF');
            }
        } catch (error) {
            console.error('PDF upload error:', error);
            toast.error('Failed to upload PDF');
        } finally {
            setUploadingPdf(false);
        }
    };

    const handleSubmit = () => {
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }

        if (template) {
            // Update existing template
            updateMutation.mutate(
                {
                    templateId: template.id,
                    dto: {
                        title: title.trim(),
                        description: description.trim() || undefined,
                        pdf_url: pdfUrl || undefined,
                        version_notes: versionNotes.trim() || undefined,
                    },
                },
                {
                    onSuccess: () => onSuccess(),
                }
            );
        } else {
            // Create new template
            if (!pdfUrl) {
                toast.error('Please upload a PDF file');
                return;
            }

            createMutation.mutate(
                {
                    title: title.trim(),
                    type,
                    pdf_url: pdfUrl,
                    template_format: 'PDF',
                    description: description.trim() || undefined,
                },
                {
                    onSuccess: () => onSuccess(),
                }
            );
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{template ? `Edit Template: ${template.title}` : 'Create New Template'}</CardTitle>
                <CardDescription>
                    {template
                        ? `Editing will create version ${template.version + 1}. Previous versions are preserved.`
                        : initialPdfUrl
                            ? 'Complete the form below to create a template from your uploaded PDF.'
                            : 'Upload a PDF and fill in the details to create a reusable consent template.'}
                </CardDescription>
                {initialPdfUrl && !template && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <p className="text-sm text-emerald-800">
                                PDF uploaded successfully! Complete the form below to create your template.
                            </p>
                        </div>
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Step 1: Basic Info */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className={cn('flex items-center justify-center w-8 h-8 rounded-full', step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-slate-200 text-slate-600')}>
                            {step > 1 ? <CheckCircle2 className="h-4 w-4" /> : '1'}
                        </div>
                        <span className="font-medium">Basic Information</span>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Template Title *</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Standard Procedure Consent"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">Consent Type *</Label>
                        <Select value={type} onValueChange={(value) => setType(value as ConsentType)}>
                            <SelectTrigger id="type">
                                <SelectValue />
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

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of this template..."
                            rows={3}
                        />
                    </div>
                </div>

                {/* Step 2: PDF Upload */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <div className={cn('flex items-center justify-center w-8 h-8 rounded-full', step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-slate-200 text-slate-600')}>
                            {step > 2 ? <CheckCircle2 className="h-4 w-4" /> : '2'}
                        </div>
                        <span className="font-medium">PDF Document</span>
                    </div>

                    {pdfUrl ? (
                        <div className="border rounded-lg p-4 bg-slate-50">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                    <span className="text-sm font-medium">PDF uploaded</span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPdfUrl(null)}
                                    className="text-destructive"
                                >
                                    <X className="h-3.5 w-3.5 mr-1.5" />
                                    Remove
                                </Button>
                            </div>
                            <SecureConsentViewer
                                file={pdfUrl}
                                height={400}
                                documentTitle="PDF Preview"
                                showWatermark={false}
                            />
                        </div>
                    ) : (
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => {
                                    const selectedFile = e.target.files?.[0];
                                    if (selectedFile) handlePdfUpload(selectedFile);
                                }}
                                className="hidden"
                                id="pdf-upload-create"
                            />
                            <Button
                                variant="outline"
                                onClick={() => document.getElementById('pdf-upload-create')?.click()}
                                disabled={uploadingPdf}
                                className="gap-2"
                            >
                                {uploadingPdf ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4" />
                                        Upload PDF Document
                                    </>
                                )}
                            </Button>
                            <p className="text-xs text-slate-500 mt-2">Maximum file size: 10MB</p>
                        </div>
                    )}
                </div>

                {/* Step 3: Version Notes (only for updates) */}
                {template && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-600">
                                3
                            </div>
                            <span className="font-medium">Version Notes (Optional)</span>
                        </div>
                        <Textarea
                            value={versionNotes}
                            onChange={(e) => setVersionNotes(e.target.value)}
                            placeholder="Why are you creating this new version? (e.g., Updated procedure details, Added new section...)"
                            rows={3}
                        />
                        <p className="text-xs text-slate-500">
                            This note will be saved with version {template.version + 1} for reference.
                        </p>
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={onCancel} disabled={createMutation.isPending || updateMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!title.trim() || !pdfUrl || createMutation.isPending || updateMutation.isPending || uploadingPdf}
                    >
                        {(createMutation.isPending || updateMutation.isPending) && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {template ? `Save Changes (v${template.version + 1})` : 'Create Template'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Versions Dialog ────────────────────────────────────────────────────────

function VersionsDialog({ open, onClose, templateId }: { open: boolean; onClose: () => void; templateId: string }) {
    const [versions, setVersions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setLoading(true);
            consentTemplateApi.getVersions(templateId).then((response) => {
                if (response.success && response.data) {
                    setVersions(response.data);
                } else {
                    toast.error((response as any).error || 'Failed to load versions');
                }
                setLoading(false);
            });
        }
    }, [open, templateId]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Version History</DialogTitle>
                    <DialogDescription>View all versions of this template</DialogDescription>
                </DialogHeader>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : versions.length > 0 ? (
                    <div className="space-y-4">
                        {versions.map((version) => (
                            <Card key={version.id}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm">Version {version.version_number}</CardTitle>
                                        <Badge variant="outline">
                                            {format(new Date(version.created_at), 'MMM d, yyyy HH:mm')}
                                        </Badge>
                                    </div>
                                    {version.version_notes && (
                                        <CardDescription className="mt-2">{version.version_notes}</CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-slate-600">
                                        <p className="font-medium mb-1">{version.title}</p>
                                        <p className="text-xs text-slate-500">
                                            Format: {version.template_format} · Created by: {version.created_by || 'Unknown'}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500">No versions found</div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Audit Dialog ───────────────────────────────────────────────────────────

// ─── Preview Template Dialog ────────────────────────────────────────────────

function PreviewTemplateDialog({
    open,
    onClose,
    template,
}: {
    open: boolean;
    onClose: () => void;
    template: ConsentTemplateDto;
}) {
    const pdfUrl = template.pdf_url;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
                {/* Header */}
                <div className="border-b border-slate-200 px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <DialogTitle className="text-xl font-bold">{template.title}</DialogTitle>
                            <DialogDescription className="mt-2 flex flex-wrap gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">Type:</span>
                                    <Badge variant="outline">{CONSENT_TYPE_LABELS[template.type]}</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">Status:</span>
                                    <Badge 
                                        className={cn(
                                            template.status === 'ACTIVE' && 'bg-emerald-100 text-emerald-900',
                                            template.status === 'DRAFT' && 'bg-slate-100 text-slate-900',
                                            template.status === 'PENDING_APPROVAL' && 'bg-amber-100 text-amber-900',
                                            template.status === 'ARCHIVED' && 'bg-gray-100 text-gray-900',
                                        )}
                                    >
                                        {template.status}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">Updated:</span>
                                    <span className="text-xs text-slate-600">
                                        {format(new Date(template.updated_at), 'MMM dd, yyyy')}
                                    </span>
                                </div>
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    {pdfUrl ? (
                        <SecureConsentViewer
                            file={pdfUrl}
                            height="calc(90vh - 200px)"
                            documentTitle={template.title}
                            showWatermark={true}
                            onLoadError={(error) => {
                                console.error('PDF load error:', error);
                            }}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[400px] text-center">
                            <AlertTriangle className="h-12 w-12 text-slate-400 mb-4" />
                            <p className="text-sm text-slate-500">No PDF document available for this template.</p>
                            <p className="text-xs text-slate-400 mt-2">Upload a PDF when creating or editing the template.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Audit Dialog ────────────────────────────────────────────────────────────

function AuditDialog({ open, onClose, templateId }: { open: boolean; onClose: () => void; templateId: string }) {
    const [auditLog, setAuditLog] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setLoading(true);
            consentTemplateApi.getAuditLog(templateId, 50).then((response) => {
                if (response.success && response.data) {
                    setAuditLog(response.data);
                } else {
                    toast.error((response as any).error || 'Failed to load audit log');
                }
                setLoading(false);
            });
        }
    }, [open, templateId]);

    const getActionLabel = (action: string) => {
        const labels: Record<string, string> = {
            CREATED: 'Created',
            UPDATED: 'Updated',
            ACTIVATED: 'Activated',
            ARCHIVED: 'Archived',
            DELETED: 'Deleted',
            VIEWED: 'Viewed',
            DOWNLOADED: 'Downloaded',
            DUPLICATED: 'Duplicated',
            RESTORED: 'Restored',
        };
        return labels[action] || action;
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Audit Log</DialogTitle>
                    <DialogDescription>Complete audit trail for this template</DialogDescription>
                </DialogHeader>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : auditLog.length > 0 ? (
                    <div className="space-y-2">
                        {auditLog.map((entry) => (
                            <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline">{getActionLabel(entry.action)}</Badge>
                                        <span className="text-xs text-slate-500">
                                            {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm:ss')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600">
                                        By {entry.actor_role} · {entry.actor_user_id}
                                    </p>
                                    {entry.changes_json && (
                                        <details className="mt-2">
                                            <summary className="text-xs text-slate-500 cursor-pointer">View changes</summary>
                                            <pre className="mt-2 text-xs bg-slate-50 p-2 rounded overflow-auto">
                                                {JSON.stringify(JSON.parse(entry.changes_json), null, 2)}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500">No audit entries found</div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
