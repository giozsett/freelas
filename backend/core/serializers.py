import json
from decimal import Decimal
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Avg, Count
from django.utils import timezone
from rest_framework import serializers
from .models import UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    certificados = serializers.SerializerMethodField()
    experiencias = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ('nome_completo', 'bio', 'categories', 'skills', 'subscription_plan', 'foto_perfil', 'banner', 'curriculo', 'disponivel', 'cidade', 'estado', 'telefone', 'email_visivel', 'telefone_visivel', 'redes_sociais', 'certificados', 'experiencias')
        read_only_fields = ('foto_perfil', 'subscription_plan')

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
    resumo_avaliacoes = serializers.SerializerMethodField()
    avaliacoes_recebidas = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'profile',
            'resumo_avaliacoes', 'avaliacoes_recebidas', 'is_staff',
        )
        read_only_fields = ('is_staff',)

    def get_resumo_avaliacoes(self, obj):
        result = {
            'freelancer': {'nota': None, 'total': 0},
            'contratante': {'nota': None, 'total': 0},
        }
        if not hasattr(obj, 'profile'):
            return result
        aggregates = obj.profile.avaliacoes_recebidas.values('papel_avaliado').annotate(
            nota=Avg('nota_geral'),
            total=Count('id'),
        )
        for item in aggregates:
            result[item['papel_avaliado']] = {
                'nota': round(float(item['nota']), 1),
                'total': item['total'],
            }
        return result

    def get_avaliacoes_recebidas(self, obj):
        if not hasattr(obj, 'profile'):
            return []
        queryset = obj.profile.avaliacoes_recebidas.select_related(
            'avaliador__user', 'acordo',
        ).all()
        return AvaliacaoSerializer(queryset, many=True, context=self.context).data

    def update(self, instance, validated_data):
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.save()
        if hasattr(instance, 'profile'):
            instance.profile.nome_completo = f"{instance.first_name} {instance.last_name}".strip() or instance.username
            instance.profile.save(update_fields=['nome_completo'])
        return instance

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
    author_rating = serializers.SerializerMethodField()
    
    class Meta:
        model = Ad
        fields = '__all__'
        read_only_fields = ('author', 'created_at')

    def get_author_name(self, obj):
        name = obj.author.first_name
        return name if name else obj.author.username

    def get_author_rating(self, obj):
        if not obj.author:
            return None
        if not hasattr(obj.author, 'profile'):
            return None
        result = obj.author.profile.avaliacoes_recebidas.filter(
            papel_avaliado='contratante',
        ).aggregate(nota=Avg('nota_geral'))
        return round(float(result['nota']), 1) if result['nota'] is not None else None

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
    indisponivel = serializers.SerializerMethodField()
    motivo_indisponibilidade = serializers.SerializerMethodField()

    class Meta:
        model = Candidatura
        fields = '__all__'
        read_only_fields = ('user', 'status', 'enviado_em', 'atualizado_em')

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

    def get_indisponivel(self, obj):
        if obj.status == 'encerrada':
            return True
        if not obj.ad_id or obj.status == 'aprovada':
            return False
        return obj.ad.candidaturas.filter(status='aprovada').exclude(pk=obj.pk).exists()

    def get_motivo_indisponibilidade(self, obj):
        if self.get_indisponivel(obj):
            return 'O autor já aprovou outra candidatura para este anúncio.'
        return None


from .models import (
    AcordoServico,
    SolicitacaoAlteracaoAcordo,
    SolicitacaoCancelamentoAcordo,
)


class SolicitacaoCancelamentoAcordoSerializer(serializers.ModelSerializer):
    acordo_titulo = serializers.CharField(source='acordo.titulo_anuncio', read_only=True)
    nome_contratante = serializers.CharField(source='acordo.nome_contratante', read_only=True)
    nome_prestador = serializers.CharField(source='acordo.nome_prestador', read_only=True)
    status_acordo = serializers.CharField(source='acordo.status_acordo', read_only=True)
    valor_acordado = serializers.FloatField(source='acordo.valor_acordado', read_only=True)
    solicitante_nome = serializers.SerializerMethodField()
    analisado_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = SolicitacaoCancelamentoAcordo
        fields = '__all__'
        read_only_fields = (
            'solicitante', 'papel_solicitante', 'status', 'analisado_por',
            'resposta_admin', 'criado_em', 'analisado_em',
        )

    def get_solicitante_nome(self, obj):
        return obj.solicitante.get_full_name() or obj.solicitante.username

    def get_analisado_por_nome(self, obj):
        if not obj.analisado_por:
            return None
        return obj.analisado_por.get_full_name() or obj.analisado_por.username


