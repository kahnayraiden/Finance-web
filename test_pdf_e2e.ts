import fs from 'fs';
import path from 'path';

// Load env
const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.substring(1, value.length - 1);
    }
    process.env[match[1]] = value;
  }
});

import { extractPdfText, parsePdfText } from './lib/parsers/pdf-parser.ts';

async function main() {
  const pdfPath = process.argv[2] || 'C:\\Users\\DAT\\Downloads\\tpbank.pdf';
  const buffer = fs.readFileSync(pdfPath);
  console.log('File size:', buffer.length, 'bytes');

  const text = await extractPdfText(buffer);
  console.log('Extracted', text.length, 'chars');

  const results = parsePdfText(text);
  console.log('\nParsed', results.length, 'transactions:');
  results.forEach(r => {
    console.log(` ${r.date.toISOString().split('T')[0]}  ${r.amount.toLocaleString('vi-VN').padStart(14)}  ${r.description.substring(0,50)}`);
  });
}

main().catch(console.error);
