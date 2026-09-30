// Papéis fixos das contas (espelha backend/core/papeis.py). O papel é
// escolhido uma única vez, logo após o cadastro, e não muda mais. Só o
// contratante publica anúncios (vagas) e paga; só o freelancer se candidata.
export const PAPEL_FREELANCER = 'freelancer';
export const PAPEL_CONTRATANTE = 'contratante';
export const PAPEL_ADMIN = 'administrador';

// Rótulos das reputações exibidas no perfil. A API devolve só a do papel da
// conta; contas antigas, sem papel, ainda recebem as duas.
export const PAPEIS_REPUTACAO = [
  { key: PAPEL_FREELANCER, label: 'Freelancer', className: 'salmon' },
  { key: PAPEL_CONTRATANTE, label: 'Contratante', className: 'purple' },
];
