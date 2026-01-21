/**
 * Generate optimized favicon files from logo.png
 * Creates: icon.png (32x32), apple-icon.png (180x180), favicon.ico
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateFavicons() {
  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  const appDir = path.join(process.cwd(), 'app');

  if (!fs.existsSync(logoPath)) {
    console.error('Logo file not found at:', logoPath);
    process.exit(1);
  }

  try {
    // Create icon.png (32x32) - standard favicon
    const icon32 = await sharp(logoPath)
      .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    
    fs.writeFileSync(path.join(appDir, 'icon.png'), icon32);
    console.log('✅ Created app/icon.png (32x32)');

    // Create apple-icon.png (180x180) - for iOS
    const icon180 = await sharp(logoPath)
      .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    
    fs.writeFileSync(path.join(appDir, 'apple-icon.png'), icon180);
    console.log('✅ Created app/apple-icon.png (180x180)');

    // Create favicon.ico (16x16 and 32x32 sizes)
    const icon16 = await sharp(logoPath)
      .resize(16, 16, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();

    // For ICO format, we'll create a simple PNG that browsers can use
    // Note: True ICO format requires a special library, but PNG works as favicon.ico in modern browsers
    fs.writeFileSync(path.join(appDir, 'favicon.ico'), icon32);
    console.log('✅ Created app/favicon.ico (32x32)');

    console.log('\n🎉 Favicon files generated successfully!');
    console.log('Next.js will automatically use these files from the app directory.');
  } catch (error) {
    console.error('Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();
