// Erros do DRF chegam como { detail }, { campo: [mensagem] } ou [mensagem]
export function primeiraMensagemDeErro(erro, padrao) {
  if (!erro) return padrao;
  if (typeof erro === 'string') return erro;
  if (erro.detail) return erro.detail;
  const primeiro = Array.isArray(erro) ? erro[0] : Object.values(erro)[0];
  if (Array.isArray(primeiro)) return primeiro[0] || padrao;
  return typeof primeiro === 'string' ? primeiro : padrao;
}
