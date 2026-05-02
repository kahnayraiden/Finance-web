const testLines = [
  '15/02/2026 23/02/2026 PAYOO-MINISTOP 8015,Q BINH THANHVIET NAM VND 51.000 NT"',
  '16/02/2026 23/02/2026 MMVN-HIEP PHU,HO CHI MINHVIET NAM VND 1.563.105 15633059. II',
  '17/02/2026 23/02/2026 Onlyfans.Com,LondonUNITED KINGDOM USD 9.20 246.945 1',
  '18/02/2026 23/02/2026 PAYOO-MINISTOP 8015,Q BINH THANHVIET NAM VND 104.000 104.000 1]',
  '20/02/2026 23/02/2026 PY-VCB-STARBUCKS 4211,HO CHI MINHVIET NAM VND 261.000 261.000 L |',
  '21/02/2026 23/02/2026 NISO CORP,HO CHI MINHVIET NAM VND 776.790 76790 II',
  '22/02/2026 26/02/2026 PLX_CNVT_CH 120,8A RIA - VUNGVIET NAM VND 70000 7000 II',
  '| 0303/2028 | 03032025 TTQUATPBANKEBANE | \\ND24000O 2400000',
  '| 26022026 26/02/2026 CREDIT HOANTINEVOKY21/11-20/1225MN | WND1SI7S 1537',
  '| 02032026 | 05032025 ShopeeVNHaNoVIETNAM | wI21s0 322150'
];

function normalizeCurrency(raw) {
  let cleaned = raw.replace(/VND|đ|₫/gi, '').replace(/\s/g, '').trim();
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) cleaned = cleaned.replace(/\./g, '');
  else if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) cleaned = cleaned.replace(/,/g, '');
  else cleaned = cleaned.replace(/,/g, '');
  return Math.abs(parseFloat(cleaned)) || 0;
}

for (const line of testLines) {
  const cleaned = line.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
  const normalizedLine = cleaned
    .replace(/\b(\d{2})(\d{2})\/(\d{4})\b/g, '$1/$2/$3')
    .replace(/\b(\d{2})(\d{2})(\d{4})\b/g, '$1/$2/$3');
  const m = normalizedLine.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+)$/);
  if (!m) continue;
  
  const rest = m[3].replace(/(?:\\ND|WND|wND|WD|VND|USD|EUR)\s*/gi, '').trim();
  const tokens = rest.split(/\s+/);
  
  // A valid amount must be pure numbers/separators AND be >= 3 digits long
  const isValidAmount = (t) => /^[\d.,]+$/.test(t) && t.replace(/[.,]/g, '').length >= 3;
  
  // Find indices of all valid amounts
  const amountIndices = [];
  for (let i = 0; i < tokens.length; i++) {
    if (isValidAmount(tokens[i])) {
      amountIndices.push(i);
    }
  }
  
  if (amountIndices.length === 0) {
    console.log(`Date: ${m[1]} | NO AMOUNTS FOUND`);
    continue;
  }
  
  // We only care about the last 1 or 2 amounts
  const targetIndices = amountIndices.slice(-2);
  const firstAmountIdx = targetIndices[0];
  
  let debit = 0;
  let credit = 0;
  if (targetIndices.length >= 2) {
    debit = normalizeCurrency(tokens[targetIndices[0]]);
    credit = normalizeCurrency(tokens[targetIndices[1]]);
  } else {
    debit = normalizeCurrency(tokens[targetIndices[0]]);
  }
  
  const amount = Math.max(debit, credit);

  const desc = tokens.slice(0, firstAmountIdx).join(' ').trim().replace(/\s+[^\w\s]{1,3}$/, '').trim();
  
  const amountStrs = targetIndices.map(i => tokens[i]).join(', ');
  console.log(`Date: ${m[1]} | Amounts: [${amountStrs}] | Parsed: ${amount} | Desc: ${desc.substring(0, 40)}`);
}
