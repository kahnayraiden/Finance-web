import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import http from 'http';

const pdfPath = path.resolve('D:/Project Code/Finance Apps/file-pdf/tpbank.pdf');

async function callDebugEndpoint(): Promise<void> {
  const form = new FormData();
  form.append('file', fs.createReadStream(pdfPath), {
    filename: 'tpbank.pdf',
    contentType: 'application/pdf',
  });

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/pdf/debug',
      method: 'POST',
      headers: form.getHeaders(),
      timeout: 130000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
          const result = JSON.parse(data);
          if (result.error) {
            console.error('Error:', result.error);
            console.error('Stack:', result.stack);
          } else {
            console.log(`\nExtracted ${result.length} chars`);
            console.log('\n=== First 30 lines ===');
            result.lines.forEach((l: string, i: number) => console.log(`${i+1}: ${l}`));
          }
        } catch {
          console.log('Raw:', data.substring(0, 500));
        }
        resolve();
      });
    });
    req.on('error', reject);
    form.pipe(req);
  });
}

callDebugEndpoint().catch(console.error);
