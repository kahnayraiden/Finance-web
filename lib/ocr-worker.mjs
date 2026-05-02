#!/usr/bin/env node
/**
 * ocr-worker.mjs
 * Standalone ESM script for OCR on image-based PDFs.
 * Called as a child process from the Next.js API route.
 *
 * Input:  base64-encoded PDF data via stdin
 * Output: JSON { success, text, method } to stdout
 * Errors: to stderr
 */

import { createCanvas } from 'canvas';

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
  // Read base64 PDF data from stdin
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const base64Data = Buffer.concat(chunks).toString('utf-8').trim();
  const pdfBuffer = Buffer.from(base64Data, 'base64');

  process.stderr.write(`[ocr-worker] Got ${pdfBuffer.length} bytes\n`);

  // Step 1: Try pdf-parse first (fast for text-based PDFs)
  try {
    const { default: pdfParse } = await import('pdf-parse');
    const data = await pdfParse(pdfBuffer);
    if (data.text && data.text.trim().length > 50) {
      process.stderr.write(`[ocr-worker] pdf-parse: ${data.text.length} chars\n`);
      process.stdout.write(JSON.stringify({ success: true, text: data.text, method: 'pdf-parse' }));
      return;
    }
  } catch (e) {
    process.stderr.write(`[ocr-worker] pdf-parse failed: ${e.message}\n`);
  }

  // Step 2: OCR for image-based PDFs
  process.stderr.write('[ocr-worker] Using OCR (image-based PDF)\n');

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
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
  process.stderr.write(`[ocr-worker] FATAL: ${err.message}\n${err.stack}\n`);
  process.stdout.write(JSON.stringify({ success: false, error: err.message }));
  process.exit(1);
});
