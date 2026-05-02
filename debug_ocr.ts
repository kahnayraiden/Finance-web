/**
 * OCR-based PDF text extraction using pdfjs-dist with NodeCanvasFactory.
 */

import fs from 'fs';
import path from 'path';
import { createCanvas, Image, createImageData } from 'canvas';

// NodeCanvasFactory for pdfjs-dist
class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  }
  reset(canvasAndCtx: any, width: number, height: number) {
    canvasAndCtx.canvas.width = width;
    canvasAndCtx.canvas.height = height;
  }
  destroy(canvasAndCtx: any) {
    canvasAndCtx.canvas.width = 0;
    canvasAndCtx.canvas.height = 0;
  }
}

async function extractTextFromPdfWithOCR(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as any);
  const { createWorker } = await import('tesseract.js');

  const canvasFactory = new NodeCanvasFactory();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    canvasFactory,
  });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  console.log(`[ocr] PDF has ${numPages} pages`);

  const worker = await createWorker('vie+eng', 1, {
    logger: (m: any) => {
      if (m.status === 'recognizing text') {
        process.stdout.write(`\r[ocr] Recognizing: ${(m.progress * 100).toFixed(0)}%   `);
      }
    }
  });

  let fullText = '';

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    console.log(`\n[ocr] Rendering page ${pageNum}/${numPages}...`);
    const page = await pdfDoc.getPage(pageNum);

    const scale = 2.0;
    const viewport = page.getViewport({ scale });
    const { canvas, context } = canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));

    await page.render({
      canvasContext: context,
      viewport,
      canvasFactory,
    }).promise;

    const imgBuffer = (canvas as any).toBuffer('image/png');

    console.log(`[ocr] Running OCR on page ${pageNum}...`);
    const { data: { text } } = await worker.recognize(imgBuffer);
    console.log(`\n[ocr] Page ${pageNum} → ${text.length} chars`);
    fullText += `--- PAGE ${pageNum} ---\n${text}\n`;
  }

  await worker.terminate();
  return fullText;
}

async function main() {
  const pdfPath = process.argv[2] || 'C:\\Users\\DAT\\Downloads\\tpbank.pdf';
  console.log(`Reading ${pdfPath}...`);
  const buffer = fs.readFileSync(pdfPath);
  console.log(`File size: ${buffer.length} bytes`);

  const text = await extractTextFromPdfWithOCR(buffer);

  fs.writeFileSync('ocr_output.txt', text);
  console.log('\n=== FIRST 3000 CHARS ===');
  console.log(text.substring(0, 3000));
  console.log(`\nSaved to ocr_output.txt (total ${text.length} chars)`);
}

main().catch(console.error);
