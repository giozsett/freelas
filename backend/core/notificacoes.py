from .models import Notificacao


def criar_notificacao(usuario, tipo, titulo, mensagem='', link=''):
    """Cria um registro de notificação para um usuário (sem lançar erro)."""
    if not usuario:
        return None
    try:
        return Notificacao.objects.create(
            usuario=usuario,
            tipo=tipo,
            titulo=titulo[:255],
            mensagem=mensagem or '',
            link=link or '',
        )
    except Exception:
        return None
