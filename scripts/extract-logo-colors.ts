/**
 * Extract dominant colors from logo.png
 * This script analyzes the logo and extracts the 2 main brand colors
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function extractColors() {
  const logoPath = path.join(process.cwd(), 'public', 'logo.png');
  
  if (!fs.existsSync(logoPath)) {
    console.error('Logo file not found at:', logoPath);
    process.exit(1);
  }

  try {
    // Get image metadata
    const metadata = await sharp(logoPath).metadata();
    console.log('Logo dimensions:', metadata.width, 'x', metadata.height);
    console.log('Logo format:', metadata.format);

    // Resize for faster processing (if large)
    const resized = metadata.width! > 500 
      ? await sharp(logoPath).resize(500, 500, { fit: 'inside' })
      : await sharp(logoPath);

    // Extract dominant colors using k-means clustering
    const { dominant } = await resized.stats();
    
    // Get all unique colors and their counts
    const { data, info } = await resized
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Sample pixels (every 10th pixel for performance)
    const colors: Map<string, number> = new Map();
    const step = 10;
    
    for (let i = 0; i < data.length; i += info.channels * step) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = info.channels === 4 ? data[i + 3] : 255;
      
      // Skip transparent pixels
      if (a < 128) continue;
      
      // Round to reduce color variations
      const roundedR = Math.round(r / 10) * 10;
      const roundedG = Math.round(g / 10) * 10;
      const roundedB = Math.round(b / 10) * 10;
      
      const colorKey = `${roundedR},${roundedG},${roundedB}`;
      colors.set(colorKey, (colors.get(colorKey) || 0) + 1);
    }

    // Sort by frequency and get top colors
    const sortedColors = Array.from(colors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('\nTop 10 colors found:');
    sortedColors.forEach(([color, count], index) => {
      const [r, g, b] = color.split(',').map(Number);
      const hex = `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
      console.log(`${index + 1}. RGB(${r}, ${g}, ${b}) = ${hex} (${count} occurrences)`);
    });

    // Get the 2 most dominant colors (excluding white/black/grays)
    const brandColors = sortedColors
      .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number);
        const hex = `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
        const saturation = Math.max(r, g, b) - Math.min(r, g, b);
        return { r, g, b, hex, saturation };
      })
      .filter(color => {
        // Filter out near-white, near-black, and low-saturation colors
        const brightness = (color.r + color.g + color.b) / 3;
        return brightness > 30 && brightness < 225 && color.saturation > 20;
      })
      .slice(0, 2);

    console.log('\n🎨 Brand Colors Extracted:');
    brandColors.forEach((color, index) => {
      console.log(`Color ${index + 1}: ${color.hex} (RGB: ${color.r}, ${color.g}, ${color.b})`);
    });

    // Generate Tailwind config snippet
    if (brandColors.length >= 2) {
      const color1 = brandColors[0];
      const color2 = brandColors[1];
      
      console.log('\n📝 Add these to your Tailwind config:');
      console.log(`
brand: {
  primary: '${color1.hex}',
  secondary: '${color2.hex}',
},
      `);
    }

    return brandColors;
  } catch (error) {
    console.error('Error processing logo:', error);
    process.exit(1);
  }
}

extractColors();
