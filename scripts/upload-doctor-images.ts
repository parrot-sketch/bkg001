/**
 * Upload Doctor Images to Cloudinary
 * 
 * This script uploads doctor profile images to Cloudinary and outputs the URLs
 * to use in your seed script.
 * 
 * Usage:
 *   1. Set environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)
 *   2. Place doctor images in ./images/doctors/ directory
 *   3. Run: npx tsx scripts/upload-doctor-images.ts
 */

import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

interface DoctorImage {
  filename: string;
  doctorName: string;
  email: string;
}

const doctorImages: DoctorImage[] = [
  {
    filename: 'dr-mukami-gathariki.png',
    doctorName: 'Dr. Mukami Gathariki',
    email: 'mukami.gathariki@nairobisculpt.com',
  },
  {
    filename: 'dr-ken-aluora.png',
    doctorName: 'Dr. Ken Aluora',
    email: 'ken.aluora@nairobisculpt.com',
  },
  {
    filename: 'dr-john-paul-ogalo.png',
    doctorName: 'Dr. John Paul Ogalo',
    email: 'johnpaul.ogalo@nairobisculpt.com',
  },
  {
    filename: 'dr-angela-muoki.png',
    doctorName: 'Dr. Angela Muoki',
    email: 'angela.muoki@nairobisculpt.com',
  },
  {
    filename: 'dr-dorsi-jowi.png',
    doctorName: 'Dr. Dorsi Jowi',
    email: 'dorsi.jowi@nairobisculpt.com',
  },
];

async function uploadImage(imagePath: string, publicId: string): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: 'doctors',
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
      transformation: [
        {
          width: 400,
          height: 400,
          crop: 'fill',
          gravity: 'face', // Smart cropping on face
          quality: 'auto',
          fetch_format: 'auto', // Auto WebP when supported
        },
      ],
    });

    return result.secure_url;
  } catch (error) {
    console.error(`Error uploading ${imagePath}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Uploading Doctor Images to Cloudinary\n');

  // Check if images directory exists
  const imagesDir = path.join(process.cwd(), 'images', 'doctors');
  if (!fs.existsSync(imagesDir)) {
    console.error(`❌ Error: Images directory not found at ${imagesDir}`);
    console.log('\n📁 Please create the directory and add your doctor images:');
    console.log('   mkdir -p images/doctors');
    console.log('   # Then add your PNG files');
    process.exit(1);
  }

  // Verify Cloudinary credentials
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('❌ Error: Cloudinary credentials not set');
    console.log('\n📝 Please set environment variables:');
    console.log('   CLOUDINARY_CLOUD_NAME=your_cloud_name');
    console.log('   CLOUDINARY_API_KEY=your_api_key');
    console.log('   CLOUDINARY_API_SECRET=your_api_secret');
    process.exit(1);
  }

  const results: Array<{ doctor: string; email: string; url: string }> = [];

  for (const doctorImage of doctorImages) {
    const imagePath = path.join(imagesDir, doctorImage.filename);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      console.log(`⚠️  Skipping ${doctorImage.filename} (file not found)`);
      continue;
    }

    console.log(`📤 Uploading ${doctorImage.filename}...`);
    
    try {
      // Remove extension for public_id
      const publicId = doctorImage.filename.replace(/\.(png|jpg|jpeg)$/i, '');
      const url = await uploadImage(imagePath, publicId);
      
      results.push({
        doctor: doctorImage.doctorName,
        email: doctorImage.email,
        url,
      });
      
      console.log(`   ✅ Uploaded: ${url}\n`);
    } catch (error) {
      console.error(`   ❌ Failed to upload ${doctorImage.filename}\n`);
    }
  }

  // Output results
  console.log('\n📋 Upload Results:');
  console.log('='.repeat(80));
  console.log('\nCopy these URLs to update your seed script:\n');
  
  results.forEach((result) => {
    console.log(`// ${result.doctor} (${result.email})`);
    console.log(`profile_image: '${result.url}',`);
    console.log('');
  });

  // Generate seed script snippet
  console.log('\n📝 Seed Script Snippet:');
  console.log('='.repeat(80));
  console.log('\nconst doctorData = [');
  
  doctorImages.forEach((doctorImage, index) => {
    const result = results.find((r) => r.email === doctorImage.email);
    const url = result?.url || `'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/doctors/${doctorImage.filename}'`;
    
    console.log(`  {`);
    console.log(`    first_name: '${doctorImage.doctorName.split(' ')[1] || ''}',`);
    console.log(`    last_name: '${doctorImage.doctorName.split(' ')[2] || ''}',`);
    console.log(`    email: '${doctorImage.email}',`);
    console.log(`    profile_image: '${url}',`);
    console.log(`    // ... other fields`);
    console.log(`  }${index < doctorImages.length - 1 ? ',' : ''}`);
  });
  
  console.log('];\n');
  
  console.log('✅ Upload complete!');
  console.log(`\n📊 Summary: ${results.length}/${doctorImages.length} images uploaded`);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
