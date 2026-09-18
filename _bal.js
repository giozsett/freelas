const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8').replace(/\\r/g, '\n');
const linhas = s.split('\n');
let bal = 0;
let zeroAntes = null;
const chegaZero = [];
for (let i = 0; i < linhas.length; i++) {
  let l = linhas[i];
  for (const ch of l) {
    if (ch === '{') bal++;
    if (ch === '}') bal--;
  }
  if (bal === 0 && i < linhas.length - 1) chegaZero.push(i + 1);
}
console.log('saldo final:', bal);
console.log('ietapas que zeram antes do fim:', chegaZero.slice(0, 20).join(','));
