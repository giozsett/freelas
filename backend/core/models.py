from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True, default="Sou um adestrador certificado e apaixonado por animais. Tenho anos de experiência lidando com comportamento canino, ajudando donos a entenderem e treinarem seus cães com reforço positivo.")
    categories = models.JSONField(blank=True, default=list)
    skills = models.JSONField(blank=True, default=list)
    subscription_plan = models.CharField(max_length=50, default='Gratuito')

    def __str__(self):
        return f"Profile: {self.user.username}"

class Ad(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ads')
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    price = models.CharField(max_length=50)
    price_unit = models.CharField(max_length=20)
    skills = models.JSONField(default=list)
    location_type = models.CharField(max_length=50) # remoto, presencial
    address = models.CharField(max_length=200, blank=True)
    address_number = models.CharField(max_length=50, blank=True)
    description = models.TextField()
    role = models.CharField(max_length=50) # contractor ou freelancer
    deadline = models.CharField(max_length=100, blank=True) # data/prazo
    availability = models.TextField(blank=True) # disponibilidade
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.role})"

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
    
    # In a fully integrated system these would be ForeignKeys, 
    # but since frontend uses mock IDs for some elements, CharFields handle both.
    type = models.CharField(max_length=20, choices=REPORT_TYPES)
    target_id = models.CharField(max_length=50)
    target_name = models.CharField(max_length=200)
    
    category = models.CharField(max_length=100)
    comment = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report ({self.type}): {self.target_name} - {self.status}"
