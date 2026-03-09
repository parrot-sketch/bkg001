import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadOptions {
  folder?: string;
  public_id?: string;
  resource_type?: 'image' | 'raw' | 'video' | 'auto';
  format?: string;
  overwrite?: boolean;
}

/**
 * Uploads a file buffer to Cloudinary using a stream.
 */
export async function uploadStream(
  buffer: Buffer,
  options: CloudinaryUploadOptions = {}
): Promise<{ url: string; publicId: string; secure_url: string }> {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (!result) {
          reject(new Error('Cloudinary upload returned no result'));
        } else {
          resolve({
            url: result.url,
            publicId: result.public_id,
            secure_url: result.secure_url,
          });
        }
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    const readable = new Readable();
    readable._read = () => {};
    readable.push(buffer);
    readable.push(null);
    readable.pipe(upload);
  });
}

/**
 * Generates a signed or unsigned URL for a resource.
 */
export function getFileUrl(publicId: string, options: any = {}): string {
  return cloudinary.url(publicId, {
    secure: true,
    ...options,
  });
}
/**
 * Fetches a resource from Cloudinary using authentication.
 * Useful for proxying private/restricted resources server-side.
 */
export async function downloadResource(publicId: string, resourceType: string = 'raw'): Promise<Response> {
  const url = getFileUrl(publicId, { resource_type: resourceType });
  const auth = Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString('base64');
  
  return fetch(url, {
    headers: {
      'Authorization': `Basic ${auth}`
    }
  });
}

export default cloudinary;
