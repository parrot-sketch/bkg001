'use client';

/**
 * Consent Template Management Page
 *
 * Allows doctors to create, edit, and manage their consent form templates.
 * Each template can be versioned and activated/deactivated.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { useConsentTemplates, useCreateConsentTemplate, useUpdateConsentTemplate, useDeleteConsentTemplate } from '@/hooks/doctor/useConsentTemplates';
import { ConsentTemplateDto } from '@/lib/api/consent-templates';
import { ConsentType } from '@prisma/client';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '@/components/consultation/RichTextEditor';
import {
    FileText,
    Plus,
    Edit,
    Trash2,
    Eye,
    Loader2,
    Shield,
    AlertTriangle,
    CheckCircle2,
    X,
    Upload,
    File,
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

export default function ConsentTemplatesPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showPreviewDialog, setShowPreviewDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<ConsentTemplateDto | null>(null);
    const [includeInactive, setIncludeInactive] = useState(false);
    const [filterType, setFilterType] = useState<ConsentType | 'ALL'>('ALL');

    const { data: templates, isLoading } = useConsentTemplates({
        includeInactive,
        type: filterType === 'ALL' ? undefined : filterType,
    });

    const createMutation = useCreateConsentTemplate();
    const updateMutation = useUpdateConsentTemplate();
    const deleteMutation = useDeleteConsentTemplate();

    // Auth guard
    if (!isAuthenticated || !user) {
        router.push('/login');
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

    const handleCreate = () => {
        setSelectedTemplate(null);
        setShowCreateDialog(true);
    };

    const handleEdit = (template: ConsentTemplateDto) => {
        setSelectedTemplate(template);
        setShowEditDialog(true);
    };

    const handlePreview = (template: ConsentTemplateDto) => {
        setSelectedTemplate(template);
        setShowPreviewDialog(true);
    };

    const handleDelete = (template: ConsentTemplateDto) => {
        setSelectedTemplate(template);
        setShowDeleteDialog(true);
    };

    const activeTemplates = templates?.filter((t) => t.is_active) ?? [];
    const inactiveTemplates = templates?.filter((t) => !t.is_active) ?? [];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-16">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Consent Templates</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage your consent form templates. Create reusable templates for different consent types.
                    </p>
                </div>
                <Button onClick={handleCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Template
                </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <Select value={filterType} onValueChange={(value) => setFilterType(value as ConsentType | 'ALL')}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Types</SelectItem>
                        {Object.entries(CONSENT_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    variant={includeInactive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIncludeInactive(!includeInactive)}
                >
                    {includeInactive ? 'Hide Inactive' : 'Show Inactive'}
                </Button>
            </div>

            {/* Templates List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : templates && templates.length > 0 ? (
                <div className="space-y-4">
                    {/* Active Templates */}
                    {activeTemplates.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Active Templates</h2>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {activeTemplates.map((template) => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onEdit={handleEdit}
                                        onPreview={handlePreview}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Inactive Templates */}
                    {includeInactive && inactiveTemplates.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Inactive Templates</h2>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {inactiveTemplates.map((template) => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onEdit={handleEdit}
                                        onPreview={handlePreview}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <EmptyState onCreate={handleCreate} />
            )}

            {/* Create Dialog */}
            <CreateTemplateDialog
                open={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                onCreate={(data) => {
                    createMutation.mutate(data, {
                        onSuccess: () => {
                            setShowCreateDialog(false);
                        },
                    });
                }}
                isLoading={createMutation.isPending}
            />

            {/* Edit Dialog */}
            {selectedTemplate && (
                <EditTemplateDialog
                    open={showEditDialog}
                    onClose={() => {
                        setShowEditDialog(false);
                        setSelectedTemplate(null);
                    }}
                    template={selectedTemplate}
                    onUpdate={(data) => {
                        updateMutation.mutate(
                            {
                                templateId: selectedTemplate.id,
                                dto: {
                                    ...data,
                                    pdf_url: data.pdf_url ?? undefined,
                                },
                            },
                            {
                                onSuccess: () => {
                                    setShowEditDialog(false);
                                    setSelectedTemplate(null);
                                },
                            },
                        );
                    }}
                    isLoading={updateMutation.isPending}
                />
            )}

            {/* Preview Dialog */}
            {selectedTemplate && (
                <PreviewTemplateDialog
                    open={showPreviewDialog}
                    onClose={() => {
                        setShowPreviewDialog(false);
                        setSelectedTemplate(null);
                    }}
                    template={selectedTemplate}
                />
            )}

            {/* Delete Dialog */}
            {selectedTemplate && (
                <DeleteTemplateDialog
                    open={showDeleteDialog}
                    onClose={() => {
                        setShowDeleteDialog(false);
                        setSelectedTemplate(null);
                    }}
                    template={selectedTemplate}
                    onDelete={() => {
                        deleteMutation.mutate(selectedTemplate.id, {
                            onSuccess: () => {
                                setShowDeleteDialog(false);
                                setSelectedTemplate(null);
                            },
                        });
                    }}
                    isLoading={deleteMutation.isPending}
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
}: {
    template: ConsentTemplateDto;
    onEdit: (template: ConsentTemplateDto) => void;
    onPreview: (template: ConsentTemplateDto) => void;
    onDelete: (template: ConsentTemplateDto) => void;
}) {
    return (
        <Card className={cn('hover:shadow-md transition-shadow', !template.is_active && 'opacity-60')}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{template.title}</CardTitle>
                        <CardDescription className="mt-1">
                            {CONSENT_TYPE_LABELS[template.type]} · v{template.version}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {template.template_format === 'PDF' && (
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                <File className="h-3 w-3 mr-1" />
                                PDF
                            </Badge>
                        )}
                        {template.template_format === 'HYBRID' && (
                            <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                                <FileText className="h-3 w-3 mr-1" />
                                Hybrid
                            </Badge>
                        )}
                        {template.is_active ? (
                            <Badge variant="default" className="shrink-0">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Active
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="shrink-0">
                                Inactive
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="text-xs text-slate-500">
                    Updated {format(new Date(template.updated_at), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => onPreview(template)}>
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Preview
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(template)}>
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(template)}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
    return (
        <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="bg-slate-100 p-4 rounded-full mb-4">
                    <FileText className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">No templates yet</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-sm">
                    Create your first consent template to get started. Templates can be reused across multiple cases.
                </p>
                <Button onClick={onCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Template
                </Button>
            </CardContent>
        </Card>
    );
}

// ─── Create Template Dialog ────────────────────────────────────────────────

function CreateTemplateDialog({
    open,
    onClose,
    onCreate,
    isLoading,
}: {
    open: boolean;
    onClose: () => void;
    onCreate: (data: { title: string; type: ConsentType; content?: string; pdf_url?: string; template_format?: 'HTML' | 'PDF' | 'HYBRID' }) => void;
    isLoading: boolean;
}) {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<ConsentType>(ConsentType.GENERAL_PROCEDURE);
    const [content, setContent] = useState('');
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [activeTab, setActiveTab] = useState<'html' | 'pdf' | 'hybrid'>('html');

    const handlePdfUpload = async (file: File) => {
        if (file.type !== 'application/pdf') {
            toast.error('Please upload a PDF file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('PDF file size must be less than 10MB');
            return;
        }

        setUploadingPdf(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/doctor/consents/templates/upload-pdf', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            if (result.success) {
                setPdfUrl(result.data.url);
                toast.success('PDF uploaded successfully');
            } else {
                toast.error(result.error || 'Failed to upload PDF');
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

        let templateFormat: 'HTML' | 'PDF' | 'HYBRID' = 'HTML';
        if (activeTab === 'pdf') {
            if (!pdfUrl) {
                toast.error('Please upload a PDF file');
                return;
            }
            templateFormat = 'PDF';
        } else if (activeTab === 'hybrid') {
            if (!pdfUrl && !content.trim()) {
                toast.error('Please upload a PDF or provide HTML content');
                return;
            }
            templateFormat = 'HYBRID';
        } else {
            // HTML tab
            if (!content.trim()) {
                toast.error('Content is required');
                return;
            }
            templateFormat = 'HTML';
        }

        onCreate({
            title: title.trim(),
            type,
            content: content.trim() || undefined,
            pdf_url: pdfUrl || undefined,
            template_format: templateFormat,
        });

        // Reset form
        setTitle('');
        setType(ConsentType.GENERAL_PROCEDURE);
        setContent('');
        setPdfUrl(null);
        setActiveTab('html');
    };

    const canSubmit = () => {
        if (!title.trim()) return false;
        if (activeTab === 'html') return content.trim().length > 0;
        if (activeTab === 'pdf') return pdfUrl !== null;
        if (activeTab === 'hybrid') return pdfUrl !== null || content.trim().length > 0;
        return false;
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Consent Template</DialogTitle>
                    <DialogDescription>
                        Create a reusable consent form template. Upload your existing PDF or create one from scratch.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Common Fields */}
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

                    {/* Tabbed Content */}
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'html' | 'pdf' | 'hybrid')}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="html">
                                <FileText className="h-4 w-4 mr-2" />
                                Create from Scratch
                            </TabsTrigger>
                            <TabsTrigger value="pdf">
                                <Upload className="h-4 w-4 mr-2" />
                                Upload PDF
                            </TabsTrigger>
                            <TabsTrigger value="hybrid">
                                <File className="h-4 w-4 mr-2" />
                                Both (PDF + HTML)
                            </TabsTrigger>
                        </TabsList>

                        {/* HTML Tab */}
                        <TabsContent value="html" className="space-y-2 mt-4">
                            <Label>Template Content *</Label>
                            <RichTextEditor
                                content={content}
                                onChange={setContent}
                                placeholder="Enter the consent form content. Use formatting tools to structure the document..."
                                minHeight="400px"
                            />
                            <p className="text-xs text-slate-500">
                                Tip: Use placeholders like {'{patientName}'}, {'{procedureName}'}, {'{doctorName}'}, {'{date}'} which will be replaced when generating consents.
                            </p>
                        </TabsContent>

                        {/* PDF Tab */}
                        <TabsContent value="pdf" className="space-y-2 mt-4">
                            <Label>Upload PDF Template *</Label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                                {pdfUrl ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-center">
                                            <div className="bg-emerald-100 p-3 rounded-full">
                                                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                                            </div>
                                        </div>
                                        <p className="text-sm font-medium text-slate-900">PDF uploaded successfully</p>
                                        <p className="text-xs text-slate-500">Your existing PDF consent form is ready to use</p>
                                        <div className="flex items-center justify-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.open(pdfUrl, '_blank')}
                                                className="gap-2"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                Preview PDF
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPdfUrl(null)}
                                                className="gap-2 text-destructive"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                                Remove
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
                                                Upload your existing PDF consent form
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Drag and drop your PDF here, or click to browse
                                            </p>
                                        </div>
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handlePdfUpload(file);
                                            }}
                                            className="hidden"
                                            id="pdf-upload"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => document.getElementById('pdf-upload')?.click()}
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
                                                    Choose PDF File
                                                </>
                                            )}
                                        </Button>
                                        <p className="text-xs text-slate-400">Maximum file size: 10MB</p>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-slate-500">
                                Upload your existing PDF consent form. The system will use this PDF directly when generating consents for patients.
                            </p>
                        </TabsContent>

                        {/* Hybrid Tab */}
                        <TabsContent value="hybrid" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Upload PDF Template (Optional)</Label>
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                                    {pdfUrl ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-center">
                                                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-900">PDF uploaded</p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPdfUrl(null)}
                                                className="gap-2 text-destructive"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                                Remove PDF
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Upload className="h-6 w-6 text-slate-400 mx-auto" />
                                            <input
                                                type="file"
                                                accept="application/pdf"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handlePdfUpload(file);
                                                }}
                                                className="hidden"
                                                id="pdf-upload-hybrid"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => document.getElementById('pdf-upload-hybrid')?.click()}
                                                disabled={uploadingPdf}
                                            >
                                                {uploadingPdf ? 'Uploading...' : 'Upload PDF'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>HTML Content (Optional)</Label>
                                <RichTextEditor
                                    content={content}
                                    onChange={setContent}
                                    placeholder="Optionally create an editable HTML version of your consent form..."
                                    minHeight="300px"
                                />
                                <p className="text-xs text-slate-500">
                                    Create an editable HTML version that can be used alongside or instead of the PDF.
                                </p>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading || uploadingPdf}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading || uploadingPdf || !canSubmit()}>
                        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Create Template
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Edit Template Dialog ─────────────────────────────────────────────────

