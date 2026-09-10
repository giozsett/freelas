from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import (
    Ad,
    AcordoServico,
    Avaliacao,
    Candidatura,
    Pagamento,
    Report,
    SolicitacaoAlteracaoAcordo,
    SolicitacaoCancelamentoAcordo,
    UserProfile,
    VerificacaoEmail,
)


class FakeStripeSession(dict):
    """Simula o objeto retornado por stripe.checkout.Session.create nos testes."""

    def __init__(self, id, url):
        super().__init__(id=id, url=url)
        self.id = id
        self.url = url


FAKE_PLANOS_PAGOS = {
    'gold': {'nome': 'Gold', 'valor': Decimal('29.90'), 'stripe_price': 'price_test_gold'},
    'platinum': {'nome': 'Platinum', 'valor': Decimal('79.90'), 'stripe_price': 'price_test_platinum'},
}


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

    @patch('core.views.stripe.api_key', 'sk_test_fake')
    @patch('core.views.stripe.checkout.Session.create')
    def test_contratante_abre_checkout_com_taxa_da_plataforma(self, create):
        create.return_value = FakeStripeSession('cs_test_1', 'https://checkout.stripe.com/c/pay/cs_test_1')
        self.client.force_authenticate(self.contratante)

        response = self.client.post(
            '/api/pagamentos/acordo/',
            {'acordo_id': self.acordo.id},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['checkout_required'])
        self.assertEqual(create.call_args.kwargs['mode'], 'payment')
        # Valor do anúncio (R$ 1250) + taxa da plataforma de 10% (R$ 125) = R$ 1375.
        self.assertEqual(
            create.call_args.kwargs['line_items'][0]['price_data']['unit_amount'],
            137500,
        )
        self.assertIn('taxa de serviço da plataforma (10%)', create.call_args.kwargs['line_items'][0]['price_data']['product_data']['description'])
        self.assertEqual(response.data['init_point'], 'https://checkout.stripe.com/c/pay/cs_test_1')
        pagamento = Pagamento.objects.get(acordo=self.acordo)
        self.assertEqual(pagamento.valor, Decimal('1375.00'))
        self.assertEqual(pagamento.status, 'pendente')

        history = self.client.get('/api/pagamentos/historico/')
        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.data['results'], [])
        self.assertEqual(history.data['count'], 0)

    def test_historico_pagamentos_e_paginado(self):
        for i in range(17):
            Pagamento.objects.create(
                usuario=self.contratante,
                tipo='acordo',
                status='pago',
                valor=Decimal('100.00'),
                referencia_externa=f'acordo:historico:{i}',
                acordo=self.acordo,
            )
        self.client.force_authenticate(self.contratante)

        first_page = self.client.get('/api/pagamentos/historico/')
        self.assertEqual(first_page.status_code, 200)
        self.assertEqual(first_page.data['count'], 17)
        self.assertEqual(len(first_page.data['results']), 15)
        self.assertIsNotNone(first_page.data['next'])
        self.assertIsNone(first_page.data['previous'])

        second_page = self.client.get('/api/pagamentos/historico/?page=2')
        self.assertEqual(len(second_page.data['results']), 2)
        self.assertIsNone(second_page.data['next'])
        self.assertIsNotNone(second_page.data['previous'])

    def test_taxa_plataforma_e_valor_total_do_acordo(self):
        self.assertEqual(self.acordo.taxa_plataforma, Decimal('125.00'))
        self.assertEqual(self.acordo.valor_total_com_taxa, Decimal('1375.00'))

    def test_taxa_plataforma_arredonda_para_duas_casas(self):
        acordo = AcordoServico.objects.create(
            candidatura=self.candidatura,
            status_acordo='Pendente Pagamento',
            valor_acordado=99.99,
            titulo_anuncio='Serviço com centavos',
        )
        self.assertEqual(acordo.taxa_plataforma, Decimal('10.00'))
        self.assertEqual(acordo.valor_total_com_taxa, Decimal('109.99'))

    def test_freelancer_nao_pode_pagar_como_contratante(self):
        self.client.force_authenticate(self.freelancer)

        response = self.client.post(
            '/api/pagamentos/acordo/',
            {'acordo_id': self.acordo.id},
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Pagamento.objects.exists())

    @patch.dict('os.environ', {'STRIPE_WEBHOOK_SECRET': 'whsec_teste'})
    @patch('core.views.stripe.Webhook.construct_event')
    def test_webhook_aprova_pagamento_e_ativa_acordo(self, construct_event):
        pagamento = Pagamento.objects.create(
            usuario=self.contratante,
            tipo='acordo',
            status='pendente',
            valor=Decimal('1250.00'),
            referencia_externa='acordo:test:1',
            acordo=self.acordo,
        )
        construct_event.return_value = {
            'type': 'checkout.session.completed',
            'data': {'object': {
                'client_reference_id': pagamento.referencia_externa,
                'amount_total': 125000,
                'currency': 'brl',
                'payment_status': 'paid',
                'payment_intent': 'pi_teste123',
            }},
        }

        response = self.client.post(
            '/api/pagamentos/webhook/',
            {},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'processed')
        pagamento.refresh_from_db()
        self.acordo.refresh_from_db()
        self.assertEqual(pagamento.status, 'pago')
        self.assertEqual(pagamento.mp_payment_id, 'pi_teste123')
        self.assertIsNotNone(pagamento.aprovado_em)
        self.assertEqual(self.acordo.status_acordo, 'Ativo')

        self.client.force_authenticate(self.contratante)
        history = self.client.get('/api/pagamentos/historico/')
        self.assertEqual(len(history.data['results']), 1)

    @patch.dict('core.views.PLANOS_PAGOS', FAKE_PLANOS_PAGOS)
    @patch('core.views.stripe.api_key', 'sk_test_fake')
    @patch('core.views.stripe.checkout.Session.create')
    def test_plano_pago_abre_checkout_recorrente_sem_alterar_perfil(self, create):
        create.return_value = FakeStripeSession('cs_test_2', 'https://checkout.stripe.com/c/pay/cs_test_2')
        self.client.force_authenticate(self.contratante)

        response = self.client.post(
            '/api/pagamentos/assinatura/',
            {'plano': 'gold'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.contratante.profile.refresh_from_db()
        self.assertEqual(self.contratante.profile.subscription_plan, 'Gratuito')
        self.assertEqual(create.call_args.kwargs['mode'], 'subscription')
        self.assertEqual(create.call_args.kwargs['line_items'][0]['price'], 'price_test_gold')
        self.assertEqual(create.call_args.kwargs['customer_email'], self.contratante.email)
        self.assertEqual(
            Pagamento.objects.get(usuario=self.contratante).status,
            'pendente',
        )

    @override_settings(DEBUG=True)
    @patch.dict('os.environ', {'PAGAMENTOS_TEST_MODE': 'true'})
    @patch.dict('core.views.PLANOS_PAGOS', FAKE_PLANOS_PAGOS)
    @patch('core.views.stripe.api_key', 'sk_test_fake')
    @patch('core.views.stripe.checkout.Session.create')
    def test_checkout_assinatura_nao_aprova_automaticamente(self, create):
        """Mesmo com DEBUG=True e a antiga flag de teste setada, o pagamento só
        pode ser concluído quando o usuário terminar o checkout de verdade."""
        create.return_value = FakeStripeSession('cs_test_3', 'https://checkout.stripe.com/c/pay/cs_test_3')
        self.client.force_authenticate(self.contratante)

        response = self.client.post(
            '/api/pagamentos/assinatura/',
            {'plano': 'platinum'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotIn('test_approved', response.data)
        self.assertEqual(create.call_args.kwargs['customer_email'], self.contratante.email)
        self.contratante.profile.refresh_from_db()
        self.assertEqual(self.contratante.profile.subscription_plan, 'Gratuito')
        pagamento = Pagamento.objects.get(usuario=self.contratante)
        self.assertEqual(pagamento.status, 'pendente')

    @override_settings(DEBUG=True)
    @patch.dict('os.environ', {'PAGAMENTOS_TEST_MODE': 'true'})
    @patch('core.views.stripe.api_key', 'sk_test_fake')
    @patch('core.views.stripe.checkout.Session.create')
    def test_checkout_acordo_nao_aprova_automaticamente(self, create):
        """Mesmo com DEBUG=True e a antiga flag de teste setada, o freela só
        entra 'Em andamento' quando o pagamento for confirmado pelo webhook."""
        create.return_value = FakeStripeSession('cs_test_4', 'https://checkout.stripe.com/c/pay/cs_test_4')
        self.client.force_authenticate(self.contratante)

        response = self.client.post(
            '/api/pagamentos/acordo/',
            {'acordo_id': self.acordo.id},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotIn('test_approved', response.data)
        self.acordo.refresh_from_db()
        self.assertEqual(self.acordo.status_acordo, 'Pendente Pagamento')
        pagamento = Pagamento.objects.get(acordo=self.acordo)
        self.assertEqual(pagamento.status, 'pendente')
        self.assertEqual(
            response.data['init_point'],
            'https://checkout.stripe.com/c/pay/cs_test_4',
        )

    def test_endpoint_de_simular_pagamento_nao_existe_mais(self):
        self.client.force_authenticate(self.contratante)

        response = self.client.post(
            f'/api/pagamentos/acordo/{self.acordo.id}/simular/',
            {},
            format='json',
        )

        self.assertEqual(response.status_code, 404)

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
    def test_acordo_ativo_legado_pode_ser_concluido_no_ambiente_local(self):
        """Compatibilidade apenas para acordos antigos que ficaram 'Ativo' sem
        nenhum pagamento registrado. Depende só de DEBUG=True, não de nenhuma
        flag de teste — essa é a única forma de registrar um pagamento sem
        checkout real que ainda existe no sistema."""
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
                forma_pagamento='registro_legado',
            ).exists(),
        )

    @override_settings(DEBUG=False)
    def test_acordo_ativo_legado_nao_pode_ser_concluido_fora_do_debug(self):
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

    def test_completude_perfil_detalha_itens_atendidos_e_faltantes(self):
        # Reproduz o caso real que gerou a duvida: foto, cidade e categorias
        # preenchidas, mas bio com menos de 20 caracteres e telefone com a
        # visibilidade desligada - o detalhamento precisa apontar exatamente
        # esses dois itens como pendentes, nao só o total agregado.
        profile = self.contratante.profile
        profile.foto_perfil = 'https://exemplo.com/foto.jpg'
        profile.bio = 'Bio curta'
        profile.cidade = 'São Paulo'
        profile.telefone = '11999999999'
        profile.telefone_visivel = False
        profile.categories = ['Desenvolvimento Web']
        profile.save()

        response = self.client.get(f'/api/ads/{self.ad.id}/')

        self.assertEqual(response.status_code, 200)
        itens = response.data['author_reputation']['completude_perfil_detalhe']
        por_chave = {item['chave']: item for item in itens}

        self.assertTrue(por_chave['foto']['atendido'])
        self.assertEqual(por_chave['foto']['pontos'], 15)
        self.assertFalse(por_chave['bio']['atendido'])
        self.assertEqual(por_chave['bio']['pontos'], 20)
        self.assertTrue(por_chave['cidade']['atendido'])
        self.assertFalse(por_chave['contato']['atendido'])
        self.assertTrue(por_chave['categorias']['atendido'])
        self.assertFalse(por_chave['portfolio']['atendido'])
        self.assertEqual(por_chave['portfolio']['pontos'], 30)


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
