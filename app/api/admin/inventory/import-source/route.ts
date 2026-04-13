/**
 * Create Inventory Catalog from Excel Documents
 * Reads from catalogue and pricelist, merges data, and creates inventory items
 */

import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';

export async function GET(): Promise<NextResponse> {
  try {
    const cataloguePath = process.cwd() + '/nairobi_sculpt_clean_catalogue.xlsx';
    const pricePath = process.cwd() + '/NAIROBI SCULPT PRICELIST (1).xlsx';
    
    if (!existsSync(cataloguePath) || !existsSync(pricePath)) {
      return NextResponse.json(
        { success: false, error: 'Excel files not found' },
        { status: 404 }
      );
    }
    
    const XLSX = require('xlsx');
    
    // Read catalogue
    const catBuffer = readFileSync(cataloguePath);
    const catWorkbook = XLSX.read(catBuffer);
    const catSheet = catWorkbook.Sheets['Catalogue'];
    const catData = XLSX.utils.sheet_to_json(catSheet, { header: 1 });
    const catRows = catData.slice(2); // Skip header
    
    // Read pricelist
    const priceBuffer = readFileSync(pricePath);
    const priceWorkbook = XLSX.read(priceBuffer);
    const priceSheet = priceWorkbook.Sheets['Sheet1'];
    const priceData = XLSX.utils.sheet_to_json(priceSheet, { header: 1 });
    const priceRows = priceData.slice(1);
    
    // Create price lookup map
    const priceMap = new Map();
    priceRows.forEach((row: any) => {
      const name = String(row[0] || '').trim();
      const price = parseFloat(row[1]) || 0;
      if (name && price > 0) {
        priceMap.set(name.toLowerCase(), price);
      }
    });
    
    // Category mapping
    const categoryMap: Record<string, string> = {
      'AESTHETICS & IMPLANTS': 'IMPLANT',
      'AIRWAY MANAGEMENT': 'DISPOSABLE',
      'ANAESTHETIC AGENTS': 'ANESTHETIC',
      'BANDAGES & TAPES': 'DISPOSABLE',
      'CATHETERS & TUBES': 'DISPOSABLE',
      'DIAGNOSTICS & MONITORING': 'DISPOSABLE',
      'DRESSINGS': 'DRESSING',
      'GASES': 'DISPOSABLE',
      'IV ACCESS & SYRINGES': 'DISPOSABLE',
      'IV FLUIDS': 'DISPOSABLE',
      'IV MEDICATIONS': 'MEDICATION',
      'STERILIZATION & CLEANING': 'DISPOSABLE',
      'SUTURES': 'SUTURE',
      'THEATER CONSUMABLES': 'DISPOSABLE',
    };
    
    // Process catalogue items
    const inventoryItems: Array<{
      name: string;
      sku: string | null;
      category: string;
      unit_of_measure: string;
      unit_cost: number;
      is_billable: boolean;
      is_active: boolean;
    }> = [];
    
    const seenItems = new Set<string>();
    
    catRows.forEach((row: any) => {
      const category = String(row[0] || '').trim();
      const catCode = String(row[1] || '').trim();
      const itemCode = String(row[2] || '').trim();
      const itemName = String(row[3] || '').trim();
      const type = String(row[4] || '').trim();
      const unit = String(row[5] || '').trim();
      const sellingPrice = parseFloat(row[6]) || 0;
      
      if (!itemName || category === 'Category' || category === 'NAIROBI SCULPT') return;
      
      // Generate SKU if missing
      const sku = itemCode || (catCode + '-' + itemName.substring(0, 3).toUpperCase());
      const key = sku.toLowerCase();
      
      if (seenItems.has(key)) return;
      seenItems.add(key);
      
      // Get price from pricelist first, fallback to catalogue
      let price = 0;
      const priceMatch = priceMap.get(itemName.toLowerCase());
      if (priceMatch) {
        price = priceMatch;
      } else if (sellingPrice > 0) {
        price = sellingPrice;
      }
      
      // Map category
      const mappedCategory = categoryMap[category] || 'OTHER';
      
      inventoryItems.push({
        name: itemName,
        sku: sku,
        category: mappedCategory,
        unit_of_measure: unit || 'unit',
        unit_cost: price,
        is_billable: price > 0,
        is_active: true,
      });
    });

    return NextResponse.json({
      success: true,
      data: inventoryItems,
      totalCount: inventoryItems.length,
      priceMatchedCount: [...priceMap.values()].length,
    });
  } catch (error) {
    console.error('Error processing Excel:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process Excel files' },
      { status: 500 }
    );
  }
}