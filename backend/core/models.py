from django.db import models
from django.contrib.auth.models import User
import random
import string
from django.utils import timezone

class UserProfile(models.Model):
    # Campos da tabela 'usuarios' já existente
    nome_completo = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    nome_fantasia = models.CharField(max_length=255, null=True, blank=True)
    reputacao = models.SmallIntegerField(default=0, null=True, blank=True)
    banido = models.BooleanField(default=False, null=True, blank=True)
    deletado = models.BooleanField(default=False, null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    atualizado_em = models.DateTimeField(auto_now=True, null=True, blank=True)

    # Campos que existiam no UserProfile (faltantes na tabela usuarios)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile', null=True, blank=True)
    bio = models.TextField(blank=True, default="Sou um adestrador certificado e apaixonado por animais. Tenho anos de experiência lidando com comportamento canino, ajudando donos a entenderem e treinarem seus cães com reforço positivo.")
    categories = models.JSONField(blank=True, default=list)
    skills = models.JSONField(blank=True, default=list)
    subscription_plan = models.CharField(max_length=50, default='Gratuito')

    # Novos campos
    foto_perfil = models.ImageField(upload_to='fotos_perfil/', null=True, blank=True)
    banner = models.ImageField(upload_to='banners/', null=True, blank=True)
    disponivel = models.BooleanField(default=True)

    # Informações de contato e localização
    cidade = models.CharField(max_length=255, null=True, blank=True)
    estado = models.CharField(max_length=2, null=True, blank=True)
    telefone = models.CharField(max_length=20, null=True, blank=True)
    email_visivel = models.BooleanField(default=True)
    telefone_visivel = models.BooleanField(default=True)
    redes_sociais = models.JSONField(blank=True, default=list)
    curriculo = models.FileField(upload_to='curriculos/', null=True, blank=True)

    class Meta:
        db_table = 'usuarios'

    def save(self, *args, **kwargs):
        if self.user:
            if not self.nome_completo:
                self.nome_completo = self.user.first_name or self.user.username
            if not self.email:
                self.email = self.user.email or f"{self.user.username}@example.com"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Profile: {self.nome_completo or (self.user.username if self.user else 'Unknown')}"

class Ad(models.Model):
    # Campos da tabela 'anuncios' já existente
    usuario_id = models.BigIntegerField(null=True, blank=True)
    titulo = models.CharField(max_length=255, null=True, blank=True)
    descricao = models.TextField(null=True, blank=True)
    valor = models.FloatField(null=True, blank=True)
    status_anuncio = models.CharField(max_length=50, null=True, blank=True, db_column='status')
    deletado = models.BooleanField(default=False, null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    atualizado_em = models.DateTimeField(auto_now=True, null=True, blank=True)

    # Campos que existiam no Ad (faltantes na tabela anuncios)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ads', null=True, blank=True)
    title = models.CharField(max_length=200, null=True, blank=True)
    category = models.CharField(max_length=100, null=True, blank=True)
    price = models.CharField(max_length=50, null=True, blank=True)
    price_unit = models.CharField(max_length=20, null=True, blank=True)
    skills = models.JSONField(default=list, blank=True)
    location_type = models.CharField(max_length=50, null=True, blank=True)
    address = models.CharField(max_length=200, blank=True, null=True)
    address_number = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(null=True, blank=True)
    role = models.CharField(max_length=50, null=True, blank=True)
    deadline = models.CharField(max_length=100, blank=True, null=True)
    availability = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        db_table = 'anuncios'

    def save(self, *args, **kwargs):
        if self.title:
            self.titulo = self.title
        if self.description:
            self.descricao = self.description
        if self.price:
            try:
                self.valor = float(self.price)
            except (ValueError, TypeError):
                self.valor = 0.0
        if self.author_id:
            try:
                self.usuario_id = self.author.profile.id
            except Exception:
                self.usuario_id = self.author_id
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title or self.titulo} ({self.role or 'N/A'})"

class Report(models.Model):
    REPORT_TYPES = (
        ('user', 'Usuário'),
        ('ad', 'Anúncio'),
    )
    STATUS_CHOICES = (
        ('pending', 'Pendente'),
        ('procedente', 'Procedente'),
        ('improcedente', 'Improcedente'),
    )
    
    # Campos que existiam no Report
    type = models.CharField(max_length=20, choices=REPORT_TYPES, null=True, blank=True)
    target_id = models.CharField(max_length=50, null=True, blank=True)
    target_name = models.CharField(max_length=200, null=True, blank=True)
    
    category = models.CharField(max_length=100, null=True, blank=True)
    comment = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        db_table = 'denuncias'

    def __str__(self):
        return f"Report ({self.type}): {self.target_name} - {self.status}"

class Candidatura(models.Model):
    # Campos da tabela 'candidaturas' do supabase
    usuario_id = models.BigIntegerField(null=True, blank=True)
    anuncio_id = models.BigIntegerField(null=True, blank=True)
    mensagem = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=50, null=True, blank=True, default='pendente')
    enviado_em = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    atualizado_em = models.DateTimeField(auto_now=True, null=True, blank=True)

    # Django specific relations
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='candidaturas', null=True, blank=True)
    ad = models.ForeignKey('Ad', on_delete=models.CASCADE, related_name='candidaturas', null=True, blank=True)

    class Meta:
        db_table = 'candidaturas'

    def save(self, *args, **kwargs):
        if self.user and not self.usuario_id:
            try:
                self.usuario_id = self.user.profile.id
            except Exception:
                self.usuario_id = self.user.id
        if self.ad and not self.anuncio_id:
            self.anuncio_id = self.ad.id
        
        # Check if status has been changed to 'aprovada'
        if self.status and self.status.lower() == 'aprovada':
            ad_obj = self.ad
            if not ad_obj and self.anuncio_id:
                try:
                    ad_obj = Ad.objects.get(id=self.anuncio_id)
                except Ad.DoesNotExist:
                    pass
            if ad_obj:
                ad_obj.status_anuncio = 'Finalizado'
                from django.utils import timezone
                ad_obj.atualizado_em = timezone.now()
                ad_obj.save()
                
                nome_contratante = 'Desconhecido'
                if ad_obj.author and hasattr(ad_obj.author, 'profile'):
                    nome_contratante = ad_obj.author.profile.nome_completo or ad_obj.author.username
                elif ad_obj.author:
                    nome_contratante = ad_obj.author.first_name or ad_obj.author.username
                    
                nome_prestador = 'Desconhecido'
                if self.user and hasattr(self.user, 'profile'):
                    nome_prestador = self.user.profile.nome_completo or self.user.username
                elif self.user:
                    nome_prestador = self.user.first_name or self.user.username
                
                AcordoServico.objects.get_or_create(
                    candidatura=self,
                    defaults={
                        'status_acordo': 'Pendente Pagamento',
                        'valor_acordado': ad_obj.valor or 0.0,
                        'unidade_valor': getattr(ad_obj, 'price_unit', 'Integral') or 'Integral',
                        'titulo_anuncio': ad_obj.titulo or getattr(ad_obj, 'title', ''),
                        'descricao_servico': ad_obj.descricao or getattr(ad_obj, 'description', ''),
                        'proposta_aceita': self.mensagem,
                        'nome_contratante': nome_contratante,
                        'nome_prestador': nome_prestador,
                        'data_confirmacao': timezone.now()
                    }
                )
                
        super().save(*args, **kwargs)

        if self.status and self.status.lower() == 'aprovada' and self.ad_id:
            Candidatura.objects.filter(
                ad_id=self.ad_id,
                status='pendente',
            ).exclude(pk=self.pk).update(
                status='encerrada',
                atualizado_em=timezone.now(),
            )

    def __str__(self):
        return f"Candidatura - User: {self.usuario_id} Ad: {self.anuncio_id}"

