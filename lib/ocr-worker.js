#!/usr/bin/env node
/**
 * ocr-worker.js
 * Standalone Node.js script that performs OCR on a PDF file.
 * Called as a child process from the Next.js API route.
 *
 * Usage: node ocr-worker.js <base64-pdf-data>
 * Output: JSON string of extracted text to stdout
 */

const { createCanvas } = require('canvas');

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  }
  reset(obj, width, height) {
    obj.canvas.width = width;
    obj.canvas.height = height;
  }
  destroy(obj) {
    obj.canvas.width = 0;
    obj.canvas.height = 0;
  }
}

async function run() {
  // Read base64 PDF data from stdin (to avoid Windows argv length limits)
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const base64Data = Buffer.concat(chunks).toString('utf-8').trim();
  const pdfBuffer = Buffer.from(base64Data, 'base64');

  // Step 1: Try pdf-parse first (fast for text-based PDFs)
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(pdfBuffer);
    if (data.text && data.text.trim().length > 50) {
      process.stdout.write(JSON.stringify({ success: true, text: data.text, method: 'pdf-parse' }));
      return;
    }
  } catch (e) {
    // ignore
  }

  // Step 2: OCR for image-based PDFs
  process.stderr.write('[ocr-worker] Using OCR (image-based PDF)\n');

  const { default: pdfjsLib } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { createWorker } = await import('tesseract.js');

  const canvasFactory = new NodeCanvasFactory();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    canvasFactory,
  });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  process.stderr.write(`[ocr-worker] Pages: ${numPages}\n`);

  const worker = await createWorker('vie+eng');

  let fullText = '';
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    process.stderr.write(`[ocr-worker] OCR page ${pageNum}/${numPages}...\n`);
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const { canvas, context } = canvasFactory.create(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    );

    await page.render({ canvasContext: context, viewport, canvasFactory }).promise;
    const imgBuffer = canvas.toBuffer('image/png');
    const { data: { text } } = await worker.recognize(imgBuffer);
    fullText += text + '\n';
    process.stderr.write(`[ocr-worker] Page ${pageNum}: ${text.length} chars\n`);
  }

  await worker.terminate();
  process.stderr.write(`[ocr-worker] Done: ${fullText.length} total chars\n`);
  process.stdout.write(JSON.stringify({ success: true, text: fullText, method: 'ocr' }));
}

run().catch(err => {
  process.stdout.write(JSON.stringify({ success: false, error: err.message }));
  process.exit(1);
});
