export function calcularTempo(dataInicio, dataFim, atual) {
  const inicio = new Date(dataInicio + 'T00:00:00');
  const fim = atual ? new Date() : new Date(dataFim + 'T00:00:00');

  let anos = fim.getFullYear() - inicio.getFullYear();
  let meses = fim.getMonth() - inicio.getMonth();

  if (meses < 0) {
    anos--;
    meses += 12;
  }

  const partes = [];
  if (anos > 0) partes.push(`${anos}a`);
  if (meses > 0) partes.push(`${meses}m`);
  if (partes.length === 0) partes.push('0m');

  return partes.join(' ');
}
