/**
 * API Route: GET /api/pdf-proxy
 * 
 * Proxies PDF files from external sources (like Cloudinary) to avoid CORS issues.
 * This allows the PDF viewer to load PDFs that would otherwise be blocked by CORS.
 * 
 * Security:
 * - Only allows URLs from trusted domains (Cloudinary)
 * - Validates URL format
 * - Sets appropriate headers for PDF serving
 */

import { NextRequest, NextResponse } from 'next/server';

// Allowed domains for PDF proxying
const ALLOWED_DOMAINS = [
    'res.cloudinary.com',
    'cloudinary.com',
];

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const searchParams = request.nextUrl.searchParams;
        const url = searchParams.get('url');

        console.log('[PDF Proxy] Request received:', { url, hasUrl: !!url });

        if (!url) {
            console.error('[PDF Proxy] Missing url parameter');
            return NextResponse.json(
                { success: false, error: 'Missing url parameter' },
                { status: 400 }
            );
        }

        // Validate URL
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid URL format' },
                { status: 400 }
            );
        }

        // Check if domain is allowed
        const isAllowed = ALLOWED_DOMAINS.some(domain => 
            parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
        );

        if (!isAllowed) {
            return NextResponse.json(
                { success: false, error: 'Domain not allowed for proxying' },
                { status: 403 }
            );
        }

        // Fetch the PDF from the external source
        console.log('[PDF Proxy] Fetching PDF from:', url);
        
        try {
            // Use browser-like headers to avoid Cloudinary blocking server requests
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/pdf,application/octet-stream,*/*',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': request.headers.get('referer') || 'https://localhost:3000/',
                    'Cache-Control': 'no-cache',
                },
                redirect: 'follow',
            });

            console.log('[PDF Proxy] Fetch response:', { 
                status: response.status, 
                statusText: response.statusText,
                contentType: response.headers.get('content-type'),
                ok: response.ok,
                url: response.url,
            });

            if (!response.ok) {
                // Try to get error details
                let errorText = '';
                try {
                    errorText = await response.text();
                } catch {
                    errorText = 'Could not read error response';
                }
                
                console.error('[PDF Proxy] Fetch failed:', { 
                    status: response.status, 
                    statusText: response.statusText,
                    errorText: errorText.substring(0, 500),
                    finalUrl: response.url,
                });
                
                // If it's a 401, it might be a Cloudinary auth issue
                if (response.status === 401) {
                    return NextResponse.json(
                        { 
                            success: false, 
                            error: 'PDF access denied. The PDF may require authentication or the URL may be invalid.',
                            details: 'Cloudinary returned 401 Unauthorized. Check if the PDF URL is correct and publicly accessible.',
                        },
                        { 
                            status: 401,
                            headers: {
                                'Access-Control-Allow-Origin': '*',
                                'Access-Control-Allow-Methods': 'GET',
                            },
                        }
                    );
                }
                
                // Return the error but with proper CORS headers
                return NextResponse.json(
                    { success: false, error: `Failed to fetch PDF: ${response.statusText} (${response.status})` },
                    { 
                        status: response.status,
                        headers: {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET',
                        },
                    }
                );
            }

            // Check if the response is actually a PDF
            const contentType = response.headers.get('content-type');
            if (contentType && !contentType.includes('application/pdf') && !contentType.includes('application/octet-stream')) {
                console.warn('[PDF Proxy] Unexpected content type:', contentType);
                // Still proceed - some servers don't set content-type correctly
            }

            // Get the PDF content
            const pdfBuffer = await response.arrayBuffer();
            console.log('[PDF Proxy] Successfully fetched PDF:', { size: pdfBuffer.byteLength });

            // Return the PDF with appropriate headers
            return new NextResponse(pdfBuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Length': pdfBuffer.byteLength.toString(),
                    'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
                    'Access-Control-Allow-Origin': '*', // Allow CORS for the PDF viewer
                    'Access-Control-Allow-Methods': 'GET',
                },
            });
        } catch (fetchError: unknown) {
            console.error('[PDF Proxy] Fetch exception:', fetchError);
            const fetchErrorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
            
            // If it's a network error, provide helpful message
            if (fetchErrorMessage.includes('fetch failed') || fetchErrorMessage.includes('ECONNREFUSED')) {
                return NextResponse.json(
                    { 
                        success: false, 
                        error: 'Network error: Unable to reach the PDF source. Please check your internet connection.',
                    },
                    { 
                        status: 502,
                        headers: {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET',
                        },
                    }
                );
            }
            
            throw fetchError; // Re-throw to be caught by outer catch
        }
    } catch (error: unknown) {
        console.error('[API] /api/pdf-proxy - Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { 
                success: false, 
                error: `Proxy error: ${errorMessage}`,
            },
            { 
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET',
                },
            }
        );
    }
}
