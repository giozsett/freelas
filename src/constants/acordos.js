// Ciclo do acordo (espelha backend/core/models.py e backend/core/ciclo_acordo.py):
// Pendente Pagamento → Ativo → Aguardando confirmação → Concluído (ou Cancelado).
export const STATUS_AGUARDANDO_CONFIRMACAO = 'Aguardando confirmação';

// Motivos do "Relatar problema" (SolicitacaoCancelamentoAcordo.MOTIVOS)
export const MOTIVOS_PROBLEMA = [
  ['nao_compareceu', 'O freelancer não compareceu'],
  ['nao_entregou', 'O serviço não foi entregue'],
  ['fora_do_combinado', 'O serviço foi entregue fora do combinado'],
  ['desistencia', 'Desistência de uma das partes'],
  ['outro', 'Outro motivo'],
];

export const ROTULO_MOTIVO_PROBLEMA = Object.fromEntries(MOTIVOS_PROBLEMA);

// Motivo gravado no acordo cancelado (AcordoServico.MOTIVOS_CANCELAMENTO)
export const ROTULO_MOTIVO_CANCELAMENTO = {
  prazo_pagamento: 'Prazo de pagamento expirado',
  moderacao: 'Cancelado pela moderação',
};

export function formatarDataHora(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
