"""Transições do acordo de serviço que dependem de prazo.

    Pendente Pagamento --(pagou)--> Ativo --(freelancer entregou)-->
    Aguardando confirmação --(contratante confirmou ou prazo venceu)--> Concluído

Sem pagamento dentro de PRAZO_PAGAMENTO_HORAS, o acordo é cancelado e a vaga
volta a receber candidaturas. Não há cron: `processar_prazos()` é chamado nas
telas que listam acordos (mesmo padrão de `Ad.atualizar_vencidos`) e pelo
comando `python manage.py processar_prazos`.
"""

from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Ad, AcordoServico, Candidatura


def processar_prazos():
    """Expira pagamentos vencidos e conclui entregas não confirmadas no prazo."""
    agora = timezone.now()
    resultado = {'pagamentos_expirados': 0, 'concluidos_automaticamente': 0}

    limite_pagamento = agora - timedelta(hours=settings.PRAZO_PAGAMENTO_HORAS)
    vencidos = list(AcordoServico.objects.filter(
        status_acordo='Pendente Pagamento',
        data_confirmacao__lt=limite_pagamento,
    ).values_list('pk', flat=True))
    for pk in vencidos:
        with transaction.atomic():
            # skip_locked + nova checagem do status: se duas requisições chegarem
            # juntas (as duas partes abrindo a página), só uma processa e notifica.
            acordo = AcordoServico.objects.select_for_update(skip_locked=True).filter(
                pk=pk, status_acordo='Pendente Pagamento',
            ).first()
            if acordo:
                expirar_pagamento(acordo)
                resultado['pagamentos_expirados'] += 1

    limite_confirmacao = agora - timedelta(hours=settings.PRAZO_CONFIRMACAO_HORAS)
    a_concluir = list(AcordoServico.objects.filter(
        status_acordo='Aguardando confirmação',
        entregue_em__lt=limite_confirmacao,
    ).exclude(solicitacoes_cancelamento__status='pendente').values_list('pk', flat=True))
    for pk in a_concluir:
        with transaction.atomic():
            acordo = AcordoServico.objects.select_for_update(skip_locked=True).filter(
                pk=pk, status_acordo='Aguardando confirmação',
            ).first()
            # Um problema relatado congela a conclusão automática até a moderação decidir
            if acordo and not acordo.solicitacoes_cancelamento.filter(status='pendente').exists():
                concluir_acordo(acordo, origem='automatico')
                resultado['concluidos_automaticamente'] += 1

    return resultado


def expirar_pagamento(acordo):
    """Cancela o acordo cujo prazo de pagamento venceu e reabre a vaga."""
    from .notificacoes import criar_notificacao

    agora = timezone.now()
    acordo.status_acordo = 'Cancelado'
    acordo.cancelado_em = agora
    acordo.motivo_cancelamento = 'prazo_pagamento'
    acordo.save(update_fields=['status_acordo', 'cancelado_em', 'motivo_cancelamento'])
    acordo.pagamentos.filter(status='pendente').update(
        status='cancelado',
        detalhe_status='prazo_pagamento_expirado',
    )
    acordo.solicitacoes_cancelamento.filter(status='pendente').update(
        status='aprovada',
        resposta_admin='Acordo cancelado automaticamente: o prazo de pagamento terminou.',
        analisado_em=agora,
    )

    candidatura = acordo.candidatura
    if candidatura:
        # .update() para não passar pelo Candidatura.save, que cria o acordo
        Candidatura.objects.filter(pk=candidatura.pk).update(status='cancelada', atualizado_em=agora)
        if candidatura.ad_id:
            Candidatura.objects.filter(ad_id=candidatura.ad_id, status='encerrada').update(
                status='pendente', atualizado_em=agora,
            )
            Ad.objects.filter(pk=candidatura.ad_id, status_anuncio='Finalizado').update(
                status_anuncio='Em aberto', atualizado_em=agora,
            )

    contratante, freelancer = acordo.partes()
    criar_notificacao(
        usuario=contratante,
        tipo='acordo',
        titulo='Acordo cancelado por falta de pagamento',
        mensagem=f'O prazo para pagar o acordo "{acordo.titulo_anuncio}" terminou e ele foi cancelado. A vaga voltou a receber candidaturas.',
        link='/my-freelas',
    )
    criar_notificacao(
        usuario=freelancer,
        tipo='acordo',
        titulo='Acordo cancelado por falta de pagamento',
        mensagem=f'O contratante não pagou o acordo "{acordo.titulo_anuncio}" dentro do prazo e ele foi cancelado.',
        link='/my-freelas',
    )


def concluir_acordo(acordo, origem='contratante'):
    """Conclui o acordo e libera as avaliações das duas partes.

    `origem`: 'contratante' (confirmou a conclusão), 'automatico' (prazo de
    confirmação terminou) ou 'moderacao' (problema relatado foi recusado).
    """
    from .notificacoes import criar_notificacao

    acordo.status_acordo = 'Concluído'
    acordo.concluido_em = timezone.now()
    acordo.save(update_fields=['status_acordo', 'concluido_em'])

    contratante, freelancer = acordo.partes()
    if origem == 'automatico':
        mensagem = (
            f'O acordo "{acordo.titulo_anuncio}" foi concluído automaticamente porque '
            'o prazo de confirmação terminou. Deixe sua avaliação.'
        )
        destinatarios = (contratante, freelancer)
    elif origem == 'moderacao':
        mensagem = (
            f'A moderação manteve o acordo "{acordo.titulo_anuncio}" e, como o serviço já '
            'tinha sido entregue, ele foi concluído. Deixe sua avaliação.'
        )
        destinatarios = (contratante, freelancer)
    else:
        mensagem = f'O acordo "{acordo.titulo_anuncio}" foi concluído. Deixe sua avaliação.'
        destinatarios = (freelancer,)
    for usuario in destinatarios:
        criar_notificacao(
            usuario=usuario,
            tipo='acordo',
            titulo='Acordo concluído',
            mensagem=mensagem,
            link='/my-reviews',
        )