class SolicitacaoAlteracaoAcordoSerializer(serializers.ModelSerializer):
    acordo_titulo = serializers.CharField(source='acordo.titulo_anuncio', read_only=True)
    nome_contratante = serializers.CharField(source='acordo.nome_contratante', read_only=True)
    nome_prestador = serializers.CharField(source='acordo.nome_prestador', read_only=True)
    status_acordo = serializers.CharField(source='acordo.status_acordo', read_only=True)
    solicitante_nome = serializers.SerializerMethodField()
    decidido_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = SolicitacaoAlteracaoAcordo
        fields = '__all__'

    def get_solicitante_nome(self, obj):
        return obj.solicitante.get_full_name() or obj.solicitante.username

    def get_decidido_por_nome(self, obj):
        if not obj.decidido_por:
            return None
        return obj.decidido_por.get_full_name() or obj.decidido_por.username


class AcordoServicoSerializer(serializers.ModelSerializer):
    freelancer_id = serializers.SerializerMethodField()
    contratante_id = serializers.SerializerMethodField()
    anuncio_id = serializers.SerializerMethodField()
    aprovar_solicitacao = serializers.BooleanField(write_only=True, required=False)
    recusar_solicitacao = serializers.BooleanField(write_only=True, required=False)
    avaliacao_enviada = serializers.SerializerMethodField()
    cancelamento_pendente = serializers.SerializerMethodField()

    class Meta:
        model = AcordoServico
        fields = '__all__'
        read_only_fields = (
            'status_acordo', 'valor_acordado', 'titulo_anuncio',
            'descricao_servico', 'unidade_valor', 'proposta_aceita',
            'nome_contratante', 'nome_prestador', 'data_confirmacao',
            'concluido_em', 'cancelado_em', 'candidatura',
        )

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

    def get_avaliacao_enviada(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.avaliacoes.filter(avaliador=request.user.profile).exists()

    def get_cancelamento_pendente(self, obj):
        prefetched = getattr(obj, 'cancelamentos_pendentes', None)
        if prefetched is not None:
            solicitacao = prefetched[0] if prefetched else None
        else:
            solicitacao = obj.solicitacoes_cancelamento.filter(status='pendente').first()
        if not solicitacao:
            return None
        return SolicitacaoCancelamentoAcordoSerializer(
            solicitacao,
            context=self.context,
        ).data

    def update(self, instance, validated_data):
        aprovar = validated_data.pop('aprovar_solicitacao', None)
        recusar = validated_data.pop('recusar_solicitacao', None)
        request = self.context.get('request')
        user = request.user if request else None
        candidatura = instance.candidatura
        freelancer = candidatura.user if candidatura else None
        contratante = candidatura.ad.author if candidatura and candidatura.ad else None
        is_admin = bool(user and (user.is_staff or user.is_superuser))

        if user not in {freelancer, contratante} and not is_admin:
            raise serializers.ValidationError('Você não participa deste acordo.')

        solicitando = validated_data.get('tem_solicitacao') is True and not (aprovar or recusar)

        with transaction.atomic():
            if solicitando:
                if instance.status_acordo != 'Ativo':
                    raise serializers.ValidationError(
                        'Alterações só podem ser solicitadas em acordos em andamento.',
                    )
                if instance.tem_solicitacao or instance.solicitacoes_alteracao.filter(status='pendente').exists():
                    raise serializers.ValidationError(
                        'Já existe uma solicitação de alteração pendente.',
                    )
                if instance.solicitacoes_cancelamento.filter(status='pendente').exists():
                    raise serializers.ValidationError(
                        'Existe uma solicitação de cancelamento aguardando análise.',
                    )

                justificativa = str(validated_data.get('justificativa_alteracao') or '').strip()
                if not justificativa:
                    raise serializers.ValidationError({
                        'justificativa_alteracao': 'Informe a justificativa da alteração.',
                    })

                papel = 'freelancer' if user == freelancer else 'contratante'
                validated_data['solicitado_por'] = papel
                SolicitacaoAlteracaoAcordo.objects.create(
                    acordo=instance,
                    solicitante=user,
                    papel_solicitante=papel,
                    justificativa=justificativa,
                    valor_anterior=instance.valor_acordado,
                    valor_proposto=validated_data.get('proposto_valor'),
                    descricao_anterior=instance.descricao_servico,
                    descricao_proposta=validated_data.get('proposta_descricao'),
                    conclusao_anterior=instance.conclusao_prevista,
                    conclusao_proposta=validated_data.get('proposta_conclusao_prevista'),
                )

            if aprovar or recusar:
                if not instance.tem_solicitacao:
                    raise serializers.ValidationError(
                        'Não existe solicitação de alteração pendente.',
                    )
                papel_usuario = 'freelancer' if user == freelancer else 'contratante'
                if instance.solicitado_por == papel_usuario and not is_admin:
                    raise serializers.ValidationError(
                        'A solicitação precisa ser decidida pela outra parte.',
                    )

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
                validated_data.update({
                    'tem_solicitacao': False,
                    'solicitado_por': None,
                    'justificativa_alteracao': None,
                    'proposto_valor': None,
                    'proposta_descricao': None,
                    'proposta_conclusao_prevista': None,
                })
                instance.solicitacoes_alteracao.filter(status='pendente').update(
                    status='aprovada' if aprovar else 'recusada',
                    decidido_por=user,
                    decidido_em=timezone.now(),
                )

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


from .models import CartaoUsuario, Pagamento

class PagamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pagamento
        fields = (
            'id', 'tipo', 'status', 'valor', 'referencia_externa',
            'mp_payment_id', 'forma_pagamento', 'acordo', 'plano',
            'criado_em', 'aprovado_em',
        )
        read_only_fields = fields


class CartaoUsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartaoUsuario
        fields = (
            'id', 'bandeira', 'ultimos_quatro', 'mes_expiracao',
            'ano_expiracao', 'nome_titular', 'ativo', 'atualizado_em',
        )
        read_only_fields = fields


from .models import Avaliacao

CRITERIOS_AVALIACAO = {
    'freelancer': {
        'qualidade': 'Qualidade da entrega',
        'comunicacao': 'Comunicação',
        'prazo': 'Cumprimento do prazo',
    },
    'contratante': {
        'clareza': 'Clareza das instruções',
        'comunicacao': 'Comunicação',
        'pagamento': 'Pagamento e compromisso',
    },
}


class AvaliacaoSerializer(serializers.ModelSerializer):
    avaliador_nome = serializers.SerializerMethodField()
    avaliado_nome = serializers.SerializerMethodField()
    titulo_acordo = serializers.CharField(source='acordo.titulo_anuncio', read_only=True)
    criterios_exibicao = serializers.SerializerMethodField()
    role_received = serializers.CharField(source='papel_avaliado', read_only=True)
    reviewer = serializers.SerializerMethodField()
    comment = serializers.CharField(source='comentario', read_only=True)
    stars = serializers.FloatField(source='nota_geral', read_only=True)

    class Meta:
        model = Avaliacao
        fields = (
            'id', 'acordo', 'titulo_acordo', 'avaliador', 'avaliador_nome',
            'avaliado', 'avaliado_nome', 'papel_avaliado', 'criterios',
            'criterios_exibicao', 'nota_geral', 'comentario', 'criado_em',
            'role_received', 'reviewer', 'comment', 'stars',
        )
        read_only_fields = (
            'avaliador', 'avaliado', 'papel_avaliado', 'nota_geral',
            'criado_em',
        )
        extra_kwargs = {
            'comentario': {'min_length': 5, 'max_length': 2000},
        }

    def get_avaliador_nome(self, obj):
        return obj.avaliador.nome_completo or obj.avaliador.user.get_full_name() or obj.avaliador.user.username

    def get_avaliado_nome(self, obj):
        return obj.avaliado.nome_completo or obj.avaliado.user.get_full_name() or obj.avaliado.user.username

    def get_reviewer(self, obj):
        return self.get_avaliador_nome(obj)

    def get_criterios_exibicao(self, obj):
        labels = CRITERIOS_AVALIACAO.get(obj.papel_avaliado, {})
        return {
            labels.get(key, key): value
            for key, value in (obj.criterios or {}).items()
        }

    def validate(self, attrs):
        request = self.context['request']
        acordo = attrs['acordo']
        candidatura = acordo.candidatura
        freelancer = candidatura.user if candidatura else None
        contratante = candidatura.ad.author if candidatura and candidatura.ad else None

        if acordo.status_acordo != 'Concluído':
            raise serializers.ValidationError('O acordo precisa estar concluído antes da avaliação.')
        if request.user not in {freelancer, contratante}:
            raise serializers.ValidationError('Você não participa deste acordo.')
        if Avaliacao.objects.filter(acordo=acordo, avaliador=request.user.profile).exists():
            raise serializers.ValidationError('Você já avaliou este acordo.')

        papel_avaliado = 'freelancer' if request.user == contratante else 'contratante'
        expected = set(CRITERIOS_AVALIACAO[papel_avaliado])
        criterios = attrs.get('criterios') or {}
        if set(criterios) != expected:
            raise serializers.ValidationError({
                'criterios': f'Informe exatamente os critérios: {", ".join(sorted(expected))}.',
            })
        if any(
            isinstance(score, bool) or not isinstance(score, int) or score < 1 or score > 5
            for score in criterios.values()
        ):
            raise serializers.ValidationError({
                'criterios': 'Todas as notas devem ser números inteiros entre 1 e 5.',
            })

        avaliado_user = freelancer if papel_avaliado == 'freelancer' else contratante
        attrs['_avaliado'] = avaliado_user.profile
        attrs['_papel_avaliado'] = papel_avaliado
        return attrs

    def create(self, validated_data):
        avaliado = validated_data.pop('_avaliado')
        papel_avaliado = validated_data.pop('_papel_avaliado')
        scores = validated_data['criterios'].values()
        nota = (Decimal(sum(scores)) / Decimal(len(scores))).quantize(Decimal('0.01'))
        return Avaliacao.objects.create(
            **validated_data,
            avaliador=self.context['request'].user.profile,
            avaliado=avaliado,
            papel_avaliado=papel_avaliado,
            nota_geral=nota,
        )
