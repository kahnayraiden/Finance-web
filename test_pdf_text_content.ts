import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function testGetTextContent() {
  const buffer = fs.readFileSync('C:\\Users\\DAT\\Downloads\\tpbank.pdf');
  
  const loadingTask = (pdfjsLib as any).getDocument({
    data: new Uint8Array(buffer),
    // disableFontFace: true
  });
  
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  console.log('Pages:', numPages);

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items.map((item: any) => item.str);
    console.log(`Page ${i} extracted text items:`, items.length);
    if (items.length > 0) {
      console.log(`Page ${i} text:`, items.join(' ').substring(0, 500));
    }
  }
}

testGetTextContent().catch(console.error);
