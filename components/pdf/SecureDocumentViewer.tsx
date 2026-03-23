'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileImage, FileText, Maximize, Minimize } from 'lucide-react';
import { PdfViewer } from '@/components/pdf/PdfViewer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ConsentFormDocument } from '@prisma/client'; // or a custom type if needed

interface SecureDocumentViewerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    document: {
        id: string;
        file_url: string;
        document_type: string;
        file_name?: string;
    } | null;
    title: string;
}

export function SecureDocumentViewer({
    open,
    onOpenChange,
    document,
    title,
}: SecureDocumentViewerProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    if (!document) return null;

    const isPdf = document.document_type === 'SIGNED_PDF' || document.file_url.endsWith('.pdf');

    // Anti-tampering styles applied to the container
    const secureStyles = {
        userSelect: 'none' as const,
        WebkitUserSelect: 'none' as const,
        msUserSelect: 'none' as const,
        pointerEvents: 'auto' as const, // We need scrolling, but we block right click
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className={cn(
                    "flex flex-col p-0 overflow-hidden bg-slate-100 transition-all duration-300 ease-in-out",
                    isFullscreen ? "max-w-[100vw] w-screen h-screen m-0 rounded-none border-0" : "max-w-5xl h-[90vh]"
                )}
                // Provide strict interact-ability constraints at the dialog level
                onContextMenu={(e) => e.preventDefault()} // Block right click
                onDragStart={(e) => e.preventDefault()} // Block dragging
            >
                <DialogHeader className="p-4 border-b bg-white shrink-0 flex flex-row items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            {isPdf ? (
                                <FileText className="h-5 w-5 text-indigo-600" />
                            ) : (
                                <FileImage className="h-5 w-5 text-indigo-600" />
                            )}
                            {title}
                            <Badge variant="secondary" className="ml-2 bg-rose-50 text-rose-700 border border-rose-200 font-normal">
                                Strict Confidential
                            </Badge>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Viewing document: {title}. This is a secure, read-only view.
                        </DialogDescription>
                    </div>
                    <div className="flex items-center gap-2 pr-6">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        >
                            {isFullscreen ? (
                                <Minimize className="h-4 w-4 text-slate-500" />
                            ) : (
                                <Maximize className="h-4 w-4 text-slate-500" />
                            )}
                        </Button>
                    </div>
                </DialogHeader>

                <div 
                    className="flex-1 overflow-hidden flex flex-col items-center justify-center p-4 bg-slate-100/50 backdrop-blur-sm"
                    style={secureStyles}
                >
                    {isPdf ? (
                        <div className="w-full h-full max-w-5xl shadow-xl border border-slate-200/60 rounded-xl overflow-hidden bg-white/50 backdrop-blur">
                            <PdfViewer 
                                file={document.file_url} 
                                height="100%"
                                className="h-full border-0 rounded-none shadow-none bg-transparent"
                                showDownload={false} 
                                secureMode={true}
                            />
                        </div>
                    ) : (
                        <div className="w-full h-full bg-slate-200/50 rounded-xl flex items-center justify-center p-8 overflow-auto border border-slate-200 border-dashed relative select-none">
                            {/* Watermark overlay to deter screenshots */}
                            <div className="absolute inset-0 z-10 pointer-events-none opacity-[0.03] flex items-center justify-center overflow-hidden">
                                <div className="transform -rotate-45 text-slate-900 text-6xl font-black whitespace-nowrap tracking-widest">
                                    CONFIDENTIAL • DO NOT COPY
                                </div>
                            </div>
                            
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={document.file_url} 
                                alt="Signed Consent" 
                                className="max-w-full max-h-full object-contain bg-white shadow-2xl ring-1 ring-slate-900/5 select-none pointer-events-none" 
                                draggable={false}
                                onContextMenu={(e) => e.preventDefault()}
                            />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
