from django.db import models
from django.contrib.auth.models import User

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
        if not self.titulo and self.title:
            self.titulo = self.title
        if not self.descricao and self.description:
            self.descricao = self.description
        if not self.valor and self.price:
            try:
                self.valor = float(self.price)
            except (ValueError, TypeError):
                self.valor = 0.0
        if not self.usuario_id and self.author_id:
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
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Candidatura - User: {self.usuario_id} Ad: {self.anuncio_id}"
