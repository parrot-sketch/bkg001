// Peek at blank-name rows in the Excel
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const wb = XLSX.readFile('NS CLIENT FILES - (4).xlsx');
const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];

const blanks = data.filter(r => !r['CLIENT NAME'] || String(r['CLIENT NAME']).trim() === '');
console.log(`Blank name rows: ${blanks.length}`);
blanks.forEach(r => console.log(JSON.stringify(r)));
