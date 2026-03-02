'use client';

/**
 * Secure Consent Document Viewer
 *
 * Professional, secure PDF viewer for consent documents with:
 * - Disabled text selection and copying
 * - Disabled downloading
 * - Disabled printing
 * - Professional document layout
 * - Page navigation and zoom controls
 * - Watermark overlay for "DOCUMENT PREVIEW" protection
 * - No export capabilities
 */

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import {
    ZoomIn,
    ZoomOut,
    ChevronLeft,
    ChevronRight,
    Loader2,
    AlertTriangle,
    Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface SecureConsentViewerProps {
    file: string | { url: string; httpHeaders?: Record<string, string>; withCredentials?: boolean };
    className?: string;
    height?: string | number;
    onLoadSuccess?: (numPages: number) => void;
    onLoadError?: (error: Error) => void;
    showWatermark?: boolean;
    documentTitle?: string;
}

export function SecureConsentViewer({
    file,
    className,
    height = 600,
    onLoadSuccess,
    onLoadError,
    showWatermark = true,
    documentTitle = 'Consent Document',
}: SecureConsentViewerProps) {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);

    const rawUrl = typeof file === 'string' ? file : file.url;

    // Disable text selection via CSS and JS
    useEffect(() => {
        const handleContextMenu = (e: Event) => e.preventDefault();
        const handleSelectStart = (e: Event) => e.preventDefault();
        const handleDrag = (e: Event) => {
            e.preventDefault();
        };

        const pdfContainer = document.querySelector('[data-secure-pdf-viewer]');
        if (pdfContainer) {
            pdfContainer.addEventListener('contextmenu', handleContextMenu as EventListener);
            pdfContainer.addEventListener('selectstart', handleSelectStart as EventListener);
            pdfContainer.addEventListener('dragstart', handleDrag as EventListener);

            return () => {
                pdfContainer.removeEventListener('contextmenu', handleContextMenu as EventListener);
                pdfContainer.removeEventListener('selectstart', handleSelectStart as EventListener);
                pdfContainer.removeEventListener('dragstart', handleDrag as EventListener);
            };
        }
    }, []);

    // Disable keyboard shortcuts for print and save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Disable Ctrl+P / Cmd+P (Print)
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
            }
            // Disable Ctrl+S / Cmd+S (Save)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
            }
            // Disable Ctrl+C / Cmd+C (Copy) - though our CSS also prevents this
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Fetch PDF with authentication
    useEffect(() => {
        let cancelled = false;

        async function fetchPdf() {
            setLoading(true);
            setError(null);
            setPdfData(null);
            try {
                const res = await fetch(rawUrl, {
                    credentials: rawUrl.startsWith('blob:') ? 'omit' : 'include',
                });
                if (!res.ok) {
                    throw new Error(`Failed to load PDF (HTTP ${res.status})`);
                }

                const arrayBuffer = await res.arrayBuffer();
                if (!cancelled) {
                    setPdfData(arrayBuffer);
                }
            } catch (err) {
                if (!cancelled) {
                    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                    setError(errorMsg);
                    onLoadError?.(err instanceof Error ? err : new Error(errorMsg));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchPdf();
        return () => {
            cancelled = true;
        };
    }, [rawUrl, onLoadError]);

    const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        onLoadSuccess?.(numPages);
    };

    const handlePrevPage = () => {
        setPageNumber((prev) => Math.max(1, prev - 1));
    };

    const handleNextPage = () => {
        setPageNumber((prev) => Math.min(numPages || prev, prev + 1));
    };

    const handleZoomIn = () => {
        setScale((prev) => Math.min(3.0, prev + 0.25));
    };

    const handleZoomOut = () => {
        setScale((prev) => Math.max(0.5, prev - 0.25));
    };

    const handleResetZoom = () => {
        setScale(1.0);
    };

    return (
        <div
            data-secure-pdf-viewer
            className={cn(
                'relative bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex flex-col',
                className
            )}
            style={{ height: typeof height === 'number' ? `${height}px` : height }}
        >
            {/* Security Header */}
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-900">
                    Secure Document — Copying, downloading, and printing are disabled for privacy
                </span>
            </div>

            {/* Controls */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevPage}
                        disabled={pageNumber <= 1 || loading}
                        title="Previous page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-slate-600 min-w-20 text-center">
                        {numPages ? `${pageNumber} / ${numPages}` : '—'}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={!numPages || pageNumber >= numPages || loading}
                        title="Next page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleZoomOut}
                        disabled={scale <= 0.5 || loading}
                        title="Zoom out"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetZoom}
                        disabled={scale === 1.0 || loading}
                        className="min-w-12 text-xs"
                        title="Reset zoom"
                    >
                        {Math.round(scale * 100)}%
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleZoomIn}
                        disabled={scale >= 3.0 || loading}
                        title="Zoom in"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* PDF Viewer */}
            <div
                className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center"
                style={{
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    msUserSelect: 'none',
                    MozUserSelect: 'none',
                }}
            >
                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                        <p className="text-sm text-slate-500">Loading document...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                        <AlertTriangle className="h-10 w-10 text-red-500" />
                        <div>
                            <p className="font-medium text-slate-900">Failed to load document</p>
                            <p className="text-xs text-slate-500 mt-1">{error}</p>
                        </div>
                    </div>
                ) : pdfData ? (
                    <div className="bg-white shadow-lg" style={{ margin: '20px' }}>
                        <Document
                            file={pdfData}
                            onLoadSuccess={handleDocumentLoadSuccess}
                            onLoadError={(err: any) => {
                                console.error('PDF.js error:', err);
                                setError(err.message || 'Failed to render PDF');
                            }}
                            loading={
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                </div>
                            }
                        >
                            <Page
                                pageNumber={pageNumber}
                                scale={scale}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                            />
                        </Document>
                        
                        {/* Watermark Overlay */}
                        {showWatermark && (
                            <div
                                className="fixed inset-0 pointer-events-none flex items-center justify-center"
                                style={{
                                    fontSize: '4rem',
                                    fontWeight: 'bold',
                                    color: 'rgba(0, 0, 0, 0.08)',
                                    transform: 'rotate(-45deg)',
                                    zIndex: -1,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                DOCUMENT PREVIEW
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {/* Footer Info */}
            <div className="bg-white border-t border-slate-200 px-4 py-2 text-xs text-slate-500 text-center">
                {documentTitle} • Page {pageNumber} of {numPages || '—'}
            </div>
        </div>
    );
}