class VerificacaoEmail(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE, related_name='codigo_verificacao')
    codigo = models.CharField(max_length=6)
    criado_em = models.DateTimeField(auto_now=True)  # ← mudou aqui
    verificado = models.BooleanField(default=False)

    class Meta:
        db_table = 'codigos_verificacao_email'

    def esta_expirado(self):
        return timezone.now() > self.criado_em + timezone.timedelta(minutes=10)

    def gerar_codigo(self):
        self.codigo = ''.join(random.choices(string.digits, k=6))
        self.save()  # auto_now=True já atualiza o criado_em automaticamente ao salvar

    def __str__(self):
        return f"Código de {self.usuario.email}: {self.codigo}"

class AcordoServico(models.Model):
    STATUS_CHOICES = (
        ('Pendente Pagamento', 'Pagamento pendente'),
        ('Ativo', 'Em andamento'),
        ('Concluído', 'Concluído'),
        ('Cancelado', 'Cancelado'),
    )

    # Campos que existiam/novos na tabela acordo_servico
    status_acordo = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='Pendente Pagamento',
    )
    valor_acordado = models.FloatField(blank=True, null=True)
    conclusao_prevista = models.DateField(blank=True, null=True)
    candidatura = models.ForeignKey('Candidatura', on_delete=models.CASCADE, related_name='acordos', blank=True, null=True)
    
    # Novas colunas em português
    titulo_anuncio = models.CharField(max_length=255, null=True, blank=True)
    descricao_servico = models.TextField(null=True, blank=True)
    unidade_valor = models.CharField(max_length=50, null=True, blank=True)
    proposta_aceita = models.TextField(null=True, blank=True)
    nome_contratante = models.CharField(max_length=255, null=True, blank=True)
    nome_prestador = models.CharField(max_length=255, null=True, blank=True)
    data_confirmacao = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    concluido_em = models.DateTimeField(null=True, blank=True)
    cancelado_em = models.DateTimeField(null=True, blank=True)

    # Campos de solicitação de alteração (adicionados na mesma tabela acordo_servico)
    tem_solicitacao = models.BooleanField(default=False)
    solicitado_por = models.CharField(max_length=50, null=True, blank=True) # 'freelancer' ou 'contratante'
    justificativa_alteracao = models.TextField(null=True, blank=True)
    proposto_valor = models.FloatField(null=True, blank=True)
    proposta_descricao = models.TextField(null=True, blank=True)
    proposta_conclusao_prevista = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'acordo_servico'

    def __str__(self):
        return f"Acordo - {self.titulo_anuncio} ({self.status_acordo})"


