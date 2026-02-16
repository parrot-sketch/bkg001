'use client';

/**
 * Image Upload Component
 * 
 * Drag-and-drop image upload with preview and Cloudinary integration.
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    disabled?: boolean;
    label?: string;
    subtitle?: string;
    variant?: 'avatar' | 'rect';
}

export function ImageUpload({
    value,
    onChange,
    disabled,
    label = 'Profile Image',
    subtitle = 'Current image preview',
    variant = 'avatar'
}: ImageUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(value || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = useCallback(async (file: File) => {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            toast.error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
            return;
        }

        // Validate file size (5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error('File size exceeds 5MB. Please choose a smaller image.');
            return;
        }

        setIsUploading(true);

        try {
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            // Upload to server
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                onChange(result.data.url);
                toast.success('Image uploaded successfully');
            } else {
                toast.error(result.error || 'Upload failed');
                setPreview(value || null);
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload image');
            setPreview(value || null);
        } finally {
            setIsUploading(false);
        }
    }, [onChange, value]);

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
        if (file) {
            handleUpload(file);
        }
    }, [handleUpload]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleUpload(file);
        }
    }, [handleUpload]);

    const handleRemove = useCallback(() => {
        setPreview(null);
        onChange('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [onChange]);

    return (
        <div className="space-y-4">
            {/* Preview */}
            {preview && (
                <div className="flex items-center gap-4">
                    {variant === 'avatar' ? (
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={preview} alt="Preview" />
                            <AvatarFallback>
                                <ImageIcon className="h-8 w-8" />
                            </AvatarFallback>
                        </Avatar>
                    ) : (
                        <div className="relative h-40 w-full max-w-[240px] rounded-lg overflow-hidden border bg-muted">
                            <img
                                src={preview}
                                alt="Preview"
                                className="h-full w-full object-cover"
                            />
                        </div>
                    )}

                    <div className="flex-1">
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    </div>
                    {!disabled && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemove}
                            disabled={isUploading}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )}

            {/* Upload Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                    relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
                    ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
                `}
                onClick={() => !disabled && fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleFileSelect}
                    disabled={disabled || isUploading}
                    className="hidden"
                />

                {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="text-sm font-medium">
                                {preview ? 'Change Image' : label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Drag and drop or click to browse
                            </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            JPEG, PNG, or WebP • Max 5MB
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
