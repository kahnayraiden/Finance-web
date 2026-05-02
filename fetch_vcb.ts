import fs from 'fs';
import path from 'path';
const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.replace(/\\n/gm, '\n');
      value = value.substring(1, value.length - 1);
    }
    process.env[key] = value;
  }
});
import { fetchFinanceEmails } from './lib/gmail.ts';
import { parseEmailBody } from './lib/parsers/email-parser.ts';

async function test() {
  const now = new Date();
  const afterDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const beforeDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  console.log('Fetching emails from', afterDate.toISOString(), 'to', beforeDate.toISOString());
  
  const emails = await fetchFinanceEmails({ afterDate, beforeDate, maxResults: 50 });
  console.log('Fetched', emails.length, 'emails');
  
  let vcbCount = 0;
  for (const email of emails) {
    if (email.subject.toLowerCase().includes('biên lai') && email.subject.toLowerCase().includes('tài khoản')) {
      console.log('Found target VCB email subject:', email.subject);
      fs.writeFileSync('vcb_failing_body.txt', email.body);
      const parsed = parseEmailBody(email.body || '');
      console.log('Parsed:', parsed.length, 'transactions');
      if (parsed.length > 0) {
        console.log(parsed[0]);
        vcbCount++;
      }
    }
  }
  console.log('Total VCB parsed:', vcbCount);
}

test().catch(console.error);
