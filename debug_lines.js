// Debug why clean lines are not being parsed

const testLines = [
  '15/02/2026 23/02/2026 PAYOO-MINISTOP 8015,Q BINH THANHVIET NAM VND 51.000 NT"',
  '16/02/2026 23/02/2026 MMVN-HIEP PHU,HO CHI MINHVIET NAM VND 1.563.105 15633059. II',
  '17/02/2026 23/02/2026 Onlyfans.Com,LondonUNITED KINGDOM USD 9.20 246.945 1',
  '18/02/2026 23/02/2026 PAYOO-MINISTOP 8015,Q BINH THANHVIET NAM VND 104.000 104.000 1]',
  '20/02/2026 23/02/2026 PY-VCB-STARBUCKS 4211,HO CHI MINHVIET NAM VND 261.000 261.000 L |',
  '21/02/2026 23/02/2026 NISO CORP,HO CHI MINHVIET NAM VND 776.790 76790 II',
  '22/02/2026 26/02/2026 PLX_CNVT_CH 120,8A RIA - VUNGVIET NAM VND 70000 7000 II',
];

function isValidAmount(t) {
  return /^[\d.,]+$/.test(t) && t.replace(/[.,]/g, '').length >= 3;
}

function normalizeCurrency(raw) {
  let cleaned = raw.replace(/VND|đ|₫/gi, '').replace(/\s/g, '').trim();
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) cleaned = cleaned.replace(/\./g, '');
  else if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) cleaned = cleaned.replace(/,/g, '');
  else cleaned = cleaned.replace(/,/g, '');
  return Math.abs(parseFloat(cleaned)) || 0;
}

for (const line of testLines) {
  const cleaned = line.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
  const m = cleaned.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+)$/);
  if (!m) { console.log('NO MATCH:', line.substring(0,40)); continue; }
  
  const rest = m[3].replace(/(?:\\ND|WND|wND|WD|VND|USD|EUR)\s*/gi, '').trim();
  const tokens = rest.split(/\s+/);
  
  const amountTokens = [];
  let descEndIdx = tokens.length;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const tok = tokens[i];
    if (isValidAmount(tok)) {
      amountTokens.unshift(tok);
      descEndIdx = i;
    } else if (tok.length <= 3 && !/\d/.test(tok)) {
      break;
    } else {
      break;
    }
  }
  
  const amount = amountTokens.length >= 2 
    ? Math.max(normalizeCurrency(amountTokens[amountTokens.length-2]), normalizeCurrency(amountTokens[amountTokens.length-1]))
    : amountTokens.length === 1 ? normalizeCurrency(amountTokens[0]) : 0;

  const desc = tokens.slice(0, descEndIdx).join(' ').trim();
  
  console.log(`Date: ${m[1]}  |  Amounts: ${JSON.stringify(amountTokens)}  |  Amount: ${amount.toLocaleString()}  |  Desc: ${desc.substring(0,40)}`);
}
