import fs from 'fs';
let s = fs.readFileSync(process.argv[2], 'utf8');
let out = [];
const strip = (l) => {
  let r = '';
  let q = null;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (q) {
      if (c === '\\' && i + 1 < l.length) { i++; continue; }
      if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    r += c;
  }
  return r.replace(/\/\/.*$/, '');
};
const linhas = s.split('\n');
let bal = 0;
const zera = [];
for (let i = 0; i < linhas.length; i++) {
  const sl = strip(linhas[i]);
  for (const c of sl) { if (c === '{') bal++; if (c === '}') bal--; }
  if (bal === 0 && i < linhas.length - 1) zera.push(i + 1);
}
console.log('saldo_final_antes_eof:', bal);
console.log('linhas_que_zeram_antes_do_fim:', zera.join(', '));
