const fs = require('fs');
const text = fs.readFileSync('ocr_output.txt', 'utf-8');

function normalizeCurrency(raw) {
  let cleaned = raw.replace(/VND|đ|₫/gi, '').replace(/\s/g, '').trim();
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) cleaned = cleaned.replace(/\./g, '');
  else if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) cleaned = cleaned.replace(/,/g, '');
  else cleaned = cleaned.replace(/,/g, '');
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : Math.abs(value);
}

function parseDate(raw) {
  const m = raw.trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
  return null;
}

const results = [];
const lines = text.split('\n');

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 20) continue;

  const cleaned = trimmed.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
  const normalizedLine = cleaned
    .replace(/\b(\d{2})(\d{2})\/(\d{4})\b/g, '$1/$2/$3')
    .replace(/\b(\d{2})(\d{2})(\d{4})\b/g, '$1/$2/$3');

  const m = normalizedLine.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+)$/);
  if (!m) continue;

  const txDate = parseDate(m[1]);
  if (!txDate) continue;

  const cleanRest = m[3].replace(/(?:\\ND|WND|wND|VND|USD|EUR)\s*/gi, '').trim();
  const tokens = cleanRest.split(/\s+/);
  const amountRx = /^[\d.,]+$/;
  const amountTokens = [];
  let descEndIdx = tokens.length;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (amountRx.test(tokens[i]) && tokens[i].length >= 2) {
      amountTokens.unshift(tokens[i]);
      descEndIdx = i;
    } else break;
  }
  if (amountTokens.length === 0) continue;

  const description = tokens.slice(0, descEndIdx).join(' ').trim();
  if (!description || description.length < 2) continue;

  let debit = 0, credit = 0;
  if (amountTokens.length >= 2) {
    debit = normalizeCurrency(amountTokens[amountTokens.length - 2]);
    credit = normalizeCurrency(amountTokens[amountTokens.length - 1]);
  } else {
    debit = normalizeCurrency(amountTokens[0]);
  }

  const amount = debit > 0 ? debit : credit;
  if (amount <= 0) continue;

  results.push({
    date: txDate.toISOString().split('T')[0],
    description: description.substring(0, 55),
    amount
  });
}

console.log('Parsed transactions:', results.length);
results.forEach(r => console.log(`  ${r.date}  ${r.amount.toLocaleString().padStart(12)}  ${r.description}`));
