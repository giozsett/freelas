import json
import logging
from decimal import Decimal
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Avg, Count
from django.utils import timezone
from rest_framework import serializers
from .models import UserProfile
from .notificacoes import criar_notificacao
from .validacao_senha import validar_forca_senha

def _destruir_imagem_cloudinary(url):
    """Apaga um asset do Cloudinary a partir da URL salva no banco (best-effort)."""
    if not url or 'res.cloudinary.com' not in url:
        return
    import cloudinary.uploader
    try:
        public_id = url.split('/image/upload/')[-1].split('?')[0]
        if '.' in public_id.rsplit('/', 1)[-1]:
            public_id = public_id.rsplit('.', 1)[0]
        cloudinary.uploader.destroy(public_id, resource_type='image', invalidate=True)
    except Exception:
        pass

logger = logging.getLogger(__name__)

class UserProfileSerializer(serializers.ModelSerializer):
    certificados = serializers.SerializerMethodField()
    experiencias = serializers.SerializerMethodField()
    banner = serializers.SerializerMethodField()
    papel = serializers.ChoiceField(
        choices=[('freelancer', 'Freelancer'), ('empresa', 'Empresa')],
        required=False,
        allow_null=True,
        allow_blank=True,
    )
    tipo_empresa = serializers.ChoiceField(
        choices=[('pessoa', 'Pessoa física contratante'), ('cnpj', 'Empresa com CNPJ')],
        required=False,
        allow_null=True,
        allow_blank=True,
    )
    porte_empresa = serializers.ChoiceField(
        choices=[('autonomo', 'Autônomo'), ('micro', 'Micro'), ('pequena', 'Pequena'), ('media', 'Média'), ('grande', 'Grande')],
        required=False,
        allow_null=True,
        allow_blank=True,
    )

    class Meta:
        model = UserProfile
        fields = ('nome_completo', 'bio', 'categories', 'skills', 'subscription_plan', 'subscription_cancel_at', 'foto_perfil', 'banner', 'curriculo', 'disponivel', 'cidade', 'estado', 'telefone', 'email_visivel', 'telefone_visivel', 'redes_sociais', 'certificados', 'experiencias', 'papel', 'tipo_empresa', 'nome_empresa', 'bio_empresa', 'ramo_empresa', 'porte_empresa', 'cnpj', 'site_empresa', 'aceitou_termos_empresa')
        read_only_fields = ('foto_perfil', 'subscription_plan', 'subscription_cancel_at')

    def validate(self, attrs):
        dados = attrs
        # Quando o pedido está alterando para empresa, exige o perfil de contratante
        if 'papel' in dados and dados['papel'] == 'empresa':
            tipo = dados.get('tipo_empresa', self.instance.tipo_empresa if self.instance else None)
            termos = dados.get('aceitou_termos_empresa', self.instance.aceitou_termos_empresa if self.instance else False)
            if not tipo:
                raise serializers.ValidationError({'tipo_empresa': 'Escolha como você vai atuar: pessoa física contratante ou empresa com CNPJ.'})
            if not termos:
                raise serializers.ValidationError({'aceitou_termos_empresa': 'Você precisa aceitar os Termos de Uso do perfil de empresa/contratante.'})
            if tipo == 'cnpj':
                if not (dados.get('nome_empresa') or (self.instance and self.instance.nome_empresa)):
                    raise serializers.ValidationError({'nome_empresa': 'Informe o nome da empresa.'})
                if not (dados.get('ramo_empresa') or (self.instance and self.instance.ramo_empresa)):
                    raise serializers.ValidationError({'ramo_empresa': 'Informe o ramo/segmento da empresa.'})
                if not (dados.get('bio_empresa') or (self.instance and self.instance.bio_empresa)):
                    raise serializers.ValidationError({'bio_empresa': 'Conte o que a empresa faz.'})
        return super().validate(attrs)

    def get_banner(self, obj):
        return obj.banner

    def get_certificados(self, obj):
        certificados = obj.certificados.filter(exibir_perfil=True)
        return CertificadoSerializer(certificados, many=True, context=self.context).data

    def get_experiencias(self, obj):
        experiencias = obj.experiencias.all()
        return ExperienciaSerializer(experiencias, many=True, context=self.context).data

    def update(self, instance, validated_data):
        # Banner: se vier como arquivo (multipart), envia ao Cloudinary e guarda a URL
        banner_val = self.initial_data.get('banner', None)
        if banner_val and hasattr(banner_val, 'size'):
            import cloudinary.uploader
            if banner_val.size > 2 * 1024 * 1024:
                raise serializers.ValidationError({'banner': 'O banner não pode exceder 2 MB.'})
            try:
                resposta = cloudinary.uploader.upload(
                    banner_val,
                    folder='banners',
                    resource_type='image',
                )
            except Exception:
                logger.exception('Falha ao enviar banner para o Cloudinary')
                raise serializers.ValidationError({'banner': 'Não foi possível enviar a imagem do banner.'})
            _destruir_imagem_cloudinary(instance.banner)
            instance.banner = resposta.get('secure_url') or resposta.get('url')
            instance.save(update_fields=['banner', 'atualizado_em'])
        elif 'banner' in self.initial_data and banner_val in (None, ''):
            _destruir_imagem_cloudinary(instance.banner)
            instance.banner = None
            instance.save(update_fields=['banner', 'atualizado_em'])

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
    reputacao = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'profile',
            'resumo_avaliacoes', 'avaliacoes_recebidas', 'reputacao', 'is_staff',
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

    def get_reputacao(self, obj):
        if not hasattr(obj, 'profile'):
            return None
        return {
            'freelancer': calcular_reputacao_usuario(obj.profile, papel='freelancer'),
            'contratante': calcular_reputacao_usuario(obj.profile, papel='contratante'),
        }

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

    def validate_email(self, value):
        email = (value or '').strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('Este email já está sendo utilizado.')
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Este nome de usuário já está sendo utilizado.')
        return value

    def validate_password(self, value):
        erro = validar_forca_senha(value)
        if erro:
            raise serializers.ValidationError(erro)
        return value

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
    reporter_name = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = ('reporter',)

    def get_reporter_name(self, obj):
        if not obj.reporter:
            return None
        return obj.reporter.first_name or obj.reporter.username

