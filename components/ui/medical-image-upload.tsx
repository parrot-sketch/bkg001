'use client';

/**
 * MedicalImageUpload
 *
 * A drag-and-drop uploader for clinical photography.
 * Unlike the generic ImageUpload, this component:
 *  - POSTs to /api/images/medical/upload (authenticated, private Cloudinary folder)
 *  - Calls onChange with the Cloudinary public_id, not a URL
 *  - Shows a local blob preview while uploading (never exposes the private URL)
 *  - Enforces 15 MB limit
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MedicalImageUploadProps {
    /** Called with the Cloudinary public_id on success */
    onChange: (publicId: string) => void;
    disabled?: boolean;
    className?: string;
}

export function MedicalImageUpload({ onChange, disabled, className }: MedicalImageUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [localPreview, setLocalPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = useCallback(async (file: File) => {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/tiff'];
        if (!validTypes.includes(file.type)) {
            toast.error('Invalid type. Use JPEG, PNG, WebP, or TIFF.');
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            toast.error('File exceeds 15 MB limit.');
            return;
        }

        // Show local blob preview immediately
        const previewUrl = URL.createObjectURL(file);
        setLocalPreview(previewUrl);
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/images/medical/upload', {
                method: 'POST',
                body: formData,
            });
            const json = await res.json();

            if (json.success) {
                onChange(json.data.publicId);
                toast.success('Photo uploaded securely');
            } else {
                toast.error(json.error || 'Upload failed');
                setLocalPreview(null);
                URL.revokeObjectURL(previewUrl);
            }
        } catch {
            toast.error('Network error — upload failed');
            setLocalPreview(null);
            URL.revokeObjectURL(previewUrl);
        } finally {
            setIsUploading(false);
        }
    }, [onChange]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);
    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    }, [handleUpload]);
    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
    }, [handleUpload]);

    const handleClear = useCallback(() => {
        if (localPreview) URL.revokeObjectURL(localPreview);
        setLocalPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [localPreview]);

    return (
        <div className={cn('space-y-3', className)}>
            {/* Local preview (blob URL — safe, never exposes private Cloudinary URL) */}
            {localPreview && (
                <div className="relative h-44 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                        src={localPreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClear}
                        className="absolute top-2 right-2 h-7 w-7 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full"
                    >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            )}

            {/* Drop zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
                className={cn(
                    'relative border-2 border-dashed rounded-xl p-6 text-center transition-colors',
                    isDragging ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50',
                    (disabled || isUploading) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                )}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg,image/tiff"
                    onChange={handleFileSelect}
                    disabled={disabled || isUploading}
                    className="hidden"
                />

                {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                        <p className="text-sm text-slate-500">Uploading securely…</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                            <Upload className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700">
                                {localPreview ? 'Replace photo' : 'Upload clinical photo'}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Drag & drop or click · JPEG, PNG, WebP, TIFF · Max 15 MB
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                            <p className="text-[11px] text-emerald-600 font-medium">
                                Encrypted private storage
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
