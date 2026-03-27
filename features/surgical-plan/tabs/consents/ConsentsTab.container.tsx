'use client';

/**
 * Consents Tab — Surgical Plan
 *
 * Manage signed consent forms for a surgical case.
 * Upload pre-signed PDFs or images of consent forms.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SecureDocumentViewer } from '@/components/pdf/SecureDocumentViewer';
import { LoadingState } from '../../shared/components/LoadingState';
import {
    FileText,
    Download,
    Upload,
    FileImage,
    Eye,
    MoreVertical,
    History,
    FileEdit,
    CheckCircle,
    Loader2,
    X,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ConsentType, ConsentStatus } from '@prisma/client';

// ─── Config ───────────────────────────────────────────────────

const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
    GENERAL_PROCEDURE: 'General Procedure',
    ANESTHESIA: 'Anesthesia',
    BLOOD_TRANSFUSION: 'Blood Transfusion',
    PHOTOGRAPHY: 'Clinical Photography',
    SPECIAL_PROCEDURE: 'Special Procedure',
};

const STATUS_CONFIG: Record<ConsentStatus, { label: string; color: string }> = {
    DRAFT: { label: 'Draft', color: 'border-stone-200 text-stone-500' },
    PENDING_SIGNATURE: { label: 'Pending', color: 'border-stone-300 text-stone-600' },
    SIGNED: { label: 'Signed', color: 'border-stone-300 text-stone-600' },
    REVOKED: { label: 'Revoked', color: 'border-stone-300 text-stone-500' },
    EXPIRED: { label: 'Expired', color: 'border-stone-200 text-stone-400' },
};

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/jpg,image/tiff,application/pdf';

// ─── Types ────────────────────────────────────────────────────

interface ConsentDocument {
    id: string;
    file_name: string;
    file_size: number;
    file_url: string;
    document_type: string;
}

interface ConsentFormItem {
    id: string;
    title: string;
    type: ConsentType;
    status: ConsentStatus;
    created_at: string;
    documents: ConsentDocument[];
}

interface ConsentsTabContainerProps {
    caseId: string;
    readOnly?: boolean;
}

// ─── Component ────────────────────────────────────────────────

export function ConsentsTabContainer({ caseId, readOnly = false }: ConsentsTabContainerProps) {
    const [consents, setConsents] = useState<ConsentFormItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Upload state
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [selectedType, setSelectedType] = useState<ConsentType | ''>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Update state
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);
    const [updatingConsent, setUpdatingConsent] = useState<ConsentFormItem | null>(null);
    const [updateFile, setUpdateFile] = useState<File | null>(null);

    // Viewer state
    const [selectedDocument, setSelectedDocument] = useState<ConsentDocument | null>(null);
    const [selectedDocumentTitle, setSelectedDocumentTitle] = useState('');

    const fetchConsents = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.get<ConsentFormItem[]>(`/doctor/surgical-cases/${caseId}/consents`);
            if (response.success && response.data) {
                setConsents(response.data);
            }
        } catch {
            toast.error('Failed to load consents');
        } finally {
            setLoading(false);
        }
    }, [caseId]);

    useEffect(() => { fetchConsents(); }, [fetchConsents]);

    const handleUpload = async () => {
        if (!selectedType || !selectedFile) {
            toast.error('Select a type and file');
            return;
        }
        setUploadLoading(true);
        try {
            const formData = new FormData();
            formData.append('consentType', selectedType);
            formData.append('file', selectedFile);
            const res = await fetch(`/api/doctor/surgical-cases/${caseId}/consents/upload-signed`, { method: 'POST', body: formData });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success('Consent uploaded');
                setShowUploadDialog(false);
                setSelectedType('');
                setSelectedFile(null);
                fetchConsents();
            } else {
                toast.error(data.error || 'Upload failed');
            }
        } catch {
            toast.error('Upload failed');
        } finally {
            setUploadLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!updatingConsent || !updateFile) return;
        setUploadLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', updateFile);
            const res = await fetch(`/api/doctor/consents/${updatingConsent.id}/update-document`, { method: 'PATCH', body: formData });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success('Document updated');
                setShowUpdateDialog(false);
                setUpdateFile(null);
                setUpdatingConsent(null);
                fetchConsents();
            } else {
                toast.error(data.error || 'Update failed');
            }
        } catch {
            toast.error('Update failed');
        } finally {
            setUploadLoading(false);
        }
    };

    if (loading) return <LoadingState variant="minimal" />;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-stone-900">Signed Consents</h3>
                    <p className="text-xs text-stone-400 mt-0.5">Upload and manage signed patient consent documents</p>
                </div>
                {!readOnly && (
                    <Button size="sm" onClick={() => setShowUploadDialog(true)} className="h-8 text-xs bg-stone-900 hover:bg-black">
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        Upload
                    </Button>
                )}
            </div>

            {/* Empty state */}
            {consents.length === 0 ? (
                <div className="border border-dashed border-stone-200 rounded-lg py-10 text-center">
                    <FileText className="h-6 w-6 text-stone-300 mx-auto mb-2" />
                    <p className="text-sm text-stone-500 mb-3">No consents uploaded</p>
                    {!readOnly && (
                        <Button size="sm" variant="outline" onClick={() => setShowUploadDialog(true)} className="h-8 text-xs">
                            <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
                        </Button>
                    )}
                </div>
            ) : (
                <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-stone-50">
                                <TableHead className="w-[280px]">Document</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Uploaded</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {consents.map((consent) => {
                                const status = STATUS_CONFIG[consent.status] ?? STATUS_CONFIG.SIGNED;
                                const doc = consent.documents?.[0];
                                return (
                                    <TableRow key={consent.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-8 w-8 rounded bg-stone-100 flex items-center justify-center shrink-0">
                                                    {doc?.document_type === 'SIGNED_IMAGE'
                                                        ? <FileImage className="h-3.5 w-3.5 text-stone-400" />
                                                        : <FileText className="h-3.5 w-3.5 text-stone-400" />
                                                    }
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-stone-900 truncate">{consent.title}</p>
                                                    <p className="text-xs text-stone-400">{CONSENT_TYPE_LABELS[consent.type]}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-[10px] font-medium ${status.color}`}>
                                                {status.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-stone-400 whitespace-nowrap">
                                            {format(new Date(consent.created_at), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {doc && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-stone-300 hover:text-stone-600">
                                                            <MoreVertical className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44">
                                                        <DropdownMenuItem onClick={() => { setSelectedDocument(doc); setSelectedDocumentTitle(consent.title); }}>
                                                            <Eye className="h-3.5 w-3.5 mr-2" /> View
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => window.open(doc.file_url, '_blank')}>
                                                            <Download className="h-3.5 w-3.5 mr-2" /> Download
                                                        </DropdownMenuItem>
                                                        {!readOnly && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => { setUpdatingConsent(consent); setShowUpdateDialog(true); }}>
                                                                    <FileEdit className="h-3.5 w-3.5 mr-2" /> Update
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Viewer */}
            <SecureDocumentViewer
                open={!!selectedDocument}
                onOpenChange={(open) => !open && setSelectedDocument(null)}
                document={selectedDocument}
                title={selectedDocumentTitle}
            />

            {/* Upload Dialog */}
            <UploadDialog
                open={showUploadDialog}
                onOpenChange={(open) => { setShowUploadDialog(open); if (!open) { setSelectedType(''); setSelectedFile(null); } }}
                consentType={selectedType}
                onTypeChange={setSelectedType}
                file={selectedFile}
                onFileSelect={setSelectedFile}
                onSubmit={handleUpload}
                loading={uploadLoading}
            />

            {/* Update Dialog */}
            <UpdateDialog
                open={showUpdateDialog}
                onOpenChange={(open) => { setShowUpdateDialog(open); if (!open) { setUpdateFile(null); setUpdatingConsent(null); } }}
                consentTitle={updatingConsent?.title || ''}
                file={updateFile}
                onFileSelect={setUpdateFile}
                onSubmit={handleUpdate}
                loading={uploadLoading}
            />
        </div>
    );
}

// ─── File Dropzone ────────────────────────────────────────────

function FileDropzone({
    file,
    onFileSelect,
    disabled,
}: {
    file: File | null;
    onFileSelect: (file: File) => void;
    disabled?: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/tiff', 'application/pdf'].includes(f.type)) {
            toast.error('Invalid file type. Upload PDF or image.');
            return;
        }
        if (f.size > 15 * 1024 * 1024) {
            toast.error('File exceeds 15 MB limit.');
            return;
        }
        onFileSelect(f);
    };

    return (
        <div
            className="border border-dashed border-stone-200 hover:border-stone-300 rounded-lg p-5 text-center cursor-pointer transition-colors"
            onClick={() => !disabled && inputRef.current?.click()}
        >
            <input ref={inputRef} type="file" accept={ACCEPTED_TYPES} onChange={handleChange} disabled={disabled} className="hidden" />
            {file ? (
                <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-stone-400" />
                    <span className="text-sm text-stone-700 truncate max-w-[200px]">{file.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); onFileSelect(null as any); }} className="text-stone-300 hover:text-stone-500">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-1.5">
                    <Upload className="h-5 w-5 text-stone-300" />
                    <p className="text-sm text-stone-500">Click to upload PDF or image</p>
                    <p className="text-xs text-stone-400">Max 15 MB</p>
                </div>
            )}
        </div>
    );
}

// ─── Upload Dialog ────────────────────────────────────────────

function UploadDialog({
    open, onOpenChange, consentType, onTypeChange, file, onFileSelect, onSubmit, loading,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    consentType: ConsentType | '';
    onTypeChange: (type: ConsentType | '') => void;
    file: File | null;
    onFileSelect: (file: File) => void;
    onSubmit: () => void;
    loading: boolean;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle className="text-base">Upload Signed Consent</DialogTitle>
                    <DialogDescription className="text-xs">Upload a scanned PDF or photo of the signed consent form.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label className="text-xs">Consent Type</Label>
                        <Select value={consentType} onValueChange={(v) => onTypeChange(v as ConsentType)}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select type..." /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(CONSENT_TYPE_LABELS).map(([v, l]) => (
                                    <SelectItem key={v} value={v}>{l}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Document</Label>
                        <FileDropzone file={file} onFileSelect={onFileSelect} disabled={loading} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
                    <Button size="sm" onClick={onSubmit} disabled={!consentType || !file || loading} className="bg-stone-900 hover:bg-black">
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                        Upload
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Update Dialog ────────────────────────────────────────────

function UpdateDialog({
    open, onOpenChange, consentTitle, file, onFileSelect, onSubmit, loading,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    consentTitle: string;
    file: File | null;
    onFileSelect: (file: File) => void;
    onSubmit: () => void;
    loading: boolean;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle className="text-base">Update Document</DialogTitle>
                    <DialogDescription className="text-xs">Replace the document for <strong>{consentTitle}</strong>.</DialogDescription>
                </DialogHeader>
                <div className="py-2">
                    <FileDropzone file={file} onFileSelect={onFileSelect} disabled={loading} />
                </div>
                <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
                    <Button size="sm" onClick={onSubmit} disabled={!file || loading} className="bg-stone-900 hover:bg-black">
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                        Update
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
