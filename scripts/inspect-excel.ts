
import XLSX from 'xlsx';
import path from 'path';

function inspectExcel(filePath: string) {
    console.log(`--- Checking ${filePath} ---`);
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log(`Sheet name: ${sheetName}`);
        console.log(`Max row: ${data.length}`);
        if (data.length > 0) {
            console.log(`Headers: ${JSON.stringify(data[0])}`);
            if (data.length > 1) console.log(`Row 2: ${JSON.stringify(data[1])}`);
            if (data.length > 2) console.log(`Row 3: ${JSON.stringify(data[2])}`);
        }
    } catch (error: any) {
        console.error(`Error: ${error.message}`);
    }
}

const dir = process.cwd();
inspectExcel(path.join(dir, 'NS CLIENT FILES - (3).xlsx'));
inspectExcel(path.join(dir, 'NS REVENUE.xlsx'));
