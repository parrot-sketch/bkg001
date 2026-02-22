import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        const isImage = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type);
        const isPDF = file.type === 'application/pdf';
        
        if (!isImage && !isPDF) {
            return NextResponse.json(
                { success: false, error: 'Invalid file type. Only images (JPEG, PNG, WebP) and PDFs are allowed.' },
                { status: 400 }
            );
        }

        // Validate file size (max 10MB for PDFs, 5MB for images)
        const maxSize = isPDF ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { success: false, error: `File size exceeds ${isPDF ? '10MB' : '5MB'} limit` },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Cloudinary
        const result = await new Promise<any>((resolve, reject) => {
            if (isPDF) {
                // Upload PDF as raw resource
                cloudinary.uploader.upload_stream(
                    {
                        folder: 'consent-templates',
                        resource_type: 'raw',
                        format: 'pdf',
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                ).end(buffer);
            } else {
                // Upload image with transformations
                cloudinary.uploader.upload_stream(
                    {
                        folder: 'doctors',
                        resource_type: 'image',
                        transformation: [
                            { width: 500, height: 500, crop: 'fill', gravity: 'face' },
                            { quality: 'auto', fetch_format: 'auto' }
                        ]
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                ).end(buffer);
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                url: result.secure_url,
                publicId: result.public_id,
            },
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
}
