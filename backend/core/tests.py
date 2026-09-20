from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import (
    Ad,
    AcordoServico,
    Avaliacao,
    Candidatura,
    MensagemChat,
    Notificacao,
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


class FakeStripeObject(dict):
    """Simula o StripeObject (data.object) dentro de um evento do webhook."""

    def to_dict(self):
        return dict(self)


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
            'data': {'object': FakeStripeObject({
                'client_reference_id': pagamento.referencia_externa,
                'amount_total': 125000,
                'currency': 'brl',
                'payment_status': 'paid',
                'payment_intent': 'pi_teste123',
            })},
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


class LimitesPlanoAPITests(TestCase):
    """Cada plano de assinatura limita quantos anúncios e candidaturas o
    usuário pode enviar por mês (Gratuito: 3 anúncios / 5 candidaturas,
    Gold: 6 anúncios / 20 candidaturas, Platinum: ilimitado)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='limite@example.com',
            email='limite@example.com',
            password='secret123',
        )
        self.outro_anunciante = User.objects.create_user(
            username='outroanunciante@example.com',
            email='outroanunciante@example.com',
            password='secret123',
        )

    def _criar_ads_do_outro_anunciante(self, quantidade):
        return [
            Ad.objects.create(
                author=self.outro_anunciante,
                title=f'Serviço {i}',
                description='Descrição',
                price='100.00',
            )
            for i in range(quantidade)
        ]

    def _payload_anuncio(self, titulo):
        return {
            'title': titulo,
            'description': 'Descrição do serviço.',
            'price': '100.00',
            'category': 'Tecnologia',
            'role': 'contractor',
        }

    def test_endpoint_limite_anuncios_reflete_plano_gold_com_seis_por_mes(self):
        self.user.profile.subscription_plan = 'Gold'
        self.user.profile.save(update_fields=['subscription_plan'])
        self.client.force_authenticate(self.user)

        response = self.client.get('/api/ads/limite/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['plano'], 'Gold')
        self.assertEqual(response.data['limite'], 6)
        self.assertEqual(response.data['usados'], 0)
        self.assertFalse(response.data['atingiu_limite'])

    def test_plano_gratuito_bloqueia_quarto_anuncio_no_mes(self):
        self.client.force_authenticate(self.user)
        for i in range(3):
            response = self.client.post('/api/ads/', self._payload_anuncio(f'Anúncio {i}'), format='json')
            self.assertEqual(response.status_code, 201, response.data)

        bloqueado = self.client.post('/api/ads/', self._payload_anuncio('Anúncio extra'), format='json')

        self.assertEqual(bloqueado.status_code, 400)
        self.assertEqual(Ad.objects.filter(author=self.user).count(), 3)

    def test_endpoint_limite_candidaturas_reflete_plano_gratuito_com_cinco_por_mes(self):
        self.client.force_authenticate(self.user)

        response = self.client.get('/api/candidaturas/limite/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['plano'], 'Gratuito')
        self.assertEqual(response.data['limite'], 5)
        self.assertEqual(response.data['usados'], 0)
        self.assertFalse(response.data['atingiu_limite'])

    def test_plano_gratuito_bloqueia_sexta_candidatura_no_mes(self):
        ads = self._criar_ads_do_outro_anunciante(6)
        self.client.force_authenticate(self.user)

        for ad in ads[:5]:
            response = self.client.post(
                '/api/candidaturas/',
                {'ad': ad.id, 'mensagem': 'Tenho interesse.'},
                format='json',
            )
            self.assertEqual(response.status_code, 201, response.data)

        bloqueado = self.client.post(
            '/api/candidaturas/',
            {'ad': ads[5].id, 'mensagem': 'Tenho interesse.'},
            format='json',
        )

        self.assertEqual(bloqueado.status_code, 400)
        self.assertEqual(Candidatura.objects.filter(user=self.user).count(), 5)

    def test_plano_platinum_nao_tem_limite_de_candidaturas(self):
        ads = self._criar_ads_do_outro_anunciante(6)
        self.user.profile.subscription_plan = 'Platinum'
        self.user.profile.save(update_fields=['subscription_plan'])
        self.client.force_authenticate(self.user)

        for ad in ads:
            response = self.client.post(
                '/api/candidaturas/',
                {'ad': ad.id, 'mensagem': 'Tenho interesse.'},
                format='json',
            )
            self.assertEqual(response.status_code, 201, response.data)

        status_limite = self.client.get('/api/candidaturas/limite/')
        self.assertIsNone(status_limite.data['limite'])
        self.assertFalse(status_limite.data['atingiu_limite'])


class ChatSegurancaAPITests(TestCase):
    """Admins (is_staff) não participantes de um acordo não podem ler nem
    enviar mensagens no chat entre as partes — só os próprios envolvidos."""

    def setUp(self):
        self.client = APIClient()
        self.contratante = User.objects.create_user(
            username='contratante-chat@example.com',
            email='contratante-chat@example.com',
            password='secret123',
        )
        self.freelancer = User.objects.create_user(
            username='freelancer-chat@example.com',
            email='freelancer-chat@example.com',
            password='secret123',
        )
        self.admin = User.objects.create_user(
            username='admin-chat@example.com',
            email='admin-chat@example.com',
            password='secret123',
            is_staff=True,
        )
        self.ad = Ad.objects.create(
            author=self.contratante,
            title='Criação de logo',
            description='Logo para a empresa',
            price='500.00',
        )
        self.candidatura = Candidatura.objects.create(
            user=self.freelancer,
            ad=self.ad,
            status='pendente',
        )
        self.acordo = AcordoServico.objects.create(
            candidatura=self.candidatura,
            status_acordo='Ativo',
            valor_acordado=500,
            titulo_anuncio='Criação de logo',
            descricao_servico='Logo para a empresa',
        )

    def test_admin_nao_pode_ver_mensagens_de_conversa_alheia(self):
        self.client.force_authenticate(self.freelancer)
        self.client.post(f'/api/chat/{self.acordo.id}/messages/', {'texto': 'Oi, tudo bem?'}, format='json')

        self.client.force_authenticate(self.admin)
        response = self.client.get(f'/api/chat/{self.acordo.id}/')
        self.assertEqual(response.status_code, 403)

    def test_admin_nao_pode_enviar_mensagem_em_conversa_alheia(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f'/api/chat/{self.acordo.id}/messages/',
            {'texto': 'Mensagem indevida de um admin.'},
            format='json',
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(MensagemChat.objects.filter(acordo=self.acordo).count(), 0)

    def test_admin_nao_pode_marcar_conversa_alheia_como_lida(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(f'/api/chat/{self.acordo.id}/ler/')
        self.assertEqual(response.status_code, 403)

    def test_admin_nao_ve_conversas_alheias_na_listagem(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/chat/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_admin_nao_conta_nao_lidas_de_conversas_alheias(self):
        self.client.force_authenticate(self.freelancer)
        self.client.post(f'/api/chat/{self.acordo.id}/messages/', {'texto': 'Mensagem não lida'}, format='json')

        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/chat/nao-lidas/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total'], 0)

    def test_partes_continuam_conversando_normalmente(self):
        self.client.force_authenticate(self.contratante)
        envio = self.client.post(
            f'/api/chat/{self.acordo.id}/messages/',
            {'texto': 'Olá, freelancer!'},
            format='json',
        )
        self.assertEqual(envio.status_code, 201)

        self.client.force_authenticate(self.freelancer)
        detalhe = self.client.get(f'/api/chat/{self.acordo.id}/')
        self.assertEqual(detalhe.status_code, 200)
        self.assertEqual(len(detalhe.data['messages']), 1)


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


class CadastroConflitoEmailTests(TestCase):
    """Email não pode ser duplicado entre cadastro manual e login Google."""

    def setUp(self):
        self.client = APIClient()
        self.fake_identity = {
            'sub': '1234567890',
            'email': 'googleteste@example.com',
            'given_name': 'Google',
            'family_name': 'Teste',
            'email_verified': True,
        }

    def _post_google(self):
        from allauth.socialaccount.providers.google import views as google_views

        with patch.object(google_views, '_verify_and_decode', return_value=self.fake_identity):
            return self.client.post('/api/auth/google/', {'id_token': 'fake.jwt'}, format='json')

    def test_manual_rejeita_email_ja_utilizado(self):
        User.objects.create_user(username='existente', email=self.fake_identity['email'], password='x')
        resp = self.client.post('/api/auth/register/', {
            'username': 'novo_usuario',
            'email': self.fake_identity['email'],
            'password': 'Abcdef1@',
            'first_name': 'Novo',
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('Este email já está sendo utilizado.', str(resp.data))

    def test_manual_rejeita_email_proveniente_do_google(self):
        self._post_google()
        resp = self.client.post('/api/auth/register/', {
            'username': 'outro_usuario',
            'email': self.fake_identity['email'],
            'password': 'Abcdef1@',
            'first_name': 'Outro',
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('Este email já está sendo utilizado.', str(resp.data))

    def test_google_cria_conta_nova(self):
        resp = self._post_google()
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(User.objects.filter(email=self.fake_identity['email']).exists())

    def test_google_rejeita_email_de_conta_manual(self):
        User.objects.create_user(username='manual', email=self.fake_identity['email'], password='x')
        resp = self._post_google()
        self.assertEqual(resp.status_code, 409)
        self.assertIn('Este email já está sendo utilizado.', str(resp.data))

    def test_google_relogin_mesma_conta_ok(self):
        self._post_google()
        token1 = self._post_google().data['token']
        resp2 = self._post_google()
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.data['token'], token1)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class VerificacaoEmailTests(TestCase):
    """Cadastro manual exige confirmação do email antes de entrar no site."""

    def setUp(self):
        self.client = APIClient()

    def _registrar(self):
        return self.client.post('/api/auth/register/', {
            'username': 'novo@example.com',
            'email': 'novo@example.com',
            'password': 'Abcdef1@',
            'first_name': 'Novo',
        }, format='json')

    def test_registro_nao_emite_token_e_cria_codigo(self):
        resp = self._registrar()
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn('token', resp.data)
        user = User.objects.get(email='novo@example.com')
        verificacao = VerificacaoEmail.objects.get(usuario=user)
        self.assertFalse(verificacao.verificado)
        self.assertTrue(verificacao.codigo)

    def test_login_bloqueado_antes_de_confirmar_email(self):
        self._registrar()
        resp = self.client.post('/api/auth/login/', {
            'username': 'novo@example.com',
            'password': 'Abcdef1@',
        }, format='json')
        self.assertEqual(resp.status_code, 403)
        self.assertIn('Confirme seu email', str(resp.data))

    def test_codigo_incorreto_rejeitado(self):
        self._registrar()
        resp = self.client.post('/api/auth/verificar-codigo/', {
            'email': 'novo@example.com',
            'codigo': '000000',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_confirma_email_e_libera_acesso(self):
        self._registrar()
        user = User.objects.get(email='novo@example.com')
        codigo = VerificacaoEmail.objects.get(usuario=user).codigo

        resp = self.client.post('/api/auth/verificar-codigo/', {
            'email': 'novo@example.com',
            'codigo': codigo,
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('token', resp.data)
        self.assertTrue(VerificacaoEmail.objects.get(usuario=user).verificado)

        login = self.client.post('/api/auth/login/', {
            'username': 'novo@example.com',
            'password': 'Abcdef1@',
        }, format='json')
        self.assertEqual(login.status_code, 200)


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
        self.assertNotIn('token', response.data)
        user = User.objects.get(username='valida@example.com')
        self.assertTrue(user.check_password(self.SENHA_VALIDA))
        self.assertTrue(VerificacaoEmail.objects.filter(usuario=user, verificado=False).exists())

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

    # ---------- Termo do perfil de freelancer ----------

    def test_virar_freelancer_sem_aceitar_termo_e_recusado(self):
        user = User.objects.create_user(
            username='freela-sem-termo@example.com',
            email='freela-sem-termo@example.com',
            password=self.SENHA_VALIDA,
        )
        self.client.force_authenticate(user)
        response = self.client.patch(
            '/api/auth/profile/',
            {'papel': 'freelancer'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('aceitou_termos_freelancer', response.data)
        user.refresh_from_db()
        self.assertNotEqual(user.profile.papel, 'freelancer')

    def test_virar_freelancer_aceitando_termo_e_aceito(self):
        user = User.objects.create_user(
            username='freela-com-termo@example.com',
            email='freela-com-termo@example.com',
            password=self.SENHA_VALIDA,
        )
        self.client.force_authenticate(user)
        response = self.client.patch(
            '/api/auth/profile/',
            {'papel': 'freelancer', 'aceitou_termos_freelancer': True},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertEqual(user.profile.papel, 'freelancer')
        self.assertTrue(user.profile.aceitou_termos_freelancer)


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


class NotificacaoAPITests(TestCase):
    """
    Cobre o bug em que a notificação de candidatura continuava exibindo o
    título antigo do anúncio depois que o contratante o renomeava, e o novo
    endpoint de limpar notificações.
    """

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
        self.ad = Ad.objects.create(
            author=self.contratante,
            title='Criação de site',
            description='Site institucional',
            price='1250.00',
        )

    def test_mensagem_da_notificacao_acompanha_renomeacao_do_anuncio(self):
        self.client.force_authenticate(self.freelancer)
        response = self.client.post(
            '/api/candidaturas/',
            {'ad': self.ad.id, 'mensagem': 'Tenho interesse'},
            format='json',
        )
        self.assertEqual(response.status_code, 201)

        self.ad.title = 'Criação de site institucional completo'
        self.ad.save()

        notificacao = Notificacao.objects.get(usuario=self.contratante)
        self.client.force_authenticate(self.contratante)
        listagem = self.client.get('/api/notificacoes/')

        self.assertEqual(listagem.status_code, 200)
        mensagem = next(n['mensagem'] for n in listagem.data if n['id'] == notificacao.id)
        self.assertIn('Criação de site institucional completo', mensagem)
        self.assertNotIn('"Criação de site"', mensagem)

    def test_limpar_notificacoes_remove_todas_do_usuario(self):
        Notificacao.objects.create(usuario=self.contratante, tipo='sistema', titulo='Teste', mensagem='Oi')
        Notificacao.objects.create(usuario=self.contratante, tipo='sistema', titulo='Teste 2', mensagem='Oi 2')
        outro_usuario_notificacao = Notificacao.objects.create(
            usuario=self.freelancer, tipo='sistema', titulo='Não deve sumir', mensagem='Oi 3',
        )

        self.client.force_authenticate(self.contratante)
        response = self.client.delete('/api/notificacoes/limpar/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 2)
        self.assertFalse(Notificacao.objects.filter(usuario=self.contratante).exists())
        self.assertTrue(Notificacao.objects.filter(pk=outro_usuario_notificacao.pk).exists())


class ExcluirContaAPITests(TestCase):
    """Fluxo de exclusão de conta com soft delete completo do conteúdo."""

    SENHA = 'SenhaValida1@'

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='apagar@example.com',
            email='apagar@example.com',
            password=self.SENHA,
            first_name='Alice',
            last_name='Removivel',
        )
        self.profile = UserProfile.objects.get(user=self.user)
        self.profile.nome_completo = 'Alice Removivel'
        self.profile.email = 'apagar@example.com'
        self.profile.cidade = 'São Paulo'
        self.profile.bio = 'Uma biografia qualquer'
        self.profile.categories = ['Design']
        self.profile.skills = ['Figma']
        self.profile.save()
        self.token = Token.objects.create(user=self.user)

        self.contratante = User.objects.create_user(
            username='contratante-excl@example.com',
            email='contratante-excl@example.com',
            password=self.SENHA,
        )
        perfil_contratante = UserProfile.objects.get(user=self.contratante)
        perfil_contratante.nome_completo = 'Bia Contratante'
        perfil_contratante.email = 'contratante-excl@example.com'
        perfil_contratante.save()
        self.contratante_token = Token.objects.create(user=self.contratante)

        self.ad = Ad.objects.create(
            author=self.contratante,
            title='Projeto de teste',
            description='Descrição',
            price='500.00',
            role='freelancer',
        )
        self.candidatura = Candidatura.objects.create(
            user=self.user,
            ad=self.ad,
            mensagem='Quero participar',
            status='pendente',
            usuario_id=self.profile.id,
        )
        self.acordo = AcordoServico.objects.create(
            candidatura=self.candidatura,
            status_acordo='Pendente Pagamento',
            valor_acordado=500.0,
            titulo_anuncio='Projeto de teste',
            nome_contratante='Bia Contratante',
            nome_prestador='Alice Removivel',
            proposta_aceita='Quero participar',
        )
        self.mensagem = MensagemChat.objects.create(
            acordo=self.acordo,
            remetente=self.user,
            texto='Olá!',
        )
        Notificacao.objects.create(usuario=self.user, tipo='sistema', titulo='Boas-vindas')

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_user_serializer_expoe_tem_senha(self):
        self._auth(self.token)
        resp = self.client.get('/api/auth/user/')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['tem_senha'])

    def test_excluir_conta_recusa_senha_incorreta(self):
        self._auth(self.token)
        resp = self.client.post(
            '/api/auth/excluir-conta/', {'senha': 'senha-errada'}, format='json',
        )
        self.assertEqual(resp.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)
        self.assertTrue(Token.objects.filter(user=self.user).exists())

    def test_excluir_conta_faz_soft_delete_completo(self):
        self._auth(self.token)
        resp = self.client.post(
            '/api/auth/excluir-conta/', {'senha': self.SENHA}, format='json',
        )
        self.assertEqual(resp.status_code, 200)

        self.user.refresh_from_db()
        self.profile.refresh_from_db()
        self.ad.refresh_from_db()
        self.candidatura.refresh_from_db()
        self.mensagem.refresh_from_db()
        self.acordo.refresh_from_db()

        self.assertFalse(self.user.is_active)
        self.assertTrue(self.profile.deletado)
        self.assertEqual(self.profile.nome_completo, 'Usuário removido')
        self.assertEqual(self.profile.cidade, '')
        # O anúncio do contratante (que permanece ativo) não é escondido
        self.assertFalse(self.ad.deletado)
        self.assertTrue(self.candidatura.deletado)
        self.assertTrue(self.mensagem.deletado)
        self.assertTrue(Notificacao.objects.filter(usuario=self.user, deletado=True).exists())
        self.assertEqual(self.acordo.nome_prestador, 'Usuário removido')
        self.assertFalse(Token.objects.filter(user=self.user).exists())

        login = self.client.post(
            '/api/auth/login/',
            {'username': 'apagar@example.com', 'password': self.SENHA},
            format='json',
        )
        self.assertIn(login.status_code, (400, 401))

    def test_excluir_conta_esconde_conteudo_do_outro_lado(self):
        self._auth(self.token)
        resp = self.client.post(
            '/api/auth/excluir-conta/', {'senha': self.SENHA}, format='json',
        )
        self.assertEqual(resp.status_code, 200)

        # Perfil público some (404). O token do usuário excluído foi revogado,
        # então a consulta deve ser feita de forma anônima.
        self.client.credentials()
        resp_perfil = self.client.get(f'/api/users/{self.user.id}/')
        self.assertEqual(resp_perfil.status_code, 404)

        # O contratante não vê mais a candidatura do usuário excluído
        self._auth(self.contratante_token)
        resp_cands = self.client.get(f'/api/candidaturas/?ad_id={self.ad.id}')
        self.assertEqual(resp_cands.status_code, 200)
        ids = [c['id'] for c in resp_cands.data]
        self.assertNotIn(self.candidatura.id, ids)

    def test_excluir_conta_social_sem_senha_nao_requer_senha(self):
        social = User.objects.create_user(
            username='social-excl@example.com', email='social-excl@example.com',
        )
        perfil_social = UserProfile.objects.get(user=social)
        perfil_social.nome_completo = 'Usuário Social'
        perfil_social.email = 'social-excl@example.com'
        perfil_social.save()
        social_token = Token.objects.create(user=social)
        self._auth(social_token)

        resp_sem_senha = self.client.post('/api/auth/excluir-conta/', {}, format='json')
        self.assertEqual(resp_sem_senha.status_code, 200)
        social.refresh_from_db()
        self.assertFalse(social.is_active)