from .models import Ad, Avaliacao, CriterioAvaliacao

CRITERIOS_DETALHADOS = {
    'freelancer': {
        'remoto': [
            {
                'chave': 'qualidade_tecnica',
                'rotulo': 'Qualidade e Entrega Técnica',
                'descricao': 'Fidelidade ao que foi solicitado, capricho no material final e padrões técnicos.',
            },
            {
                'chave': 'cumprimento_prazos',
                'rotulo': 'Cumprimento de Prazos',
                'descricao': 'Pontualidade nas entregas parciais e finalização dentro da data combinada.',
            },
            {
                'chave': 'comunicacao_remota',
                'rotulo': 'Comunicação e Disponibilidade',
                'descricao': 'Clareza, agilidade nas respostas e transparência sobre o andamento.',
            },
        ],
        'presencial': [
            {
                'chave': 'qualidade_execucao',
                'rotulo': 'Qualidade e Execução Prática',
                'descricao': 'Habilidade técnica prática, apresentação de equipamentos e capricho no resultado.',
            },
            {
                'chave': 'pontualidade_assiduidade',
                'rotulo': 'Pontualidade e Assiduidade',
                'descricao': 'Chegada no horário marcado e cumprimento rigoroso da agenda presencial.',
            },
            {
                'chave': 'postura_conduta',
                'rotulo': 'Postura e Conduta Profissional',
                'descricao': 'Cordialidade, respeito às regras do local e ética profissional de convivência.',
            },
        ],
    },
    'contratante': {
        'remoto': [
            {
                'chave': 'clareza_escopo',
                'rotulo': 'Clareza de Escopo e Briefing',
                'descricao': 'Especificação clara das demandas, fornecimento de informações e materiais.',
            },
            {
                'chave': 'comunicacao_feedback',
                'rotulo': 'Comunicação e Feedback Ágil',
                'descricao': 'Presteza em responder dúvidas, cordialidade e validação ágil das entregas.',
            },
            {
                'chave': 'pagamento_compromisso',
                'rotulo': 'Pontualidade e Compromisso Financeiro',
                'descricao': 'Liberação correta do pagamento e cumprimento dos acordos e valores firmados.',
            },
        ],
        'presencial': [
            {
                'chave': 'alinhamento_local',
                'rotulo': 'Clareza e Alinhamento no Local',
                'descricao': 'Orientações precisas no local, sem cobrança de tarefas não acordadas.',
            },
            {
                'chave': 'ambiente_recepcao',
                'rotulo': 'Condições do Ambiente e Recepção',
                'descricao': 'Ambiente seguro, pontualidade na recepção e suporte para a execução do serviço.',
            },
            {
                'chave': 'pagamento_compromisso',
                'rotulo': 'Pontualidade e Compromisso Financeiro',
                'descricao': 'Liberação imediata do valor combinado ao término e respeito ao prestador.',
            },
        ],
    },
}