class SolicitacaoCancelamentoAcordo(models.Model):
    STATUS_CHOICES = (
        ('pendente', 'Pendente'),
        ('aprovada', 'Aprovada'),
        ('recusada', 'Recusada'),
    )
    PAPEIS = (
        ('freelancer', 'Freelancer'),
        ('contratante', 'Contratante'),
    )

    acordo = models.ForeignKey(
        AcordoServico,
        on_delete=models.CASCADE,
        related_name='solicitacoes_cancelamento',
    )
    solicitante = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='cancelamentos_acordo_solicitados',
    )
    papel_solicitante = models.CharField(max_length=20, choices=PAPEIS)
    justificativa = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    analisado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancelamentos_acordo_analisados',
    )
    resposta_admin = models.TextField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    analisado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'solicitacoes_cancelamento_acordo'
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['status', '-criado_em'], name='cancel_status_criado_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['acordo'],
                condition=models.Q(status='pendente'),
                name='cancelamento_pendente_unico_acordo',
            ),
        ]

    def __str__(self):
        return f"Cancelamento do acordo {self.acordo_id} - {self.status}"


class SolicitacaoAlteracaoAcordo(models.Model):
    STATUS_CHOICES = (
        ('pendente', 'Pendente'),
        ('aprovada', 'Aprovada'),
        ('recusada', 'Recusada'),
    )
    PAPEIS = SolicitacaoCancelamentoAcordo.PAPEIS

    acordo = models.ForeignKey(
        AcordoServico,
        on_delete=models.CASCADE,
        related_name='solicitacoes_alteracao',
    )
    solicitante = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='alteracoes_acordo_solicitadas',
    )
    papel_solicitante = models.CharField(max_length=20, choices=PAPEIS)
    justificativa = models.TextField()
    valor_anterior = models.FloatField(null=True, blank=True)
    valor_proposto = models.FloatField(null=True, blank=True)
    descricao_anterior = models.TextField(null=True, blank=True)
    descricao_proposta = models.TextField(null=True, blank=True)
    conclusao_anterior = models.DateField(null=True, blank=True)
    conclusao_proposta = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    decidido_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alteracoes_acordo_decididas',
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    decidido_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'solicitacoes_alteracao_acordo'
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['status', '-criado_em'], name='alter_status_criado_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['acordo'],
                condition=models.Q(status='pendente'),
                name='alteracao_pendente_unica_acordo',
            ),
        ]

    def __str__(self):
        return f"Alteração do acordo {self.acordo_id} - {self.status}"


class Avaliacao(models.Model):
    PAPEIS = (
        ('freelancer', 'Freelancer'),
        ('contratante', 'Contratante'),
    )

    acordo = models.ForeignKey(
        AcordoServico,
        on_delete=models.CASCADE,
        related_name='avaliacoes',
    )
    avaliador = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name='avaliacoes_enviadas',
    )
    avaliado = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name='avaliacoes_recebidas',
    )
    papel_avaliado = models.CharField(max_length=20, choices=PAPEIS)
    criterios = models.JSONField(default=dict)
    nota_geral = models.DecimalField(max_digits=3, decimal_places=2)
    comentario = models.TextField()
    criado_em = models.DateTimeField(auto_now_add=True, db_column='criada_em')

    class Meta:
        db_table = 'avaliacoes'
        ordering = ['-criado_em']
        constraints = [
            models.UniqueConstraint(
                fields=['acordo', 'avaliador'],
                name='avaliacao_unica_por_acordo_e_avaliador',
            ),
            models.CheckConstraint(
                condition=models.Q(nota_geral__gte=1) & models.Q(nota_geral__lte=5),
                name='avaliacao_nota_entre_um_e_cinco',
            ),
        ]

    def __str__(self):
        return f"Avaliação de {self.avaliador} para {self.avaliado}"


