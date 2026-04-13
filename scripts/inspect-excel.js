/**
 * Inspect Excel Documents
 * Run locally to see the structure
 */
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const catalogueFile = 'nairobi_sculpt_clean_catalogue.xlsx';
const priceFile = 'NAIROBI SCULPT PRICELIST (1).xlsx';

console.log('=== CATALOGUE ===');
const catBuffer = readFileSync(catalogueFile);
const cat = XLSX.read(catBuffer);
console.log('Sheets:', Object.keys(cat.Sheets));
const catSheet = cat.Sheets['Catalogue'];
const catData = XLSX.utils.sheet_to_json(catSheet, { header: 1 });
console.log('Rows:', catData.length);
console.log('Columns:', catData[0]);
console.log('Sample row:', catData[1]);

console.log('\n=== PRICELIST ===');
const priceBuffer = readFileSync(priceFile);
const price = XLSX.read(priceBuffer);
console.log('Sheets:', Object.keys(price.Sheets));
const priceSheet = price.Sheets['Sheet1'];
const priceData = XLSX.utils.sheet_to_json(priceSheet, { header: 1 });
console.log('Rows:', priceData.length);
console.log('Columns:', priceData[0]);
console.log('Sample row:', priceData[1]);