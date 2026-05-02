import fs from 'fs';
import path from 'path';

// Load env
const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.substring(1, value.length - 1);
    }
    process.env[match[1]] = value;
  }
});

import { extractPdfText } from './lib/parsers/pdf-parser.ts';

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error('Usage: npx tsx debug_pdf.ts <path-to-pdf>');
    process.exit(1);
  }

  const buffer = fs.readFileSync(pdfPath);
  const text = await extractPdfText(buffer);
  
  console.log('=== EXTRACTED TEXT ===');
  console.log(text);
  console.log('=== END ===');
  
  // Save to file for analysis
  fs.writeFileSync('pdf_text_dump.txt', text);
  console.log('\nSaved to pdf_text_dump.txt');
}

main().catch(console.error);