ALIAS_CRITERIOS = {
    'qualidade': {'remoto': 'qualidade_tecnica', 'presencial': 'qualidade_execucao'},
    'prazo': {'remoto': 'cumprimento_prazos', 'presencial': 'pontualidade_assiduidade'},
    'comunicacao': {'remoto': 'comunicacao_remota', 'presencial': 'postura_conduta'},
    'clareza': {'remoto': 'clareza_escopo', 'presencial': 'alinhamento_local'},
    'pagamento': {'remoto': 'pagamento_compromisso', 'presencial': 'pagamento_compromisso'},
}

ROTLOS_TODOS_CRITERIOS = {
    'qualidade_tecnica': 'Qualidade e Entrega Técnica',
    'cumprimento_prazos': 'Cumprimento de Prazos',
    'comunicacao_remota': 'Comunicação e Disponibilidade',
    'qualidade_execucao': 'Qualidade e Execução Prática',
    'pontualidade_assiduidade': 'Pontualidade e Assiduidade',
    'postura_conduta': 'Postura e Conduta Profissional',
    'clareza_escopo': 'Clareza de Escopo e Briefing',
    'comunicacao_feedback': 'Comunicação e Feedback Ágil',
    'pagamento_compromisso': 'Pontualidade e Compromisso Financeiro',
    'alinhamento_local': 'Clareza e Alinhamento no Local',
    'ambiente_recepcao': 'Condições do Ambiente e Recepção',
    'qualidade': 'Qualidade da entrega',
    'prazo': 'Cumprimento do prazo',
    'comunicacao': 'Comunicação',
    'clareza': 'Clareza das instruções',
    'pagamento': 'Pagamento e compromisso',
}

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


def obter_criterios_definicao(papel_avaliado, modalidade='remoto'):
    papel = papel_avaliado if papel_avaliado in ('freelancer', 'contratante') else 'freelancer'
    mod = modalidade if modalidade in ('remoto', 'presencial') else 'remoto'
    return CRITERIOS_DETALHADOS.get(papel, {}).get(mod, [])


def _completude_perfil_itens(profile):
    """
    Lista, item a item, o que soma pontos na completude do perfil (0-100),
    nos moldes de apps como Tinder — cada seção preenchida soma pontos e o
    total vira um bônus na reputação (ver calcular_reputacao_usuario). Os
    mesmos itens valem tanto para freelancers quanto para contratantes, já
    que são campos comuns do UserProfile. Exposto (via completude_perfil_detalhe)
    para o usuário ver exatamente o que falta, não só o número final.
    """
    return [
        {
            'chave': 'foto',
            'label': 'Foto de perfil',
            'pontos': 15,
            'atendido': bool(profile.foto_perfil),
        },
        {
            'chave': 'bio',
            'label': 'Bio (mínimo 20 caracteres)',
            'pontos': 20,
            'atendido': len((profile.bio or '').strip()) >= 20,
        },
        {
            'chave': 'cidade',
            'label': 'Cidade',
            'pontos': 10,
            'atendido': bool(profile.cidade),
        },
        {
            'chave': 'contato',
            'label': 'Telefone visível ou rede social',
            'pontos': 10,
            'atendido': bool((profile.telefone and profile.telefone_visivel) or profile.redes_sociais),
        },
        {
            'chave': 'categorias',
            'label': 'Categorias de atuação',
            'pontos': 15,
            'atendido': bool(profile.categories),
        },
        {
            'chave': 'portfolio',
            'label': 'Skills, certificados ou experiência',
            'pontos': 30,
            'atendido': bool(profile.skills or profile.certificados.exists() or profile.experiencias.exists()),
        },
    ]


def _completude_perfil(profile):
    """Soma os pontos dos itens atendidos em _completude_perfil_itens (0-100)."""
    pontos = sum(item['pontos'] for item in _completude_perfil_itens(profile) if item['atendido'])
    return min(100, pontos)