class Pagamento(models.Model):
    TIPOS = (
        ('assinatura', 'Assinatura'),
        ('acordo', 'Acordo Freelancer'),
    )
    STATUS_CHOICES = (
        ('pendente', 'Pendente'),
        ('pago', 'Pago'),
        ('falhou', 'Falhou'),
        ('cancelado', 'Cancelado'),
    )
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pagamentos')
    tipo = models.CharField(max_length=20, choices=TIPOS)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    referencia_externa = models.CharField(max_length=255, unique=True)
    mp_payment_id = models.CharField(max_length=255, null=True, blank=True)
    mp_preference_id = models.CharField(max_length=255, null=True, blank=True)
    checkout_url = models.URLField(max_length=1000, null=True, blank=True)
    forma_pagamento = models.CharField(max_length=50, null=True, blank=True)
    detalhe_status = models.CharField(max_length=100, null=True, blank=True)
    acordo = models.ForeignKey('AcordoServico', on_delete=models.SET_NULL, null=True, blank=True, related_name='pagamentos')
    plano = models.CharField(max_length=50, null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    aprovado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'pagamentos'

    def __str__(self):
        return f"Pagamento {self.tipo} - {self.status} - R$ {self.valor}"


class CartaoUsuario(models.Model):
    """Metadados não sensíveis de cartões usados no checkout do Mercado Pago."""

    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cartoes')
    mp_card_id = models.CharField(max_length=255, null=True, blank=True)
    bandeira = models.CharField(max_length=50)
    ultimos_quatro = models.CharField(max_length=4)
    mes_expiracao = models.PositiveSmallIntegerField(null=True, blank=True)
    ano_expiracao = models.PositiveSmallIntegerField(null=True, blank=True)
    nome_titular = models.CharField(max_length=255, null=True, blank=True)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cartoes_usuario'
        ordering = ['-atualizado_em']
        constraints = [
            models.UniqueConstraint(
                fields=['usuario', 'bandeira', 'ultimos_quatro'],
                name='cartao_usuario_bandeira_final_unico',
            ),
        ]

    def __str__(self):
        return f"{self.bandeira} final {self.ultimos_quatro}"


class InstituicaoEnsino(models.Model):
    nome = models.CharField(max_length=255, unique=True)
    verificado = models.BooleanField(default=True)

    class Meta:
        db_table = 'instituicoes_ensino'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Certificado(models.Model):
    usuario = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='certificados')
    instituicao = models.CharField(max_length=255)
    nome_certificado = models.CharField(max_length=255)
    arquivo = models.FileField(upload_to='certificados/', null=True, blank=True)
    exibir_perfil = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'certificados'
        ordering = ['-criado_em']

    def __str__(self):
        return f"{self.nome_certificado} - {self.instituicao}"


class Experiencia(models.Model):
    usuario = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='experiencias')
    empresa = models.CharField(max_length=255)
    cargo = models.CharField(max_length=255)
    local = models.CharField(max_length=255, blank=True, null=True)
    data_inicio = models.DateField()
    data_fim = models.DateField(blank=True, null=True)
    atual = models.BooleanField(default=False)
    descricao = models.TextField(blank=True, null=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'experiencias'
        ordering = ['-data_inicio']

    def __str__(self):
        return f"{self.cargo} na {self.empresa}"


class Notificacao(models.Model):
    TIPOS = (
        ('candidatura', 'Candidatura'),
        ('acordo', 'Acordo'),
        ('avaliacao', 'Avaliação'),
        ('pagamento', 'Pagamento'),
        ('sistema', 'Sistema'),
    )

    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notificacoes')
    tipo = models.CharField(max_length=20, choices=TIPOS)
    titulo = models.CharField(max_length=255)
    mensagem = models.TextField(blank=True, default='')
    link = models.CharField(max_length=255, blank=True, default='')
    lida = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notificacoes'
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['usuario', 'lida'], name='notif_user_lida_idx'),
        ]

    def __str__(self):
        return f"{self.titulo} -> {self.usuario.username}"