function EditTemplateDialog({
    open,
    onClose,
    template,
    onUpdate,
    isLoading,
}: {
    open: boolean;
    onClose: () => void;
    template: ConsentTemplateDto;
    onUpdate: (data: { title?: string; content?: string; pdf_url?: string | null; template_format?: 'HTML' | 'PDF' | 'HYBRID'; is_active?: boolean }) => void;
    isLoading: boolean;
}) {
    const [title, setTitle] = useState(template.title);
    const [content, setContent] = useState(template.content || '');
    const [pdfUrl, setPdfUrl] = useState<string | null>(template.pdf_url || null);
    const [isActive, setIsActive] = useState(template.is_active);
    const [uploadingPdf, setUploadingPdf] = useState(false);

    const handlePdfUpload = async (file: File) => {
        if (file.type !== 'application/pdf') {
            toast.error('Please upload a PDF file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('PDF file size must be less than 10MB');
            return;
        }

        setUploadingPdf(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/doctor/consents/templates/upload-pdf', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            if (result.success) {
                setPdfUrl(result.data.url);
                toast.success('PDF uploaded successfully');
            } else {
                toast.error(result.error || 'Failed to upload PDF');
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

        // Determine template format
        let templateFormat: 'HTML' | 'PDF' | 'HYBRID' = template.template_format as 'HTML' | 'PDF' | 'HYBRID';
        if (pdfUrl && content.trim()) {
            templateFormat = 'HYBRID';
        } else if (pdfUrl) {
            templateFormat = 'PDF';
        } else if (content.trim()) {
            templateFormat = 'HTML';
        }

        // Validate based on format
        if (templateFormat === 'HTML' && !content.trim()) {
            toast.error('Content is required for HTML templates');
            return;
        }
        if (templateFormat === 'PDF' && !pdfUrl) {
            toast.error('PDF is required for PDF templates');
            return;
        }

        onUpdate({
            title: title.trim(),
            content: content.trim() || undefined,
            pdf_url: pdfUrl || null,
            template_format: templateFormat,
            is_active: isActive,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Template</DialogTitle>
                    <DialogDescription>
                        Editing this template will create a new version (v{template.version + 1}). The previous version will be preserved.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-title">Template Title *</Label>
                        <Input
                            id="edit-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Standard Procedure Consent"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Template Content *</Label>
                        <RichTextEditor
                            content={content}
                            onChange={setContent}
                            placeholder="Enter the consent form content..."
                            minHeight="400px"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is-active"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="rounded border-slate-300"
                        />
                        <Label htmlFor="is-active" className="cursor-pointer">
                            Template is active (can be used for new consents)
                        </Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading || uploadingPdf}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading || uploadingPdf || !title.trim()}>
                        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Changes (v{template.version + 1})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Preview Template Dialog ──────────────────────────────────────────────

function PreviewTemplateDialog({
    open,
    onClose,
    template,
}: {
    open: boolean;
    onClose: () => void;
    template: ConsentTemplateDto;
}) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{template.title}</DialogTitle>
                    <DialogDescription>
                        {CONSENT_TYPE_LABELS[template.type]} · Version {template.version} ·{' '}
                        {template.is_active ? 'Active' : 'Inactive'} · Format: {template.template_format}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {template.template_format === 'PDF' && template.pdf_url ? (
                        <div className="space-y-4">
                            <div className="border rounded-lg p-4 bg-slate-50">
                                <p className="text-sm text-slate-600 mb-3">PDF Template Preview</p>
                                <iframe
                                    src={template.pdf_url}
                                    className="w-full h-[600px] border rounded"
                                    title="PDF Preview"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-500">
                                    This template uses your uploaded PDF consent form
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(template.pdf_url!, '_blank')}
                                    className="gap-2"
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                    Open in New Tab
                                </Button>
                            </div>
                        </div>
                    ) : template.template_format === 'HYBRID' && template.pdf_url ? (
                        <Tabs defaultValue="pdf" className="w-full">
                            <TabsList>
                                <TabsTrigger value="pdf">PDF Version</TabsTrigger>
                                <TabsTrigger value="html">HTML Version</TabsTrigger>
                            </TabsList>
                            <TabsContent value="pdf" className="mt-4">
                                <div className="border rounded-lg p-4 bg-slate-50">
                                    <iframe
                                        src={template.pdf_url}
                                        className="w-full h-[600px] border rounded"
                                        title="PDF Preview"
                                    />
                                </div>
                            </TabsContent>
                            <TabsContent value="html" className="mt-4">
                                <RichTextEditor
                                    content={template.content || ''}
                                    onChange={() => {}}
                                    readOnly
                                    minHeight="500px"
                                />
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <RichTextEditor
                            content={template.content || ''}
                            onChange={() => {}}
                            readOnly
                            minHeight="500px"
                        />
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Delete Template Dialog ────────────────────────────────────────────────

function DeleteTemplateDialog({
    open,
    onClose,
    template,
    onDelete,
    isLoading,
}: {
    open: boolean;
    onClose: () => void;
    template: ConsentTemplateDto;
    onDelete: () => void;
    isLoading: boolean;
}) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Deactivate Template</DialogTitle>
                    <DialogDescription>
                        This will deactivate the template "{template.title}". It will no longer be available for new consents, but existing consents using this template will remain unchanged.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={onDelete} disabled={isLoading}>
                        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Deactivate
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