def calcular_reputacao_usuario(profile, papel='freelancer', modalidade='remoto'):
    """
    Calcula o score (0-100) e as tags prontas de reputação conforme especificado em Criterios_Novos.md.

    O score combina duas fontes: a média das avaliações recebidas nesse
    papel (fonte principal) e um bônus de até 30 pontos pela completude do
    perfil, que já conta mesmo antes da primeira avaliação.
    """
    if not profile:
        return None

    criterios_qs = CriterioAvaliacao.objects.filter(
        avaliacao__avaliado=profile,
        papel_avaliado=papel,
    )

    total_avaliacoes = profile.avaliacoes_recebidas.filter(papel_avaliado=papel).count()
    completude_itens = _completude_perfil_itens(profile)
    completude = min(100, sum(item['pontos'] for item in completude_itens if item['atendido']))
    bonus_completude = round(completude * 0.30)

    MENSAGENS_TAGS = {
        'freelancer': {
            'qualidade_tecnica': {
                'alta': {'tone': 'positivo', 'text': 'Entrega de alta qualidade técnica e capricho'},
                'media': {'tone': 'positivo', 'text': 'Qualidade dentro do padrão contratado'},
                'baixa': {'tone': 'alerta', 'text': 'Entregas com necessidade frequente de refações'},
            },
            'qualidade_execucao': {
                'alta': {'tone': 'positivo', 'text': 'Entrega de alta qualidade técnica e capricho'},
                'media': {'tone': 'positivo', 'text': 'Qualidade dentro do padrão contratado'},
                'baixa': {'tone': 'alerta', 'text': 'Execução presencial com necessidade de ajustes'},
            },
            'cumprimento_prazos': {
                'alta': {'tone': 'positivo', 'text': 'Rigoroso no cumprimento de horários e prazos'},
                'media': {'tone': 'alerta', 'text': 'Pontualidade razoável com eventuais atrasos'},
                'baixa': {'tone': 'alerta', 'text': 'Histórico frequente de atrasos nas entregas'},
            },
            'pontualidade_assiduidade': {
                'alta': {'tone': 'positivo', 'text': 'Rigoroso no cumprimento de horários e prazos'},
                'media': {'tone': 'alerta', 'text': 'Pontualidade razoável com eventuais atrasos'},
                'baixa': {'tone': 'alerta', 'text': 'Histórico frequente de atrasos em compromissos presenciais'},
            },
            'comunicacao_remota': {
                'alta': {'tone': 'positivo', 'text': 'Comunicação ágil, transparente e cordial'},
                'media': {'tone': 'positivo', 'text': 'Responde às mensagens em tempo adequado'},
                'baixa': {'tone': 'alerta', 'text': 'Demora para responder e pouca clareza no contato'},
            },
            'postura_conduta': {
                'alta': {'tone': 'positivo', 'text': 'Excelente postura profissional no local'},
                'media': {'tone': 'positivo', 'text': 'Postura adequada no atendimento'},
                'baixa': {'tone': 'alerta', 'text': 'Dificuldades de conduta ou postura presencial'},
            },
            'qualidade': {
                'alta': {'tone': 'positivo', 'text': 'Entrega de alta qualidade técnica e capricho'},
                'media': {'tone': 'positivo', 'text': 'Qualidade dentro do padrão contratado'},
                'baixa': {'tone': 'alerta', 'text': 'Entregas com necessidade frequente de refações'},
            },
            'prazo': {
                'alta': {'tone': 'positivo', 'text': 'Rigoroso no cumprimento de horários e prazos'},
                'media': {'tone': 'alerta', 'text': 'Pontualidade razoável com eventuais atrasos'},
                'baixa': {'tone': 'alerta', 'text': 'Histórico frequente de atrasos nas entregas'},
            },
            'comunicacao': {
                'alta': {'tone': 'positivo', 'text': 'Comunicação ágil, transparente e cordial'},
                'media': {'tone': 'positivo', 'text': 'Responde às mensagens em tempo adequado'},
                'baixa': {'tone': 'alerta', 'text': 'Demora para responder e pouca clareza no contato'},
            },
        },
        'contratante': {
            'clareza_escopo': {
                'alta': {'tone': 'positivo', 'text': 'Instruções e demandas muito claras e diretas'},
                'media': {'tone': 'positivo', 'text': 'Escopo compreensível com pequenos ajustes'},
                'baixa': {'tone': 'alerta', 'text': 'Instruções confusas ou mudanças constantes de escopo'},
            },
            'alinhamento_local': {
                'alta': {'tone': 'positivo', 'text': 'Instruções e demandas muito claras no local'},
                'media': {'tone': 'positivo', 'text': 'Escopo compreensível com pequenos ajustes'},
                'baixa': {'tone': 'alerta', 'text': 'Instruções confusas ou divergentes no local'},
            },
            'comunicacao_feedback': {
                'alta': {'tone': 'positivo', 'text': 'Retorno ágil em dúvidas e aprovações'},
                'media': {'tone': 'positivo', 'text': 'Feedback concedido em tempo hábil'},
                'baixa': {'tone': 'alerta', 'text': 'Demora excessiva para responder e avaliar etapas'},
            },
            'ambiente_recepcao': {
                'alta': {'tone': 'positivo', 'text': 'Ambiente seguro, acolhedor e preparado'},
                'media': {'tone': 'positivo', 'text': 'Recepção pontual no local'},
                'baixa': {'tone': 'alerta', 'text': 'Ambiente presencial incompatível com o combinado'},
            },
            'pagamento_compromisso': {
                'alta': {'tone': 'positivo', 'text': 'Pagamento pontual e compromisso exemplar'},
                'media': {'tone': 'positivo', 'text': 'Pagamentos e acordos honrados'},
                'baixa': {'tone': 'alerta', 'text': 'Atrito ou atraso na liberação do pagamento'},
            },
            'clareza': {
                'alta': {'tone': 'positivo', 'text': 'Instruções e demandas muito claras e diretas'},
                'media': {'tone': 'positivo', 'text': 'Escopo compreensível com pequenos ajustes'},
                'baixa': {'tone': 'alerta', 'text': 'Instruções confusas ou mudanças constantes de escopo'},
            },
            'comunicacao': {
                'alta': {'tone': 'positivo', 'text': 'Retorno ágil em dúvidas e aprovações'},
                'media': {'tone': 'positivo', 'text': 'Feedback concedido em tempo hábil'},
                'baixa': {'tone': 'alerta', 'text': 'Demora excessiva para responder e avaliar etapas'},
            },
            'pagamento': {
                'alta': {'tone': 'positivo', 'text': 'Pagamento pontual e compromisso exemplar'},
                'media': {'tone': 'positivo', 'text': 'Pagamentos e acordos honrados'},
                'baixa': {'tone': 'alerta', 'text': 'Atrito ou atraso na liberação do pagamento'},
            },
        },
    }

    if total_avaliacoes == 0:
        score = max(0, min(100, 40 + bonus_completude))

        if score >= 80:
            label, color = 'Excelente', 'var(--success-color)'
        elif score >= 50:
            label, color = 'Regular', 'var(--warning-color)'
        else:
            label, color = 'Baixa', 'var(--danger-color)'

        if completude >= 80:
            tags = [
                {'tone': 'positivo', 'text': 'Perfil completo e detalhado'},
                {'tone': 'positivo', 'text': 'Novo usuário, ainda sem avaliações'},
            ]
        elif completude >= 40:
            tags = [{'tone': 'positivo', 'text': 'Novo usuário na plataforma'}]
        else:
            tags = [{'tone': 'alerta', 'text': 'Perfil incompleto — complete suas informações para aumentar a confiança'}]

        return {
            'score': score,
            'label': label,
            'color': color,
            'tags': tags,
            'total_avaliacoes': 0,
            'completude_perfil': completude,
            'completude_perfil_detalhe': completude_itens,
        }

    media_geral_val = profile.avaliacoes_recebidas.filter(papel_avaliado=papel).aggregate(
        media=Avg('nota_geral')
    )['media']
    media_num = float(media_geral_val or 5.0)
    av_score = int(round((media_num / 5.0) * 100))
    score = max(0, min(100, av_score + bonus_completude))

    if score >= 80:
        label = 'Excelente'
        color = 'var(--success-color)'
    elif score >= 50:
        label = 'Regular'
        color = 'var(--warning-color)'
    else:
        label = 'Baixa'
        color = 'var(--danger-color)'

    medias_criterios = criterios_qs.values('chave').annotate(media_criterio=Avg('nota'))

    tags_alertas = []
    tags_positivas = []
    catalog = MENSAGENS_TAGS.get(papel, {})

    for item in medias_criterios:
        chave = item['chave']
        m_val = float(item['media_criterio'])
        tag_dict = catalog.get(chave)
        if not tag_dict:
            continue
        if m_val >= 4.5:
            tags_positivas.append(tag_dict['alta'])
        elif m_val >= 3.0:
            if tag_dict['media']['tone'] == 'alerta':
                tags_alertas.append(tag_dict['media'])
            else:
                tags_positivas.append(tag_dict['media'])
        else:
            tags_alertas.append(tag_dict['baixa'])

    if completude < 40:
        tags_alertas.append({'tone': 'alerta', 'text': 'Perfil incompleto — complete suas informações para aumentar a confiança'})

    tags_finais = (tags_alertas + tags_positivas)[:3]
    if not tags_finais:
        tags_finais = [
            {'tone': 'positivo', 'text': 'Recomendado por outros usuários'},
        ]

    return {
        'score': score,
        'label': label,
        'color': color,
        'tags': tags_finais,
        'total_avaliacoes': total_avaliacoes,
        'completude_perfil': completude,
        'completude_perfil_detalhe': completude_itens,
    }


class AdSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_rating = serializers.SerializerMethodField()
    author_reputation = serializers.SerializerMethodField()
    
    class Meta:
        model = Ad
        fields = '__all__'
        read_only_fields = ('author', 'created_at')

    def validate(self, attrs):
        role = attrs.get('role', getattr(self.instance, 'role', None))
        location_type = attrs.get('location_type', getattr(self.instance, 'location_type', None))
        description = attrs.get('description', getattr(self.instance, 'description', '') or '')
        if len(description) > 1000:
            raise serializers.ValidationError({'description': 'A descrição deve ter no máximo 1000 caracteres.'})

        if location_type == 'presencial':
            cidade = attrs.get('cidade', getattr(self.instance, 'cidade', None))
            if not cidade:
                raise serializers.ValidationError({'cidade': 'A cidade é obrigatória para serviços presenciais.'})

        if role == 'freelancer':
            availability = attrs.get('availability', getattr(self.instance, 'availability', None))
            if not isinstance(availability, dict):
                raise serializers.ValidationError({'availability': 'Informe a disponibilidade por dia e período.'})
            periodos_validos = {'manha', 'tarde', 'noite'}
            if not any(
                isinstance(periodos, list) and periodos_validos.intersection(periodos)
                for periodos in availability.values()
            ):
                raise serializers.ValidationError({'availability': 'Selecione ao menos um período disponível.'})
        return attrs

    def get_author_name(self, obj):
        name = obj.author.first_name
        return name if name else obj.author.username

    def get_author_rating(self, obj):
        if not obj.author:
            return None
        if not hasattr(obj.author, 'profile'):
            return None
        papel_avaliado = 'contratante' if obj.role in {'contractor', 'contratante'} else 'freelancer'
        media = getattr(
            obj,
            '_media_contratante' if papel_avaliado == 'contratante' else '_media_freelancer',
            None,
        )
        if media is None:
            return None
        return round(float(media), 1)

    def get_author_reputation(self, obj):
        if not obj.author or not hasattr(obj.author, 'profile'):
            return None
        papel = 'contratante' if obj.role in {'contractor', 'contratante'} else 'freelancer'
        modalidade = 'presencial' if obj.location_type == 'presencial' else 'remoto'
        return calcular_reputacao_usuario(obj.author.profile, papel=papel, modalidade=modalidade)

