'use client';

/**
 * Consents Tab Container
 *
 * Manages signed consent forms for a surgical case. 
 * Allows the doctor to upload pre-signed PDFs or Images of consent forms.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
    CheckCircle,
    Loader2,
    Plus,
    FileText,
    Download,
    Upload,
    FileImage,
    Eye,
    MoreVertical,
    History,
    FileEdit,
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
        label: 'Pending',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <Loader2 className="h-3 w-3 mr-1" />,
    },
    SIGNED: {
        label: 'Signed ✓',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
    },
    REVOKED: {
        label: 'Revoked',
        color: 'bg-red-50 text-red-700 border-red-200',
        icon: <FileText className="h-3 w-3 mr-1" />,
    },
    EXPIRED: {
        label: 'Expired',
        color: 'bg-slate-100 text-slate-600',
        icon: <FileText className="h-3 w-3 mr-1" />,
    },
};

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
}

export function ConsentsTabContainer({ caseId }: ConsentsTabContainerProps) {
    const [consents, setConsents] = useState<ConsentFormItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Upload State
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [selectedType, setSelectedType] = useState<ConsentType | ''>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Update State
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);
    const [updatingConsent, setUpdatingConsent] = useState<ConsentFormItem | null>(null);
    const [updateFile, setUpdateFile] = useState<File | null>(null);
    const updateFileInputRef = useRef<HTMLInputElement>(null);

    // Viewer State
    const [selectedDocument, setSelectedDocument] = useState<ConsentDocument | null>(null);
    const [selectedDocumentTitle, setSelectedDocumentTitle] = useState<string>('');

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
            toast.error("Failed to load consent documents.");
        } finally {
            setLoading(false);
        }
    }, [caseId]);

    useEffect(() => {
        fetchConsents();
    }, [fetchConsents]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/tiff', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            toast.error('Invalid file type. Please upload a PDF or an Image.');
            return;
        }

        if (file.size > 15 * 1024 * 1024) {
            toast.error('File exceeds the 15 MB limit.');
            return;
        }

        setSelectedFile(file);
    };

    const handleUploadConsent = async () => {
        if (!selectedType) {
            toast.error('Please select a consent type');
            return;
        }
        if (!selectedFile) {
            toast.error('Please select a signed document to upload');
            return;
        }

        setUploadLoading(true);
        try {
            const formData = new FormData();
            formData.append('consentType', selectedType);
            formData.append('file', selectedFile);

            const res = await fetch(`/api/doctor/surgical-cases/${caseId}/consents/upload-signed`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (res.ok && data.success) {
                toast.success('Signed consent uploaded successfully');
                setShowUploadDialog(false);
                setSelectedType('');
                setSelectedFile(null);
                fetchConsents();
            } else {
                toast.error(data.error || 'Failed to upload consent');
            }
        } catch {
            toast.error('Failed to upload consent due to a network error');
        } finally {
            setUploadLoading(false);
        }
    };

    const handleUpdateFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/tiff', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            toast.error('Invalid file type. Please upload a PDF or an Image.');
            return;
        }

        if (file.size > 15 * 1024 * 1024) {
            toast.error('File exceeds the 15 MB limit.');
            return;
        }

        setUpdateFile(file);
    };

    const handleUpdateDocument = async () => {
        if (!updatingConsent || !updateFile) return;

        setUploadLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', updateFile);

            const res = await fetch(`/api/doctor/consents/${updatingConsent.id}/update-document`, {
                method: 'PATCH',
                body: formData,
            });
            const data = await res.json();

            if (res.ok && data.success) {
                toast.success('Document updated successfully');
                setShowUpdateDialog(false);
                setUpdateFile(null);
                setUpdatingConsent(null);
                fetchConsents();
            } else {
                toast.error(data.error || 'Failed to update document');
            }
        } catch {
            toast.error('Failed to update document due to a network error');
        } finally {
            setUploadLoading(false);
        }
    };

    if (loading) {
        return <LoadingState variant="minimal" />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">Signed Consents</h3>
                    <p className="text-sm text-slate-500">
                        Upload and manage signed patient consent documents for this surgical case
                    </p>
                </div>
                <Button size="sm" onClick={() => setShowUploadDialog(true)} className="gap-1.5">
                    <Upload className="h-4 w-4" />
                    Upload Signed Consent
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
                            No signed consents uploaded yet
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Upload scanned signed forms or PDFs.
                        </p>
                        <Button size="sm" onClick={() => setShowUploadDialog(true)} className="gap-1.5 border border-slate-300" variant="outline">
                            <Upload className="h-4 w-4" />
                            Upload First Document
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50">
                                <TableHead className="w-[300px]">Document</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Uploaded</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {consents.map((consent) => {
                                const statusInfo = STATUS_CONFIG[consent.status] ?? STATUS_CONFIG.SIGNED;
                                const document = consent.documents?.[0]; // Get the uploaded doc
                                
                                return (
                                    <TableRow key={consent.id} className="cursor-pointer hover:bg-slate-50/50">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-indigo-50 p-2 rounded flex items-center justify-center border border-indigo-100 shrink-0">
                                                    {document?.document_type === 'SIGNED_IMAGE' ? (
                                                        <FileImage className="h-4 w-4 text-indigo-600" />
                                                    ) : (
                                                        <FileText className="h-4 w-4 text-indigo-600" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-900 truncate">
                                                        {consent.title}
                                                    </p>
                                                    <p className="text-xs text-slate-500 truncate">
                                                        {CONSENT_TYPE_LABELS[consent.type]}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={statusInfo.color}>
                                                {statusInfo.icon}
                                                {statusInfo.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                                            {format(new Date(consent.created_at), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {document && (
                                                <div className="flex justify-end items-center">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-[180px]">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setSelectedDocument(document);
                                                                    setSelectedDocumentTitle(consent.title);
                                                                }}
                                                            >
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                <span>View Securely</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => window.open(document.file_url, '_blank')}
                                                            >
                                                                <Download className="mr-2 h-4 w-4" />
                                                                <span>Download Original</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setUpdatingConsent(consent);
                                                                    setShowUpdateDialog(true);
                                                                }}
                                                            >
                                                                <FileEdit className="mr-2 h-4 w-4" />
                                                                <span>Update Document</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem disabled className="text-slate-400">
                                                                <History className="mr-2 h-4 w-4" />
                                                                <span>Version History</span>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Secure Viewer Modal */}
            <SecureDocumentViewer
                open={!!selectedDocument}
                onOpenChange={(open) => !open && setSelectedDocument(null)}
                document={selectedDocument}
                title={selectedDocumentTitle}
            />

            {/* Upload Dialog */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Signed Consent</DialogTitle>
                        <DialogDescription>
                            Upload a scanned PDF or photo of the patient's signed consent form.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="consent-type">Consent Type *</Label>
                            <Select
                                value={selectedType}
                                onValueChange={(v) => setSelectedType(v as ConsentType)}
                            >
                                <SelectTrigger id="consent-type">
                                    <SelectValue placeholder="Select what kind of consent this is..." />
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
                            <Label>Signed Document *</Label>
                            <div 
                                className="border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50 rounded-xl p-6 text-center transition-colors cursor-pointer"
                                onClick={() => !uploadLoading && fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/jpg,image/tiff,application/pdf"
                                    onChange={handleFileSelect}
                                    disabled={uploadLoading}
                                    className="hidden"
                                />
                                {selectedFile ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">
                                                {selectedFile.name}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Click to choose a different file
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                                            <Upload className="h-5 w-5 text-indigo-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">
                                                Upload PDF or Image
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Click to browse · Max 15 MB
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowUploadDialog(false);
                                setSelectedType('');
                                setSelectedFile(null);
                            }}
                            disabled={uploadLoading}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleUploadConsent} 
                            disabled={!selectedType || !selectedFile || uploadLoading}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {uploadLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Upload className="h-4 w-4 mr-2" />
                            )}
                            Upload Document
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Update Document Dialog */}
            <Dialog open={showUpdateDialog} onOpenChange={(open) => {
                setShowUpdateDialog(open);
                if (!open) {
                    setUpdateFile(null);
                    setUpdatingConsent(null);
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Document</DialogTitle>
                        <DialogDescription>
                            Replace the existing document for <strong>{updatingConsent?.title}</strong> with a new version.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        <div className="space-y-2">
                            <Label>New Signed Document *</Label>
                            <div 
                                className="border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50 rounded-xl p-6 text-center transition-colors cursor-pointer"
                                onClick={() => !uploadLoading && updateFileInputRef.current?.click()}
                            >
                                <input
                                    ref={updateFileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/jpg,image/tiff,application/pdf"
                                    onChange={handleUpdateFileSelect}
                                    disabled={uploadLoading}
                                    className="hidden"
                                />
                                {updateFile ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">
                                                {updateFile.name}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Click to choose a different file
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                                            <Upload className="h-5 w-5 text-indigo-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">
                                                Upload PDF or Image
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Click to browse · Max 15 MB
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowUpdateDialog(false);
                                setUpdateFile(null);
                                setUpdatingConsent(null);
                            }}
                            disabled={uploadLoading}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleUpdateDocument} 
                            disabled={!updateFile || uploadLoading}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {uploadLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Upload className="h-4 w-4 mr-2" />
                            )}
                            Update Version
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
