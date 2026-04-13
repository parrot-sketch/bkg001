/**
 * GET /api/admin/procedures/import-source
 * 
 * Reads and cleans procedures from NS REVENUE.xlsx for import into the database.
 */

import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';

export async function GET(): Promise<NextResponse> {
  try {
    const filePath = process.cwd() + '/NS REVENUE.xlsx';
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'Excel file not found at ' + filePath },
        { status: 404 }
      );
    }
    
    const buffer = readFileSync(filePath);
    const XLSX = require('xlsx');
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets['Sheet1'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const rows = data.slice(1) as any[];
    
    const excludePatterns = [
      /^TOTAL/i,
      /^________/,
      /^DR\.[A-Z]+ TOTAL/i,
      /^subtotal/i,
      /^grand total/i,
      /^net/i,
    ];
    
    const cleanedProcedures: Array<{
      name: string;
      category: string;
      price: number;
    }> = [];
    
    const seenNames = new Set<string>();
    
    rows.forEach((row) => {
      const col3 = row[3];
      if (!col3) return;
      
      const rawName = String(col3).trim();
      
      if (excludePatterns.some(p => p.test(rawName))) return;
      
      // Split combined procedures (e.g., "Augmentation + Liposuction" or " / ")
      const parts = rawName.split(/\s*\+\s*|\s*\/\s*|\s*&\s*|,\s*/i);
      
      parts.forEach((part: string) => {
        const name = part.trim();
        if (!name || name.length < 2) return;
        
        // Skip if already seen
        if (seenNames.has(name.toLowerCase())) return;
        seenNames.add(name.toLowerCase());
        
        // Try to extract price from column 4 if it exists
        let price = 0;
        const priceCol = row[4];
        if (typeof priceCol === 'number' && priceCol > 0) {
          price = priceCol;
        }
        
        // Determine category based on keywords
        let category = 'Procedure';
        const lowerName = name.toLowerCase();
        
        if (lowerName.includes('consultation') || lowerName.includes('follow up')) {
          category = 'Consultation';
        } else if (lowerName.includes('abdominoplasty') || lowerName.includes('tummy')) {
          category = 'BODY_CONTOURING';
        } else if (lowerName.includes('breast') || lowerName.includes('augmentation') || lowerName.includes('reduction') || lowerName.includes('lift')) {
          category = 'BREAST';
        } else if (lowerName.includes('facelift') || lowerName.includes('rhinoplasty') || lowerName.includes('blepharoplasty') || lowerName.includes('eyelid') || lowerName.includes('nose')) {
          category = 'FACE';
        } else if (lowerName.includes('liposuction') || lowerName.includes('lipo') || lowerName.includes('fat')) {
          category = 'BODY_CONTOURING';
        } else if (lowerName.includes('implants') || lowerName.includes('implant')) {
          category = 'IMPLANT';
        }
        
        cleanedProcedures.push({
          name,
          category,
          price: price || 0,
        });
      });
    });

    // Sort by name
    cleanedProcedures.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      data: cleanedProcedures,
      totalCount: cleanedProcedures.length,
    });
  } catch (error) {
    console.error('Error reading Excel file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read import source' },
      { status: 500 }
    );
  }
}