'use client';

/**
 * Custom PDF Viewer Component
 *
 * Uses react-pdf (PDF.js) to render PDFs directly in the browser.
 * Provides zoom controls, page navigation, and download functionality.
 *
 * Auth Note:
 * PDFs served from /api/files/ require auth cookies. PDF.js runs in a
 * web worker and cannot attach httpOnly session cookies. To work around
 * this, we pre-fetch the PDF in the main thread with credentials:'include',
 * convert it to a blob URL, then pass the blob URL to react-pdf.
 * The worker only ever sees a same-origin blob:// URL — no auth needed.
 */

import { useState, useMemo, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import {
    ZoomIn,
    ZoomOut,
    ChevronLeft,
    ChevronRight,
    Download,
    Loader2,
    AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface PdfViewerProps {
    /** URL of the PDF to display */
    file: string | { url: string; httpHeaders?: Record<string, string>; withCredentials?: boolean };
    /** Optional className for the container */
    className?: string;
    /** Optional height for the viewer */
    height?: string | number;
    /** Show download button */
    showDownload?: boolean;
    /** Callback when PDF loads successfully */
    onLoadSuccess?: (numPages: number) => void;
    /** Callback when PDF fails to load */
    onLoadError?: (error: Error) => void;
}

export function PdfViewer({
    file,
    className,
    height = 600,
    showDownload = true,
    onLoadSuccess,
    onLoadError,
}: PdfViewerProps) {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // PDF bytes resolved by main-thread fetch — avoids both the auth-cookie
    // problem (PDF.js worker can't send cookies) and the React StrictMode
    // blob-URL revocation race (StrictMode double-fires effects; a revocable
    // blob URL gets torn down before PDF.js reads it). ArrayBuffers have no
    // lifecycle, so they're safe across double-invocations.
    const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);

    // The raw URL string used for download / open-in-tab
    const rawUrl = typeof file === 'string' ? file : file.url;

    // Pre-fetch the PDF bytes in the main thread with auth cookies.
    //
    // Two reasons we can't pass the URL directly to <Document>:
    //  1. PDF.js runs in a web worker that cannot send httpOnly cookies → 401
    //  2. React 18 StrictMode double-invokes effects; blob URLs created in the
    //     first invocation are revoked during cleanup before PDF.js loads them
    //     → status 0.  ArrayBuffers have no lifecycle, so they are immune.
    //
    // Blob URLs (file:// or blob://) are already local and need no fetch.
    useEffect(() => {
        let cancelled = false;

        async function fetchPdf() {
            setLoading(true);
            setError(null);
            setPdfData(null);
            try {
                // blob: URLs are local — no HTTP request needed, just re-use as-is.
                // We still resolve them to bytes so react-pdf gets the same type.
                const res = await fetch(rawUrl, {
                    credentials: rawUrl.startsWith('blob:') ? 'omit' : 'include',
                });
                if (!res.ok) {
                    throw new Error(`Failed to load PDF (HTTP ${res.status})`);
                }
                const buffer = await res.arrayBuffer();
                if (cancelled) return;
                setPdfData(buffer);
            } catch (err) {
                if (!cancelled) {
                    const msg = err instanceof Error ? err.message : 'Failed to load PDF';
                    setError(msg);
                    setLoading(false);
                    onLoadError?.(err instanceof Error ? err : new Error(msg));
                }
            }
        }

        fetchPdf();

        return () => { cancelled = true; };
        // rawUrl changing is the only reason to re-fetch
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rawUrl]);

    // react-pdf options — no credentials or URL lifecycle needed (ArrayBuffer input)
    const documentOptions = useMemo(() => ({
        standardFontDataUrl: undefined,
        verbosity: 0,
    }), []);

    // Stable file object for react-pdf — a new object literal on every render
    // would trigger unnecessary reloads even when pdfData hasn't changed.
    const documentFile = useMemo(
        () => (pdfData ? { data: pdfData } : null),
        [pdfData]
    );

    const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setLoading(false);
        setError(null);
        onLoadSuccess?.(numPages);
    };

    const handleLoadError = (err: Error) => {
        console.error('PDF load error:', err);
        const errorMessage = err.message || '';
        if (
            errorMessage.includes('worker') ||
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('Setting up fake worker')
        ) {
            setError(
                'PDF viewer failed to initialize. Please refresh the page or contact support.'
            );
        } else {
            setError(errorMessage || 'Failed to load PDF');
        }
        setLoading(false);
        onLoadError?.(err);
    };

    const goToPrevPage = () => setPageNumber((prev) => Math.max(1, prev - 1));
    const goToNextPage = () => setPageNumber((prev) => Math.min(numPages || 1, prev + 1));
    const zoomIn = () => setScale((prev) => Math.min(3.0, prev + 0.25));
    const zoomOut = () => setScale((prev) => Math.max(0.5, prev - 0.25));

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = rawUrl;
        link.download = 'document.pdf';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={cn('flex flex-col border rounded-lg overflow-hidden bg-slate-50', className)}>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 bg-white border-b">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPrevPage}
                        disabled={pageNumber <= 1 || loading}
                        className="h-8"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-slate-600 min-w-[100px] text-center">
                        {loading
                            ? 'Loading...'
                            : numPages
                                ? `Page ${pageNumber} of ${numPages}`
                                : 'No pages'}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={!numPages || pageNumber >= numPages || loading}
                        className="h-8"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={zoomOut}
                        disabled={scale <= 0.5 || loading}
                        className="h-8"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-slate-600 min-w-[60px] text-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={zoomIn}
                        disabled={scale >= 3.0 || loading}
                        className="h-8"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    {showDownload && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownload}
                            disabled={loading || !!error}
                            className="h-8 ml-2"
                        >
                            <Download className="h-4 w-4 mr-1.5" />
                            Download
                        </Button>
                    )}
                </div>
            </div>

            {/* PDF Content */}
            <div
                className="flex-1 overflow-auto bg-slate-100 p-4 flex justify-center"
                style={{ height }}
            >
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                        <AlertTriangle className="h-12 w-12 text-destructive" />
                        <div>
                            <p className="text-sm font-medium text-slate-900 mb-1">Failed to load PDF</p>
                            <p className="text-sm text-slate-500">{error}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setError(null);
                                    setLoading(true);
                                    setPdfData(null);
                                }}
                            >
                                Retry
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(rawUrl, '_blank')}
                            >
                                Open in new tab
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        {(loading || !pdfData) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 z-10">
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-sm text-slate-500">Loading PDF...</p>
                                </div>
                            </div>
                        )}
                        {pdfData && (
                            <Document
                                file={documentFile!}
                                onLoadSuccess={handleLoadSuccess}
                                onLoadError={handleLoadError}
                                loading={
                                    <div className="flex items-center justify-center p-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                }
                                className="shadow-lg"
                                options={documentOptions}
                            >
                                <Page
                                    pageNumber={pageNumber}
                                    scale={scale}
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                    className="border border-slate-200 bg-white"
                                />
                            </Document>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
