import json
from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    certificados = serializers.SerializerMethodField()
    experiencias = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ('nome_completo', 'bio', 'categories', 'skills', 'subscription_plan', 'foto_perfil', 'banner', 'curriculo', 'disponivel', 'cidade', 'estado', 'telefone', 'email_visivel', 'telefone_visivel', 'redes_sociais', 'certificados', 'experiencias')
        read_only_fields = ('foto_perfil',)

    def get_certificados(self, obj):
        certificados = obj.certificados.filter(exibir_perfil=True)
        return CertificadoSerializer(certificados, many=True, context=self.context).data

    def get_experiencias(self, obj):
        experiencias = obj.experiencias.all()
        return ExperienciaSerializer(experiencias, many=True, context=self.context).data

    def update(self, instance, validated_data):
        for field in ['disponivel', 'email_visivel', 'telefone_visivel']:
            if field in self.initial_data:
                value = self.initial_data[field]
                if isinstance(value, str):
                    validated_data[field] = value.lower() in ('true', '1', 'yes')
        for field in ['categories', 'skills']:
            if field in self.initial_data:
                value = self.initial_data[field]
                if isinstance(value, str):
                    try:
                        validated_data[field] = json.loads(value)
                    except (json.JSONDecodeError, TypeError):
                        pass
        if instance.user and 'nome_completo' not in validated_data:
            validated_data['nome_completo'] = f"{instance.user.first_name} {instance.user.last_name}".strip() or instance.user.username
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        if instance.foto_perfil:
            if request:
                ret['foto_perfil'] = request.build_absolute_uri(instance.foto_perfil.url)
            else:
                ret['foto_perfil'] = instance.foto_perfil.url
        else:
            ret['foto_perfil'] = None
        if instance.banner:
            if request:
                ret['banner'] = request.build_absolute_uri(instance.banner.url)
            else:
                ret['banner'] = instance.banner.url
        else:
            ret['banner'] = None
        if instance.curriculo:
            if request:
                ret['curriculo'] = request.build_absolute_uri(instance.curriculo.url)
            else:
                ret['curriculo'] = instance.curriculo.url
        else:
            ret['curriculo'] = None
        return ret

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'profile')

    def update(self, instance, validated_data):
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.save()
        if hasattr(instance, 'profile'):
            instance.profile.nome_completo = f"{instance.first_name} {instance.last_name}".strip() or instance.username
            instance.profile.save(update_fields=['nome_completo'])
        return instance

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


from .models import AcordoServico

class AcordoServicoSerializer(serializers.ModelSerializer):
    freelancer_id = serializers.SerializerMethodField()
    contratante_id = serializers.SerializerMethodField()
    anuncio_id = serializers.SerializerMethodField()
    aprovar_solicitacao = serializers.BooleanField(write_only=True, required=False)
    recusar_solicitacao = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = AcordoServico
        fields = '__all__'

    def get_freelancer_id(self, obj):
        if obj.candidatura and obj.candidatura.user:
            return obj.candidatura.user.id
        return None

    def get_contratante_id(self, obj):
        if obj.candidatura and obj.candidatura.ad and obj.candidatura.ad.author:
            return obj.candidatura.ad.author.id
        return None

    def get_anuncio_id(self, obj):
        if obj.candidatura:
            return obj.candidatura.anuncio_id
        return None

    def update(self, instance, validated_data):
        aprovar = validated_data.pop('aprovar_solicitacao', None)
        recusar = validated_data.pop('recusar_solicitacao', None)

        if aprovar:
            if instance.proposto_valor is not None:
                instance.valor_acordado = instance.proposto_valor
            if instance.proposta_descricao is not None:
                instance.descricao_servico = instance.proposta_descricao
            if instance.proposta_conclusao_prevista is not None:
                instance.conclusao_prevista = instance.proposta_conclusao_prevista

            instance.tem_solicitacao = False
            instance.solicitado_por = None
            instance.justificativa_alteracao = None
            instance.proposto_valor = None
            instance.proposta_descricao = None
            instance.proposta_conclusao_prevista = None
        elif recusar:
            instance.tem_solicitacao = False
            instance.solicitado_por = None
            instance.justificativa_alteracao = None
            instance.proposto_valor = None
            instance.proposta_descricao = None
            instance.proposta_conclusao_prevista = None

        return super().update(instance, validated_data)

class FotoPerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ('foto_perfil',)

    def update(self, instance, validated_data):
        instance.foto_perfil = validated_data.get('foto_perfil', instance.foto_perfil)
        instance.save()
        return instance


from .models import InstituicaoEnsino

class InstituicaoEnsinoSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstituicaoEnsino
        fields = ('id', 'nome', 'verificado')


from .models import Certificado

class CertificadoSerializer(serializers.ModelSerializer):
    arquivo_url = serializers.SerializerMethodField()

    class Meta:
        model = Certificado
        fields = ('id', 'instituicao', 'nome_certificado', 'arquivo', 'arquivo_url', 'exibir_perfil', 'criado_em')
        read_only_fields = ('usuario', 'criado_em')

    def get_arquivo_url(self, obj):
        if obj.arquivo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.arquivo.url)
            return obj.arquivo.url
        return None

    def create(self, validated_data):
        validated_data['usuario'] = self.context['request'].user.profile
        return super().create(validated_data)


from .models import Experiencia

class ExperienciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experiencia
        fields = ('id', 'empresa', 'cargo', 'local', 'data_inicio', 'data_fim', 'atual', 'descricao', 'criado_em')
        read_only_fields = ('usuario', 'criado_em')

    def create(self, validated_data):
        validated_data['usuario'] = self.context['request'].user.profile
        return super().create(validated_data)