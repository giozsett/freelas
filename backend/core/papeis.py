"""Papéis de usuário do Freelas.

Cada conta tem um único papel, escolhido no cadastro e que não muda mais:
freelancer, contratante ou administrador (só superusuários do Django).

Só o contratante publica anúncios (vagas) e só o freelancer se candidata.
Por isso, em todo acordo o autor do anúncio é o contratante (quem paga) e
quem se candidatou é o freelancer.
"""

PAPEL_FREELANCER = 'freelancer'
PAPEL_CONTRATANTE = 'contratante'
PAPEL_ADMIN = 'administrador'

PAPEIS_USUARIO = (
    (PAPEL_FREELANCER, 'Freelancer'),
    (PAPEL_CONTRATANTE, 'Contratante'),
    (PAPEL_ADMIN, 'Administrador'),
)

# O papel de administrador nunca é escolhido pela interface.
PAPEIS_ESCOLHIVEIS = (
    (PAPEL_FREELANCER, 'Freelancer'),
    (PAPEL_CONTRATANTE, 'Contratante'),
)

# Valor de `Ad.role` de toda vaga publicada por contratante.
ANUNCIO_VAGA = 'contractor'
# Anúncios antigos publicados por freelancers (antes da regra de papéis
# fixos): não aparecem mais nas listagens e não recebem candidaturas.
ANUNCIO_LEGADO_FREELANCER = 'freelancer'


def papel_do_usuario(user):
    profile = getattr(user, 'profile', None)
    return getattr(profile, 'papel', None)
