import fs from 'fs';
import path from 'path';

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

async function extractWithPdfParse(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return data.text;
  } catch (e) {
    console.error('pdf-parse failed:', e);
    return '';
  }
}

async function extractWithPdfJs(buffer: Buffer): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdfDoc = await loadingTask.promise;
    
    console.log(`[pdfjs] Pages: ${pdfDoc.numPages}`);
    let fullText = '';
    
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      
      // Group items by Y position to reconstruct lines
      const items = content.items as any[];
      const lineMap = new Map<number, string[]>();
      
      for (const item of items) {
        if (!('str' in item)) continue;
        const y = Math.round(item.transform[5]);
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y)!.push(item.str);
      }
      
      // Sort lines by Y desc (top to bottom) and join
      const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
      for (const y of sortedYs) {
        const line = lineMap.get(y)!.join(' ').trim();
        if (line) fullText += line + '\n';
      }
    }
    return fullText;
  } catch (e) {
    console.error('pdfjs-dist failed:', e);
    return '';
  }
}

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error('Usage: npx tsx debug_pdf2.ts <path-to-pdf>');
    process.exit(1);
  }

  const buffer = fs.readFileSync(pdfPath);
  console.log(`File size: ${buffer.length} bytes`);

  console.log('\n=== pdf-parse output ===');
  const text1 = await extractWithPdfParse(buffer);
  console.log(`Length: ${text1.length}`);
  console.log(text1.substring(0, 500));

  console.log('\n=== pdfjs-dist output ===');
  const text2 = await extractWithPdfJs(buffer);
  console.log(`Length: ${text2.length}`);
  console.log(text2.substring(0, 2000));

  // Save both to files
  fs.writeFileSync('pdf_parse_output.txt', text1);
  fs.writeFileSync('pdfjs_output.txt', text2);
  console.log('\nSaved outputs to pdf_parse_output.txt and pdfjs_output.txt');
}

main().catch(console.error);
