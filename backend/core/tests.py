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
    def test_checkout_academico_aprova_e_inicia_acordo_ao_criar_link(self, post):
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
