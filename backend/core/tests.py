from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import (
    Ad,
    AcordoServico,
    Avaliacao,
    CartaoUsuario,
    Candidatura,
    Pagamento,
    Report,
    SolicitacaoAlteracaoAcordo,
    SolicitacaoCancelamentoAcordo,
    UserProfile,
    VerificacaoEmail,
)


class MercadoPagoResponse:
    def __init__(self, status_code, data):
        self.status_code = status_code
        self._data = data
        self.content = b'{}'

    def json(self):
        return self._data


class PagamentoAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.contratante = User.objects.create_user(
            username='contratante@example.com',
            email='contratante@example.com',
            password='secret123',
        )
        self.freelancer = User.objects.create_user(
            username='freelancer@example.com',
            email='freelancer@example.com',
            password='secret123',
        )
        self.admin = User.objects.create_user(
            username='admin@example.com',
            email='admin@example.com',
            password='secret123',
            is_staff=True,
        )
        self.ad = Ad.objects.create(
            author=self.contratante,
            title='Criação de site',
            description='Site institucional',
            price='1250.00',
        )
        self.candidatura = Candidatura.objects.create(
            user=self.freelancer,
            ad=self.ad,
            status='pendente',
        )
        self.acordo = AcordoServico.objects.create(
            candidatura=self.candidatura,
            status_acordo='Pendente Pagamento',
            valor_acordado=1250,
            titulo_anuncio='Criação de site',
            descricao_servico='Site institucional',
        )

    @override_settings(DEBUG=False)
    @patch.dict('os.environ', {
        'MERCADO_PAGO_ACCESS_TOKEN': 'TEST-token',
        'BACKEND_PUBLIC_URL': 'https://teste.ngrok-free.dev',
    })
    @patch('core.views.requests.post')
    def test_contratante_abre_checkout_do_valor_integral(self, post):
        post.return_value = MercadoPagoResponse(
            201,
            {'id': 'pref-1', 'init_point': 'https://mercadopago.com/checkout/1'},
        )
        self.client.force_authenticate(self.contratante)

        response = self.client.post(
            '/api/pagamentos/acordo/',
            {'acordo_id': self.acordo.id},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['checkout_required'])
        self.assertEqual(
            post.call_args.kwargs['json']['items'][0]['unit_price'],
            1250.0,
        )
        self.assertEqual(
            post.call_args.kwargs['json']['back_urls']['success'],
            'https://teste.ngrok-free.dev/api/pagamentos/retorno/acordo/success/',
        )
        pagamento = Pagamento.objects.get(acordo=self.acordo)
        self.assertEqual(pagamento.valor, Decimal('1250.00'))
        self.assertEqual(pagamento.status, 'pendente')

        history = self.client.get('/api/pagamentos/historico/')
        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.data, [])

    @override_settings(DEBUG=False)
    @patch.dict('os.environ', {
        'MERCADO_PAGO_ACCESS_TOKEN': 'TEST-token',
        'BACKEND_PUBLIC_URL': 'https://teste.ngrok-free.dev',
    })
    def test_freelancer_nao_pode_pagar_como_contratante(self):
        self.client.force_authenticate(self.freelancer)

        response = self.client.post(
            '/api/pagamentos/acordo/',
            {'acordo_id': self.acordo.id},
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Pagamento.objects.exists())

    @patch.dict('os.environ', {'MERCADO_PAGO_ACCESS_TOKEN': 'TEST-token'})
    @patch('core.views.requests.get')
    def test_webhook_aprova_ativa_acordo_e_registra_cartao(self, get):
        pagamento = Pagamento.objects.create(
            usuario=self.contratante,
            tipo='acordo',
            status='pendente',
            valor=Decimal('1250.00'),
            referencia_externa='acordo:test:1',
            acordo=self.acordo,
        )
        get.return_value = MercadoPagoResponse(200, {
            'id': 987654,
            'status': 'approved',
            'status_detail': 'accredited',
            'external_reference': pagamento.referencia_externa,
            'transaction_amount': 1250,
            'currency_id': 'BRL',
            'payment_method_id': 'visa',
            'card': {
                'id': 'card-123',
                'last_four_digits': '4242',
                'expiration_month': 12,
                'expiration_year': 2030,
                'cardholder': {'name': 'CLIENTE TESTE'},
            },
        })

        response = self.client.post(
            '/api/pagamentos/webhook/',
            {'type': 'payment', 'data': {'id': '987654'}},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'processed')
        pagamento.refresh_from_db()
        self.acordo.refresh_from_db()
        self.assertEqual(pagamento.status, 'pago')
        self.assertIsNotNone(pagamento.aprovado_em)
        self.assertEqual(self.acordo.status_acordo, 'Ativo')
        card = CartaoUsuario.objects.get(usuario=self.contratante)
        self.assertEqual(card.bandeira, 'visa')
        self.assertEqual(card.ultimos_quatro, '4242')

        self.client.force_authenticate(self.contratante)
        history = self.client.get('/api/pagamentos/historico/')
        cards = self.client.get('/api/pagamentos/cartoes/')
        self.assertEqual(len(history.data), 1)
        self.assertEqual(len(cards.data), 1)
        self.assertNotIn('mp_card_id', cards.data[0])

    @override_settings(DEBUG=False)
    @patch.dict('os.environ', {
        'MERCADO_PAGO_ACCESS_TOKEN': 'TEST-token',
        'BACKEND_PUBLIC_URL': 'https://teste.ngrok-free.dev',
    })
    @patch('core.views.requests.post')
    def test_plano_pago_abre_checkout_recorrente_sem_alterar_perfil(self, post):
        post.return_value = MercadoPagoResponse(
            201,
            {'id': 'subscription-1', 'init_point': 'https://mercadopago.com/subscription/1'},
        )
        self.client.force_authenticate(self.contratante)

        response = self.client.post(
            '/api/pagamentos/assinatura/',
            {'plano': 'gold'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.contratante.profile.refresh_from_db()
        self.assertEqual(self.contratante.profile.subscription_plan, 'Gratuito')
        self.assertEqual(
            post.call_args.kwargs['json']['items'][0]['unit_price'],
            29.9,
        )
        self.assertEqual(
            post.call_args.kwargs['json']['back_urls']['success'],
            'https://teste.ngrok-free.dev/api/pagamentos/retorno/assinatura/success/',
        )
        self.assertEqual(
            post.call_args.args[0],
            'https://api.mercadopago.com/checkout/preferences',
        )
        self.assertEqual(
            Pagamento.objects.get(usuario=self.contratante).status,
            'pendente',
        )

    @override_settings(DEBUG=True)
    @patch.dict('os.environ', {
        'MERCADO_PAGO_ACCESS_TOKEN': 'TEST-token',
        'BACKEND_PUBLIC_URL': 'https://teste.ngrok-free.dev',
        'MERCADO_PAGO_TEST_MODE': 'true',
        'MERCADO_PAGO_TEST_PAYER_EMAIL': 'comprador@testuser.com',
    })
    @patch('core.views.requests.post')
    def test_checkout_academico_aprova_assinatura_ao_criar_link(self, post):
        post.return_value = MercadoPagoResponse(
            201,
            {'id': 'subscription-test', 'init_point': 'https://mercadopago.com/subscription/test'},
        )
        self.client.force_authenticate(self.contratante)

        response = self.client.post(
            '/api/pagamentos/assinatura/',
            {'plano': 'platinum'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['test_approved'])
        self.assertEqual(
            post.call_args.kwargs['json']['payer']['email'],
            'comprador@testuser.com',
        )
        self.contratante.profile.refresh_from_db()
        self.assertEqual(self.contratante.profile.subscription_plan, 'Platinum')
        pagamento = Pagamento.objects.get(usuario=self.contratante)
        self.assertEqual(pagamento.status, 'pago')
        self.assertEqual(pagamento.forma_pagamento, 'simulacao_pagamento')

    @override_settings(DEBUG=True)
    @patch.dict('os.environ', {
        'MERCADO_PAGO_ACCESS_TOKEN': 'TEST-token',
        'BACKEND_PUBLIC_URL': 'https://teste.ngrok-free.dev',
        'MERCADO_PAGO_TEST_MODE': 'true',
    })
    @patch('core.views.requests.post')
    def test_checkout_academico_registra_pagamento_e_inicia_acordo(self, post):
        post.return_value = MercadoPagoResponse(
            201,
            {'id': 'preference-test', 'init_point': 'https://mercadopago.com/checkout/test'},
        )
        self.client.force_authenticate(self.contratante)

        response = self.client.post(
            '/api/pagamentos/acordo/',
            {'acordo_id': self.acordo.id},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['test_approved'])
        self.acordo.refresh_from_db()
        self.assertEqual(self.acordo.status_acordo, 'Ativo')
        pagamento = Pagamento.objects.get(acordo=self.acordo)
        self.assertEqual(pagamento.status, 'pago')
        self.assertEqual(pagamento.forma_pagamento, 'simulacao_pagamento')
        self.assertEqual(
            response.data['init_point'],
            'https://mercadopago.com/checkout/test',
        )

    def test_plano_gratuito_nao_exige_checkout(self):
        self.contratante.profile.subscription_plan = 'Gold'
        self.contratante.profile.save(update_fields=['subscription_plan'])
        self.client.force_authenticate(self.contratante)

        response = self.client.post(
            '/api/pagamentos/assinatura/',
            {'plano': 'free'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['checkout_required'])
        self.contratante.profile.refresh_from_db()
        self.assertEqual(self.contratante.profile.subscription_plan, 'Gratuito')

    def test_plano_pago_nao_pode_ser_liberado_por_patch_no_perfil(self):
        self.client.force_authenticate(self.contratante)

        response = self.client.patch(
            '/api/auth/profile/',
            {'subscription_plan': 'Platinum'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.contratante.profile.refresh_from_db()
        self.assertEqual(self.contratante.profile.subscription_plan, 'Gratuito')

    def test_aprovar_candidatura_encerra_as_demais(self):
        outro_freelancer = User.objects.create_user(
            username='outro@example.com',
            email='outro@example.com',
            password='secret123',
        )
        outra = Candidatura.objects.create(
            user=outro_freelancer,
            ad=self.ad,
            status='pendente',
        )
        self.client.force_authenticate(self.contratante)

        response = self.client.patch(
            f'/api/candidaturas/{self.candidatura.id}/',
            {'status': 'aprovada'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.candidatura.refresh_from_db()
        outra.refresh_from_db()
        self.ad.refresh_from_db()
        self.assertEqual(self.candidatura.status, 'aprovada')
        self.assertEqual(outra.status, 'encerrada')
        self.assertEqual(self.ad.status_anuncio, 'Finalizado')

        self.client.force_authenticate(outro_freelancer)
        applications = self.client.get(
            f'/api/candidaturas/?user_id={outro_freelancer.id}',
        )
        self.assertTrue(applications.data[0]['indisponivel'])

    def test_conclusao_e_avaliacao_atualizam_nota_do_perfil(self):
        self.acordo.status_acordo = 'Ativo'
        self.acordo.save(update_fields=['status_acordo'])
        Pagamento.objects.create(
            usuario=self.contratante,
            tipo='acordo',
            status='pago',
            valor=Decimal('1250.00'),
            referencia_externa='acordo:concluido:1',
            acordo=self.acordo,
        )
        self.client.force_authenticate(self.contratante)

        completion = self.client.post(
            f'/api/acordos/{self.acordo.id}/concluir/',
            {},
            format='json',
        )
        self.assertEqual(completion.status_code, 200)
        self.acordo.refresh_from_db()
        self.assertEqual(self.acordo.status_acordo, 'Concluído')
        self.assertIsNotNone(self.acordo.concluido_em)

        pending = self.client.get('/api/avaliacoes/pendentes/')
        self.assertEqual(len(pending.data), 1)
        self.assertEqual(pending.data[0]['papel_avaliado'], 'freelancer')

        review = self.client.post(
            '/api/avaliacoes/',
            {
                'acordo': self.acordo.id,
                'criterios': {
                    'qualidade': 5,
                    'comunicacao': 4,
                    'prazo': 3,
                },
                'comentario': 'Ótimo profissional e boa entrega.',
            },
            format='json',
        )
        self.assertEqual(review.status_code, 201)
        self.assertEqual(Avaliacao.objects.count(), 1)
        self.assertEqual(Decimal(review.data['nota_geral']), Decimal('4.00'))
        self.assertEqual(len(self.client.get('/api/avaliacoes/pendentes/').data), 0)

        profile = self.client.get(f'/api/users/{self.freelancer.id}/')
        summary = profile.data['resumo_avaliacoes']['freelancer']
        self.assertEqual(summary['nota'], 4.0)
        self.assertEqual(summary['total'], 1)
        self.assertEqual(len(profile.data['avaliacoes_recebidas']), 1)

        duplicate = self.client.post(
            '/api/avaliacoes/',
            {
                'acordo': self.acordo.id,
                'criterios': {
                    'qualidade': 5,
                    'comunicacao': 5,
                    'prazo': 5,
                },
                'comentario': 'Tentativa duplicada.',
            },
            format='json',
        )
        self.assertEqual(duplicate.status_code, 400)

    def test_acordo_sem_pagamento_nao_pode_ser_concluido(self):
        self.acordo.status_acordo = 'Ativo'
        self.acordo.save(update_fields=['status_acordo'])
        self.client.force_authenticate(self.freelancer)

        response = self.client.post(
            f'/api/acordos/{self.acordo.id}/concluir/',
            {},
            format='json',
        )

        self.assertEqual(response.status_code, 409)

    @override_settings(DEBUG=True)
    @patch.dict('os.environ', {'MERCADO_PAGO_TEST_MODE': 'true'})
    def test_acordo_ativo_legado_pode_ser_concluido_no_ambiente_local(self):
        self.acordo.status_acordo = 'Ativo'
        self.acordo.save(update_fields=['status_acordo'])
        self.client.force_authenticate(self.freelancer)

        response = self.client.post(
            f'/api/acordos/{self.acordo.id}/concluir/',
            {},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.acordo.refresh_from_db()
        self.assertEqual(self.acordo.status_acordo, 'Concluído')
        self.assertTrue(
            Pagamento.objects.filter(
                acordo=self.acordo,
                status='pago',
                forma_pagamento='simulacao_pagamento',
            ).exists(),
        )

    def test_cancelamento_precisa_de_admin_e_move_acordo_para_cancelados(self):
        self.acordo.status_acordo = 'Ativo'
        self.acordo.save(update_fields=['status_acordo'])
        self.client.force_authenticate(self.freelancer)

        request = self.client.post(
            f'/api/acordos/{self.acordo.id}/solicitar-cancelamento/',
            {'justificativa': 'O escopo não poderá mais ser executado conforme combinado.'},
            format='json',
        )
        self.assertEqual(request.status_code, 201)
        solicitacao = SolicitacaoCancelamentoAcordo.objects.get(acordo=self.acordo)
        self.assertEqual(solicitacao.status, 'pendente')
        self.acordo.refresh_from_db()
        self.assertEqual(self.acordo.status_acordo, 'Ativo')
        self.assertIsNone(self.acordo.cancelado_em)

        agreements = self.client.get('/api/acordos/')
        self.assertEqual(agreements.status_code, 200)
        self.assertEqual(
            agreements.data[0]['cancelamento_pendente']['id'],
            solicitacao.id,
        )

        self.client.force_authenticate(self.contratante)
        blocked_checkout = self.client.post(
            '/api/pagamentos/acordo/',
            {'acordo_id': self.acordo.id},
            format='json',
        )
        self.assertEqual(blocked_checkout.status_code, 409)

        self.client.force_authenticate(self.admin)
        listing = self.client.get('/api/admin/cancelamentos-acordo/')
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.data['count'], 1)
        decision = self.client.patch(
            f'/api/admin/cancelamentos-acordo/{solicitacao.id}/',
            {'decisao': 'aprovar', 'resposta_admin': 'Cancelamento aprovado.'},
            format='json',
        )
        self.assertEqual(decision.status_code, 200)

        self.acordo.refresh_from_db()
        solicitacao.refresh_from_db()
        self.assertEqual(self.acordo.status_acordo, 'Cancelado')
        self.assertIsNotNone(self.acordo.cancelado_em)
        self.assertEqual(solicitacao.status, 'aprovada')
        self.assertEqual(solicitacao.analisado_por, self.admin)

        approved_listing = self.client.get(
            '/api/admin/cancelamentos-acordo/?status=aprovada',
        )
        self.assertEqual(approved_listing.status_code, 200)
        self.assertEqual(approved_listing.data['count'], 1)
        self.assertEqual(
            approved_listing.data['results'][0]['status'],
            'aprovada',
        )

    def test_solicitacoes_rejeitadas_ficam_no_historico_admin(self):
        self.acordo.status_acordo = 'Ativo'
        self.acordo.save(update_fields=['status_acordo'])
        self.client.force_authenticate(self.freelancer)
        request = self.client.post(
            f'/api/acordos/{self.acordo.id}/solicitar-cancelamento/',
            {'justificativa': 'O serviço não poderá continuar conforme o planejamento.'},
            format='json',
        )
        self.assertEqual(request.status_code, 201)
        cancelamento = SolicitacaoCancelamentoAcordo.objects.get(acordo=self.acordo)

        self.client.force_authenticate(self.admin)
        rejection = self.client.patch(
            f'/api/admin/cancelamentos-acordo/{cancelamento.id}/',
            {'decisao': 'recusar', 'resposta_admin': 'Solicitação rejeitada.'},
            format='json',
        )
        self.assertEqual(rejection.status_code, 200)
        self.acordo.refresh_from_db()
        self.assertEqual(self.acordo.status_acordo, 'Ativo')

        cancellation_history = self.client.get(
            '/api/admin/cancelamentos-acordo/?status=recusada',
        )
        self.assertEqual(cancellation_history.status_code, 200)
        self.assertEqual(cancellation_history.data['count'], 1)
        self.assertEqual(
            cancellation_history.data['results'][0]['status'],
            'recusada',
        )

        self.client.force_authenticate(self.freelancer)
        change = self.client.patch(
            f'/api/acordos/{self.acordo.id}/',
            {
                'tem_solicitacao': True,
                'justificativa_alteracao': 'Precisamos alterar o prazo inicialmente combinado.',
                'proposto_valor': 1250,
                'proposta_descricao': 'Site institucional com novo prazo.',
                'proposta_conclusao_prevista': '2026-10-20',
            },
            format='json',
        )
        self.assertEqual(change.status_code, 200)

        self.client.force_authenticate(self.contratante)
        change_rejection = self.client.patch(
            f'/api/acordos/{self.acordo.id}/',
            {'recusar_solicitacao': True},
            format='json',
        )
        self.assertEqual(change_rejection.status_code, 200)

        self.client.force_authenticate(self.admin)
        change_history = self.client.get(
            '/api/admin/alteracoes-acordo/?status=recusada',
        )
        self.assertEqual(change_history.status_code, 200)
        self.assertEqual(change_history.data['count'], 1)
        self.assertEqual(
            change_history.data['results'][0]['status'],
            'recusada',
        )

    def test_alteracoes_ficam_no_historico_paginado_do_admin(self):
        self.acordo.status_acordo = 'Ativo'
        self.acordo.save(update_fields=['status_acordo'])
        self.client.force_authenticate(self.freelancer)

        change = self.client.patch(
            f'/api/acordos/{self.acordo.id}/',
            {
                'tem_solicitacao': True,
                'justificativa_alteracao': 'Precisamos ampliar o prazo por dependência externa.',
                'proposto_valor': 1400,
                'proposta_descricao': 'Site institucional com integração adicional.',
                'proposta_conclusao_prevista': '2026-09-20',
            },
            format='json',
        )
        self.assertEqual(change.status_code, 200)
        history = SolicitacaoAlteracaoAcordo.objects.get(acordo=self.acordo)
        self.assertEqual(history.status, 'pendente')

        self.client.force_authenticate(self.contratante)
        approval = self.client.patch(
            f'/api/acordos/{self.acordo.id}/',
            {'aprovar_solicitacao': True},
            format='json',
        )
        self.assertEqual(approval.status_code, 200)
        history.refresh_from_db()
        self.assertEqual(history.status, 'aprovada')

        self.client.force_authenticate(self.admin)
        listing = self.client.get('/api/admin/alteracoes-acordo/?page=1&page_size=10')
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.data['count'], 1)
        self.assertEqual(listing.data['results'][0]['status'], 'aprovada')

    def test_acordo_pendente_pagamento_aceita_solicitacao_de_alteracao(self):
        self.client.force_authenticate(self.freelancer)

        response = self.client.patch(
            f'/api/acordos/{self.acordo.id}/',
            {
                'tem_solicitacao': True,
                'justificativa_alteracao': 'Precisamos alinhar o escopo antes do pagamento.',
                'proposto_valor': 1350,
                'proposta_descricao': 'Site institucional com uma página adicional.',
                'proposta_conclusao_prevista': '2026-11-10',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.acordo.refresh_from_db()
        self.assertEqual(self.acordo.status_acordo, 'Pendente Pagamento')
        self.assertTrue(self.acordo.tem_solicitacao)
        self.assertTrue(
            SolicitacaoAlteracaoAcordo.objects.filter(
                acordo=self.acordo,
                status='pendente',
            ).exists(),
        )

    def test_solicitante_nao_pode_decidir_a_propria_alteracao(self):
        self.client.force_authenticate(self.freelancer)
        request = self.client.patch(
            f'/api/acordos/{self.acordo.id}/',
            {
                'tem_solicitacao': True,
                'justificativa_alteracao': 'Precisamos rever o valor antes do pagamento.',
                'proposto_valor': 1400,
            },
            format='json',
        )
        self.assertEqual(request.status_code, 200)

        decision = self.client.patch(
            f'/api/acordos/{self.acordo.id}/',
            {'aprovar_solicitacao': True},
            format='json',
        )

        self.assertEqual(decision.status_code, 400)
        self.acordo.refresh_from_db()
        self.assertTrue(self.acordo.tem_solicitacao)
        self.assertEqual(self.acordo.valor_acordado, 1250)

    def test_retorno_publico_redireciona_para_frontend_local(self):
        response = self.client.get('/api/pagamentos/retorno/acordo/success/')
        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response.url,
            'http://localhost:5173/my-freelas?checkout=success',
        )

    @override_settings(DEBUG=True)
    @patch.dict('os.environ', {'MERCADO_PAGO_TEST_MODE': 'true'})
    def test_simulacao_local_aprova_pagamento_e_ativa_acordo(self):
        self.client.force_authenticate(self.contratante)

        response = self.client.post(
            f'/api/pagamentos/acordo/{self.acordo.id}/simular/',
            {},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.acordo.refresh_from_db()
        self.assertEqual(self.acordo.status_acordo, 'Ativo')
        pagamento = Pagamento.objects.get(acordo=self.acordo)
        self.assertEqual(pagamento.status, 'pago')
        self.assertEqual(pagamento.forma_pagamento, 'simulacao_pagamento')
        self.assertTrue(pagamento.mp_payment_id.startswith('LOCAL-TEST-'))

    def test_denuncias_sao_filtradas_e_decididas_apenas_por_admin(self):
        pending = Report.objects.create(
            type='user',
            target_id=str(self.freelancer.id),
            target_name='Freelancer',
            category='Comportamento',
            comment='Descrição da denúncia.',
        )
        Report.objects.create(
            type='ad',
            target_id=str(self.ad.id),
            target_name='Criação de site',
            category='Conteúdo',
            status='improcedente',
        )

        self.client.force_authenticate(self.contratante)
        forbidden = self.client.get('/api/reports/?status=pending')
        self.assertEqual(forbidden.status_code, 403)

        self.client.force_authenticate(self.admin)
        listing = self.client.get('/api/reports/?status=pending&page=1&page_size=10')
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.data['count'], 1)
        self.assertEqual(listing.data['results'][0]['id'], pending.id)

        decision = self.client.patch(
            f'/api/reports/{pending.id}/',
            {'status': 'procedente', 'comment': 'Não deve ser alterado.'},
            format='json',
        )
        self.assertEqual(decision.status_code, 200)
        pending.refresh_from_db()
        self.assertEqual(pending.status, 'procedente')
        self.assertEqual(pending.comment, 'Descrição da denúncia.')

    def test_denuncia_publica_sempre_nasce_pendente(self):
        response = self.client.post(
            '/api/reports/',
            {
                'type': 'user',
                'target_id': str(self.freelancer.id),
                'target_name': 'Freelancer',
                'category': 'Comportamento',
                'comment': 'Tentativa de enviar denúncia já julgada.',
                'status': 'procedente',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Report.objects.get(pk=response.data['id']).status, 'pending')


class DashboardAdminAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin@example.com',
            email='admin@example.com',
            password='secret123',
            is_staff=True,
        )
        self.common = User.objects.create_user(
            username='comum@example.com',
            email='comum@example.com',
            password='secret123',
        )

    def test_requer_admin(self):
        self.client.force_authenticate(self.common)
        response = self.client.get('/api/admin/dashboard/')
        self.assertEqual(response.status_code, 403)

    def test_agrega_estatisticas_do_site(self):
        self.client.force_authenticate(self.admin)

        Ad.objects.create(author=self.common, title='Serviço', role='freelancer')
        Ad.objects.create(author=self.common, title='Vaga', role='contractor')
        Report.objects.create(
            type='user',
            target_id=str(self.common.id),
            target_name='Comum',
            category='Comportamento',
        )
        UserProfile.objects.filter(user=self.common).update(subscription_plan='Gold')

        response = self.client.get('/api/admin/dashboard/')
        self.assertEqual(response.status_code, 200)

        data = response.data
        self.assertEqual(data['geral']['usuarios']['total'], 2)
        self.assertEqual(data['geral']['freelancers']['total'], 1)
        self.assertEqual(data['geral']['contratantes']['total'], 1)
        self.assertEqual(data['geral']['freelas']['total'], 1)
        self.assertEqual(data['geral']['freelas']['fecharam_acordo_mes'], 0)
        self.assertEqual(data['denuncias']['pendentes'], 1)
        self.assertEqual(data['assinaturas_ativas'], 1)

        planos = {p['nome']: p['total'] for p in data['planos']}
        self.assertEqual(planos['Gold'], 1)
        self.assertEqual(planos['Gratuito'], 1)
        self.assertEqual(planos['Platinum'], 0)

    def test_freelas_conta_quem_fechou_acordo_no_mes(self):
        self.client.force_authenticate(self.admin)

        freelancer = User.objects.create_user(
            username='freela@example.com',
            email='freela@example.com',
            password='secret123',
        )
        contratante = User.objects.create_user(
            username='contra@example.com',
            email='contra@example.com',
            password='secret123',
        )
        ad = Ad.objects.create(author=contratante, title='Vaga', role='contractor')
        candidatura = Candidatura.objects.create(user=freelancer, ad=ad, status='pendente')
        candidatura.status = 'aprovada'
        candidatura.save()

        response = self.client.get('/api/admin/dashboard/')
        self.assertEqual(response.status_code, 200)

        freelas = response.data['geral']['freelas']
        self.assertEqual(freelas['fecharam_acordo_mes'], 2)


class AutenticacaoSenhaAPITests(TestCase):
    """
    Testes dos requisitos de senha na autenticação:
    - mínimo de 8 caracteres
    - pelo menos 1 letra maiúscula
    - pelo menos 1 número
    - pelo menos 1 caractere especial (@, #, *, etc.)

    Cobrem os endpoints que recebem senha em texto claro:
    RegisterAPI (/api/auth/register/) e RedefinirSenhaAPI (/api/auth/redefinir-senha/).
    """

    SENHA_VALIDA = 'Abcdef1@'

    def setUp(self):
        self.client = APIClient()

    # ---------- Cadastro (RegisterAPI) ----------

    def test_cadastro_recusa_senha_menor_que_8_caracteres(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'username': 'curta@example.com',
                'email': 'curta@example.com',
                'password': 'Ab1@xyz',  # 7 caracteres
                'first_name': 'Teste',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username='curta@example.com').exists())

    def test_cadastro_recusa_senha_sem_letra_maiuscula(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'username': 'semmaiuscula@example.com',
                'email': 'semmaiuscula@example.com',
                'password': 'abcdef1@',
                'first_name': 'Teste',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username='semmaiuscula@example.com').exists())

    def test_cadastro_recusa_senha_sem_numero(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'username': 'semnumero@example.com',
                'email': 'semnumero@example.com',
                'password': 'Abcdefg@',
                'first_name': 'Teste',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username='semnumero@example.com').exists())

    def test_cadastro_recusa_senha_sem_caractere_especial(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'username': 'semespecial@example.com',
                'email': 'semespecial@example.com',
                'password': 'Abcdefg1',
                'first_name': 'Teste',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username='semespecial@example.com').exists())

    def test_cadastro_aceita_senha_que_atende_todos_os_requisitos(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'username': 'valida@example.com',
                'email': 'valida@example.com',
                'password': self.SENHA_VALIDA,
                'first_name': 'Teste',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('token', response.data)
        user = User.objects.get(username='valida@example.com')
        self.assertTrue(user.check_password(self.SENHA_VALIDA))

    # ---------- Redefinição de senha (RedefinirSenhaAPI) ----------

    def _criar_usuario_com_codigo(self, email, codigo='123456'):
        user = User.objects.create_user(username=email, email=email, password='SenhaAntiga1@')
        VerificacaoEmail.objects.create(usuario=user, codigo=codigo)
        return user

    def test_redefinicao_recusa_senha_menor_que_8_caracteres(self):
        user = self._criar_usuario_com_codigo('redef-curta@example.com')
        response = self.client.post(
            '/api/auth/redefinir-senha/',
            {'email': user.email, 'codigo': '123456', 'nova_senha': 'Ab1@xyz'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        user.refresh_from_db()
        self.assertFalse(user.check_password('Ab1@xyz'))

    def test_redefinicao_recusa_senha_sem_letra_maiuscula(self):
        user = self._criar_usuario_com_codigo('redef-semmaiuscula@example.com')
        response = self.client.post(
            '/api/auth/redefinir-senha/',
            {'email': user.email, 'codigo': '123456', 'nova_senha': 'abcdef1@'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        user.refresh_from_db()
        self.assertFalse(user.check_password('abcdef1@'))

    def test_redefinicao_recusa_senha_sem_numero(self):
        user = self._criar_usuario_com_codigo('redef-semnumero@example.com')
        response = self.client.post(
            '/api/auth/redefinir-senha/',
            {'email': user.email, 'codigo': '123456', 'nova_senha': 'Abcdefg@'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        user.refresh_from_db()
        self.assertFalse(user.check_password('Abcdefg@'))

    def test_redefinicao_recusa_senha_sem_caractere_especial(self):
        user = self._criar_usuario_com_codigo('redef-semespecial@example.com')
        response = self.client.post(
            '/api/auth/redefinir-senha/',
            {'email': user.email, 'codigo': '123456', 'nova_senha': 'Abcdefg1'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        user.refresh_from_db()
        self.assertFalse(user.check_password('Abcdefg1'))

    def test_redefinicao_aceita_senha_que_atende_todos_os_requisitos(self):
        user = self._criar_usuario_com_codigo('redef-valida@example.com')
        response = self.client.post(
            '/api/auth/redefinir-senha/',
            {'email': user.email, 'codigo': '123456', 'nova_senha': self.SENHA_VALIDA},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password(self.SENHA_VALIDA))

    # ---------- Login (LoginAPI) ----------

    def test_login_com_credenciais_corretas_retorna_token(self):
        User.objects.create_user(
            username='login-ok@example.com',
            email='login-ok@example.com',
            password=self.SENHA_VALIDA,
        )
        response = self.client.post(
            '/api/auth/login/',
            {'username': 'login-ok@example.com', 'password': self.SENHA_VALIDA},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('token', response.data)

    def test_login_com_senha_incorreta_e_recusado(self):
        User.objects.create_user(
            username='login-errado@example.com',
            email='login-errado@example.com',
            password=self.SENHA_VALIDA,
        )
        response = self.client.post(
            '/api/auth/login/',
            {'username': 'login-errado@example.com', 'password': 'SenhaTotalmenteErrada9#'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)


class CriteriosAvaliacaoAPITests(TestCase):
    """
    Cobre os critérios descritos em Criterios_Novos.md:
    - comentário da avaliação é opcional;
    - o anúncio expõe author_reputation (score/label/tags) calculado a
      partir das avaliações recebidas pelo autor, consumido pelo frontend
      em DetalhesAnuncio.jsx no lugar do mock antigo.
    """

    def setUp(self):
        self.client = APIClient()
        self.contratante = User.objects.create_user(
            username='contratante-crit@example.com',
            email='contratante-crit@example.com',
            password='secret123',
        )
        self.freelancer = User.objects.create_user(
            username='freelancer-crit@example.com',
            email='freelancer-crit@example.com',
            password='secret123',
        )
        self.ad = Ad.objects.create(
            author=self.contratante,
            title='Criação de identidade visual',
            description='Logo e material de papelaria',
            price='800.00',
            role='contractor',
            location_type='remoto',
        )
        self.candidatura = Candidatura.objects.create(
            user=self.freelancer,
            ad=self.ad,
            status='pendente',
        )
        self.acordo = AcordoServico.objects.create(
            candidatura=self.candidatura,
            status_acordo='Concluído',
            valor_acordado=800,
            titulo_anuncio='Criação de identidade visual',
            descricao_servico='Logo e material de papelaria',
        )

    def test_avaliacao_sem_comentario_e_aceita(self):
        self.client.force_authenticate(self.contratante)

        response = self.client.post(
            '/api/avaliacoes/',
            {
                'acordo': self.acordo.id,
                'criterios': {
                    'qualidade_tecnica': 5,
                    'cumprimento_prazos': 5,
                    'comunicacao_remota': 5,
                },
                # 'comentario' propositalmente omitido: deve ser opcional.
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['comentario'], '')
        avaliacao = Avaliacao.objects.get(acordo=self.acordo, avaliador=self.contratante.profile)
        self.assertEqual(avaliacao.comentario, '')

    def test_avaliacao_com_comentario_em_branco_e_aceita(self):
        self.client.force_authenticate(self.contratante)

        response = self.client.post(
            '/api/avaliacoes/',
            {
                'acordo': self.acordo.id,
                'criterios': {
                    'qualidade_tecnica': 4,
                    'cumprimento_prazos': 4,
                    'comunicacao_remota': 4,
                },
                'comentario': '   ',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['comentario'], '')

    def test_anuncio_expoe_author_reputation_calculada_das_avaliacoes(self):
        # O anúncio foi publicado pelo contratante (role='contractor'), então
        # author_reputation reflete as avaliações que ELE recebeu como
        # contratante — quem avalia é o freelancer do acordo.
        self.client.force_authenticate(self.freelancer)
        self.client.post(
            '/api/avaliacoes/',
            {
                'acordo': self.acordo.id,
                'criterios': {
                    'clareza_escopo': 5,
                    'comunicacao_feedback': 5,
                    'pagamento_compromisso': 5,
                },
            },
            format='json',
        )

        response = self.client.get(f'/api/ads/{self.ad.id}/')

        self.assertEqual(response.status_code, 200)
        reputacao = response.data['author_reputation']
        self.assertIsNotNone(reputacao)
        self.assertEqual(reputacao['total_avaliacoes'], 1)
        self.assertEqual(reputacao['score'], 100)
        self.assertEqual(reputacao['label'], 'Excelente')
        self.assertTrue(any(tag['tone'] == 'positivo' for tag in reputacao['tags']))

    def test_anuncio_sem_avaliacoes_expoe_reputacao_padrao(self):
        # Sem avaliações e sem nenhuma seção do perfil preenchida, o score
        # parte de uma base neutra (40) em vez do antigo "Excelente" fixo.
        response = self.client.get(f'/api/ads/{self.ad.id}/')

        self.assertEqual(response.status_code, 200)
        reputacao = response.data['author_reputation']
        self.assertIsNotNone(reputacao)
        self.assertEqual(reputacao['total_avaliacoes'], 0)
        self.assertEqual(reputacao['score'], 40)
        self.assertEqual(reputacao['label'], 'Baixa')
        self.assertEqual(reputacao['completude_perfil'], 0)

    def test_perfil_completo_aumenta_reputacao_mesmo_sem_avaliacoes(self):
        # Preencher as seções do perfil deve somar pontos na reputação,
        # mesmo antes de qualquer avaliação (bônus de completude "estilo
        # Tinder").
        profile = self.contratante.profile
        profile.foto_perfil = 'https://exemplo.com/foto.jpg'
        profile.bio = 'Contratante de projetos de tecnologia há alguns anos.'
        profile.cidade = 'São Paulo'
        profile.telefone = '11999999999'
        profile.telefone_visivel = True
        profile.categories = ['Desenvolvimento Web']
        profile.skills = [{'name': 'Gestão de Projetos', 'level': 'avancado'}]
        profile.save()

        response = self.client.get(f'/api/ads/{self.ad.id}/')

        self.assertEqual(response.status_code, 200)
        reputacao = response.data['author_reputation']
        self.assertEqual(reputacao['completude_perfil'], 100)
        self.assertEqual(reputacao['score'], 70)  # 40 base + 30 (bônus máximo)
        self.assertEqual(reputacao['label'], 'Regular')


class PerfilBioEReputacaoAPITests(TestCase):
    """
    Cobre a correção do bug da bio padrão (perfis novos não devem herdar o
    texto fixo de exemplo) e a exposição do termômetro de reputação
    (freelancer + contratante) no endpoint /api/auth/user/, usado pelas
    telas de perfil.
    """

    def setUp(self):
        self.client = APIClient()

    def test_cadastro_novo_nao_recebe_bio_padrao(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'username': 'sembio@example.com',
                'email': 'sembio@example.com',
                'password': 'Abcdef1@',
                'first_name': 'Teste',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        user = User.objects.get(username='sembio@example.com')
        profile = UserProfile.objects.get(user=user)
        self.assertEqual(profile.bio, '')
        self.assertNotIn('adestrador', profile.bio.lower())

    def test_endpoint_user_expoe_reputacao_freelancer_e_contratante(self):
        user = User.objects.create_user(
            username='reputacao@example.com',
            email='reputacao@example.com',
            password='secret123',
        )
        UserProfile.objects.get_or_create(user=user)
        self.client.force_authenticate(user)

        response = self.client.get('/api/auth/user/')

        self.assertEqual(response.status_code, 200)
        self.assertIn('reputacao', response.data)
        self.assertIn('freelancer', response.data['reputacao'])
        self.assertIn('contratante', response.data['reputacao'])
        self.assertEqual(response.data['reputacao']['freelancer']['total_avaliacoes'], 0)
        self.assertEqual(response.data['reputacao']['freelancer']['score'], 40)
