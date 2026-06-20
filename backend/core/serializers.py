from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ('bio', 'categories', 'skills', 'subscription_plan')

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'profile')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'first_name')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', '')
        )
        # NÃO cria o UserProfile aqui — será criado após verificação do email
        return user

from .models import Report

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = '__all__'

from .models import Ad

class AdSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_rating = serializers.FloatField(read_only=True, default=4.5) # Mock for now
    
    class Meta:
        model = Ad
        fields = '__all__'
        read_only_fields = ('author', 'created_at')

    def get_author_name(self, obj):
        name = obj.author.first_name
        return name if name else obj.author.username

from .models import Candidatura

class CandidaturaSerializer(serializers.ModelSerializer):
    applicant_name = serializers.SerializerMethodField()
    ad_title = serializers.SerializerMethodField()
    ad_price = serializers.SerializerMethodField()
    ad_price_unit = serializers.SerializerMethodField()
    ad_description = serializers.SerializerMethodField()
    ad_category = serializers.SerializerMethodField()
    ad_author_id = serializers.SerializerMethodField()
    ad_author_name = serializers.SerializerMethodField()

    class Meta:
        model = Candidatura
        fields = '__all__'
        read_only_fields = ('user', 'enviado_em', 'atualizado_em')

    def get_applicant_name(self, obj):
        if obj.user:
            name = obj.user.first_name
            return name if name else obj.user.username
        return f"User {obj.usuario_id}"

    def get_ad_title(self, obj):
        if obj.ad:
            return obj.ad.titulo or obj.ad.title
        return f"Ad {obj.anuncio_id}"

    def get_ad_price(self, obj):
        if obj.ad:
            return obj.ad.price or str(obj.ad.valor)
        return ""

    def get_ad_price_unit(self, obj):
        if obj.ad:
            return obj.ad.price_unit
        return ""

    def get_ad_description(self, obj):
        if obj.ad:
            return obj.ad.description or obj.ad.descricao
        return ""

    def get_ad_category(self, obj):
        if obj.ad:
            return obj.ad.category
        return ""

    def get_ad_author_id(self, obj):
        if obj.ad and obj.ad.author:
            return obj.ad.author.id
        return None

    def get_ad_author_name(self, obj):
        if obj.ad and obj.ad.author:
            name = obj.ad.author.first_name
            return name if name else obj.ad.author.username
        return "Usuário Desconhecido"