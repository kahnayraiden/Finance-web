import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import http from 'http';

const pdfPath = path.resolve('D:/Project Code/Finance Apps/file-pdf/tpbank.pdf');

// Simple timer to detect if OCR ran or not
const startTime = Date.now();

async function uploadPdf(cardId: string): Promise<void> {
  const form = new FormData();
  form.append('cardId', cardId);
  form.append('file', fs.createReadStream(pdfPath), {
    filename: 'tpbank.pdf',
    contentType: 'application/pdf',
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/pdf/upload',
      method: 'POST',
      headers: form.getHeaders(),
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n=== API Response (took ${elapsed}s) ===`);
        console.log('Status:', res.statusCode);
        try {
          console.log('Body:', JSON.stringify(JSON.parse(data), null, 2));
        } catch {
          console.log('Body (raw):', data);
        }
        if (parseFloat(elapsed) < 5) {
          console.log('\n⚠️  Response was TOO FAST! OCR did NOT run (should take ~30s).');
          console.log('This means pdfjs-dist/tesseract.js failed to load in Next.js context.');
        } else {
          console.log('\n✅ OCR likely ran (took >5s).');
        }
        resolve();
      });
    });

    req.setTimeout(130000); // 130s timeout
    req.on('error', (e) => { console.error('Request error:', e.message); reject(e); });
    req.on('timeout', () => { console.error('Request TIMED OUT after 130s'); req.destroy(); reject(new Error('timeout')); });
    form.pipe(req);
  });
}

const cardId = '53fd0fa5-e9b3-4a0a-afa2-14d9073fd90c';
console.log(`Uploading PDF to card ${cardId}...`);
uploadPdf(cardId).catch(console.error);