from .models import Candidatura

# Usado tanto para anúncio excluído (soft delete) quanto vencido: do ponto de
# vista de quem se candidatou, os dois casos são "não dá mais pra saber o que
# aconteceu com isso" e devem ser tratados como finalizados com a mesma mensagem.
MOTIVO_ANUNCIO_INDISPONIVEL = 'Este anúncio não está mais disponível. Provavelmente foi removido pelo anunciante ou expirou.'

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

    def get_fields(self):
        fields = super().get_fields()
        fields['acordo_id'] = serializers.SerializerMethodField()
        return fields

    def get_acordo_id(self, obj):
        acordo = obj.acordos.first()
        return acordo.id if acordo else None

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
        return None

    def get_indisponivel(self, obj):
        if not obj.ad_id or (obj.ad and (obj.ad.deletado or obj.ad.status_anuncio == 'Vencido')):
            return True
        if obj.status == 'encerrada':
            return True
        if obj.status == 'aprovada':
            return False
        return obj.ad.candidaturas.filter(status='aprovada').exclude(pk=obj.pk).exists()

    def get_motivo_indisponibilidade(self, obj):
        if not obj.ad_id or (obj.ad and (obj.ad.deletado or obj.ad.status_anuncio == 'Vencido')):
            return MOTIVO_ANUNCIO_INDISPONIVEL
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
    taxa_plataforma = serializers.FloatField(read_only=True)
    valor_total = serializers.FloatField(source='valor_total_com_taxa', read_only=True)

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
                if instance.status_acordo not in {'Ativo', 'Pendente Pagamento'}:
                    raise serializers.ValidationError(
                        'Alterações só podem ser solicitadas em acordos ativos ou pendentes de pagamento.',
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

                outra_parte = freelancer if user == contratante else contratante
                criar_notificacao(
                    usuario=outra_parte,
                    tipo='acordo',
                    titulo='Alteração de acordo solicitada',
                    mensagem=f'{user.username} solicitou uma alteração no acordo "{instance.titulo_anuncio}".',
                    link='/my-freelas',
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

                solicitacao = instance.solicitacoes_alteracao.filter(status='pendente').first()
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
                if solicitacao and solicitacao.solicitante:
                    criar_notificacao(
                        usuario=solicitacao.solicitante,
                        tipo='acordo',
                        titulo='Alteração de acordo decidida',
                        mensagem=f'Sua solicitação de alteração no acordo "{instance.titulo_anuncio}" foi {"aprovada" if aprovar else "recusada"}.',
                        link='/my-freelas',
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


from .models import Pagamento
from .models import Notificacao

class NotificacaoSerializer(serializers.ModelSerializer):
    mensagem = serializers.SerializerMethodField()

    class Meta:
        model = Notificacao
        fields = ('id', 'tipo', 'titulo', 'mensagem', 'link', 'lida', 'criado_em')
        read_only_fields = fields

    def get_mensagem(self, obj):
        mensagem = obj.mensagem
        if '{ad_titulo}' in mensagem:
            titulo_atual = (obj.ad.title or obj.ad.titulo) if obj.ad else None
            mensagem = mensagem.replace('{ad_titulo}', titulo_atual or 'anúncio removido')
        return mensagem


class PagamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pagamento
        fields = (
            'id', 'tipo', 'status', 'valor', 'referencia_externa',
            'mp_payment_id', 'forma_pagamento', 'acordo', 'plano',
            'criado_em', 'aprovado_em',
        )
        read_only_fields = fields


class AvaliacaoSerializer(serializers.ModelSerializer):
    avaliador_nome = serializers.SerializerMethodField()
    avaliado_nome = serializers.SerializerMethodField()
    titulo_acordo = serializers.CharField(source='acordo.titulo_anuncio', read_only=True)
    criterios_exibicao = serializers.SerializerMethodField()
    role_received = serializers.CharField(source='papel_avaliado', read_only=True)
    reviewer = serializers.SerializerMethodField()
    comment = serializers.CharField(source='comentario', read_only=True)
    stars = serializers.FloatField(source='nota_geral', read_only=True)
    modalidade = serializers.CharField(read_only=True)

    class Meta:
        model = Avaliacao
        fields = (
            'id', 'acordo', 'titulo_acordo', 'avaliador', 'avaliador_nome',
            'avaliado', 'avaliado_nome', 'papel_avaliado', 'modalidade',
            'criterios', 'criterios_exibicao', 'nota_geral', 'comentario',
            'criado_em', 'role_received', 'reviewer', 'comment', 'stars',
        )
        read_only_fields = (
            'avaliador', 'avaliado', 'papel_avaliado', 'modalidade',
            'nota_geral', 'criado_em',
        )
        extra_kwargs = {
            'comentario': {'required': False, 'allow_blank': True, 'max_length': 2000},
        }

    def get_avaliador_nome(self, obj):
        return obj.avaliador.nome_completo or obj.avaliador.user.get_full_name() or obj.avaliador.user.username

    def get_avaliado_nome(self, obj):
        return obj.avaliado.nome_completo or obj.avaliado.user.get_full_name() or obj.avaliado.user.username

    def get_reviewer(self, obj):
        return self.get_avaliador_nome(obj)

    def get_criterios_exibicao(self, obj):
        detalhes = list(obj.detalhes_criterios.all())
        if detalhes:
            return {
                (d.titulo or ROTLOS_TODOS_CRITERIOS.get(d.chave, d.chave)): d.nota
                for d in detalhes
            }
        return {
            ROTLOS_TODOS_CRITERIOS.get(key, key): value
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
        anuncio = candidatura.ad if candidatura else None
        modalidade = 'presencial' if (anuncio and getattr(anuncio, 'location_type', None) == 'presencial') else 'remoto'

        criterios_definicao = obter_criterios_definicao(papel_avaliado, modalidade)
        expected_keys = {c['chave'] for c in criterios_definicao}

        raw_criterios = attrs.get('criterios') or {}
        normalized_criterios = {}
        for k, v in raw_criterios.items():
            mapped_k = k
            if k not in expected_keys and k in ALIAS_CRITERIOS:
                mapped_k = ALIAS_CRITERIOS[k].get(modalidade, k)
            normalized_criterios[mapped_k] = v

        if set(normalized_criterios.keys()) != expected_keys:
            expected_labels = [c['rotulo'] for c in criterios_definicao]
            raise serializers.ValidationError({
                'criterios': f'Informe exatamente os 3 critérios de avaliação: {", ".join(expected_labels)}.',
            })

        if any(
            isinstance(score, bool) or not isinstance(score, int) or score < 1 or score > 5
            for score in normalized_criterios.values()
        ):
            raise serializers.ValidationError({
                'criterios': 'Todas as 3 notas devem ser números inteiros em estrelas entre 1 e 5.',
            })

        comentario = attrs.get('comentario') or ''
        attrs['comentario'] = comentario.strip()
        attrs['criterios'] = normalized_criterios

        avaliado_user = freelancer if papel_avaliado == 'freelancer' else contratante
        attrs['_avaliado'] = avaliado_user.profile
        attrs['_papel_avaliado'] = papel_avaliado
        attrs['_modalidade'] = modalidade
        attrs['_criterios_definicao'] = criterios_definicao
        return attrs

    def create(self, validated_data):
        avaliado = validated_data.pop('_avaliado')
        papel_avaliado = validated_data.pop('_papel_avaliado')
        modalidade = validated_data.pop('_modalidade')
        criterios_definicao = validated_data.pop('_criterios_definicao')

        criterios_map = validated_data['criterios']
        scores = list(criterios_map.values())
        nota = (Decimal(sum(scores)) / Decimal(len(scores))).quantize(Decimal('0.01'))

        avaliacao = Avaliacao.objects.create(
            **validated_data,
            avaliador=self.context['request'].user.profile,
            avaliado=avaliado,
            papel_avaliado=papel_avaliado,
            modalidade=modalidade,
            nota_geral=nota,
        )

        for item in criterios_definicao:
            chave = item['chave']
            nota_criterio = criterios_map[chave]
            CriterioAvaliacao.objects.create(
                avaliacao=avaliacao,
                chave=chave,
                titulo=item['rotulo'],
                nota=nota_criterio,
                papel_avaliado=papel_avaliado,
                modalidade=modalidade,
                peso=Decimal('1.00'),
                descricao=item.get('descricao', ''),
            )

        return avaliacao


from .chat import (
    chat_ativo,
    nao_lidas,
    partes_do_acordo,
    ultima_mensagem,
)


def _info_usuario(user, request):
    if not user:
        return None
    profile = getattr(user, 'profile', None)
    foto = None
    if profile and profile.foto_perfil:
        foto = profile.foto_perfil
    return {
        'id': user.id,
        'nome': (
            profile.nome_completo
            if profile and profile.nome_completo
            else (user.get_full_name() or user.username)
        ),
        'foto_perfil': foto,
    }


def _info_usuario_com_papel(user, papel, request):
    info = _info_usuario(user, request)
    if info:
        info['papel'] = papel
    return info


class ChatConversaSerializer(serializers.ModelSerializer):
    """Conversa de um acordo — restrita ao freelancer e ao contratante."""

    chat_ativo = serializers.SerializerMethodField()
    outra_parte = serializers.SerializerMethodField()
    ultima_mensagem = serializers.SerializerMethodField()
    nao_lidas = serializers.SerializerMethodField()

    class Meta:
        model = AcordoServico
        fields = (
            'id', 'titulo_anuncio', 'status_acordo', 'valor_acordado',
            'unidade_valor', 'data_confirmacao', 'chat_ativo',
            'outra_parte', 'ultima_mensagem', 'nao_lidas',
        )

    def get_chat_ativo(self, obj):
        return chat_ativo(obj)

    def get_outra_parte(self, obj):
        request = self.context.get('request')
        user = request.user if request else None
        contratante, freelancer = partes_do_acordo(obj)
        outra = freelancer if user == contratante else contratante
        papel = 'freelancer' if outra == freelancer else 'contratante'
        return _info_usuario_com_papel(outra, papel, request)

    def get_ultima_mensagem(self, obj):
        return ultima_mensagem(obj.id)

    def get_nao_lidas(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        return nao_lidas(obj.id, request.user.id)
