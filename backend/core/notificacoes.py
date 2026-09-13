from .models import Notificacao


def criar_notificacao(usuario, tipo, titulo, mensagem='', link='', ad=None):
    """Cria um registro de notificação para um usuário (sem lançar erro).

    Se `mensagem` contiver o placeholder "{ad_titulo}" e `ad` for informado,
    o título do anúncio é resolvido dinamicamente na leitura (ver
    NotificacaoSerializer), refletindo edições futuras do título.
    """
    if not usuario:
        return None
    try:
        return Notificacao.objects.create(
            usuario=usuario,
            tipo=tipo,
            titulo=titulo[:255],
            mensagem=mensagem or '',
            link=link or '',
            ad=ad,
        )
    except Exception:
        return None
