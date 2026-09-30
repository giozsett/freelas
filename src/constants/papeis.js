// Papéis fixos das contas (espelha backend/core/papeis.py). O papel é
// escolhido uma única vez, logo após o cadastro, e não muda mais. Só o
// contratante publica anúncios (vagas) e paga; só o freelancer se candidata.
export const PAPEL_FREELANCER = 'freelancer';
export const PAPEL_CONTRATANTE = 'contratante';
export const PAPEL_ADMIN = 'administrador';
