import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const workbook = XLSX.readFile('NS CLIENT FILES - (4).xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet) as any[];

console.log('Search for NS103:');
console.log(data.filter(row => row['FILE NO'] === 'NS103'));

console.log('Search for duplicates of NS103 name if any:');
const targetName = data.find(row => row['FILE NO'] === 'NS103')?.['CLIENT NAME'];
console.log(data.filter(row => row['CLIENT NAME'] === targetName));
