import fs from 'fs';
import path from 'path';
import { createWorker, PSM } from 'tesseract.js';
import canvasModule from 'canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function testOcr() {
  const buffer = fs.readFileSync('C:\\Users\\DAT\\Downloads\\tpbank.pdf');
  const canvasFactory = {
    create(width: number, height: number) {
      const canvas = canvasModule.createCanvas(width, height);
      return { canvas, context: canvas.getContext("2d") };
    },
    reset(obj: any, width: number, height: number) {
      obj.canvas.width = width;
      obj.canvas.height = height;
    },
    destroy(obj: any) {
      obj.canvas.width = 0;
      obj.canvas.height = 0;
    },
  };

  const loadingTask = (pdfjsLib as any).getDocument({
    data: new Uint8Array(buffer),
    canvasFactory,
  });
  const pdfDoc = await loadingTask.promise;
  
  const worker = await createWorker('vie+eng');
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK, // PSM 6
  });

  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 4.0 });
  const { canvas, context } = canvasFactory.create(
    Math.ceil(viewport.width),
    Math.ceil(viewport.height)
  );
  await page.render({ canvasContext: context, viewport, canvasFactory }).promise;
  const imgBuf = (canvas as any).toBuffer("image/png");
  
  const { data: { text } } = await worker.recognize(imgBuf);
  console.log(text);
  await worker.terminate();
}

testOcr().catch(console.error);
