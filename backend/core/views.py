from django.conf import settings
from rest_framework import generics, permissions, parsers
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
from django.contrib.auth.models import User
import os
from .serializers import UserSerializer, RegisterSerializer
<<<<<<< HEAD
=======
from google.oauth2 import id_token
import os
from google.auth.transport import requests as google_requests
>>>>>>> origin/main
from .serializers import UserProfileSerializer, FotoPerfilSerializer
from .models import UserProfile
from .serializers import CandidaturaSerializer
from .models import Candidatura
from .serializers import AdSerializer
from .models import Ad
from .serializers import ReportSerializer
from .models import Report
from django.core.mail import send_mail
from django.shortcuts import redirect
from .models import VerificacaoEmail
from .serializers import CertificadoSerializer, InstituicaoEnsinoSerializer, ExperienciaSerializer
from .models import Certificado, InstituicaoEnsino, Experiencia
<<<<<<< HEAD
from allauth.socialaccount.adapter import get_adapter as get_social_adapter
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.models import SocialAccount
=======
>>>>>>> origin/main


class RegisterAPI(generics.GenericAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
<<<<<<< HEAD
=======
        token, created = Token.objects.get_or_create(user=user)
>>>>>>> origin/main
        # Cria o UserProfile imediatamente no cadastro comum
        UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'nome_completo': f"{user.first_name} {user.last_name}".strip() or user.username,
                'email': user.email,
            }
        )
<<<<<<< HEAD
        # Gera e envia o código de confirmação do email
        verificacao, _ = VerificacaoEmail.objects.get_or_create(usuario=user)
        verificacao.verificado = False
        verificacao.gerar_codigo()
        try:
            send_mail(
                subject='Confirme seu email - Freelas',
                message=f'Olá, {user.first_name}!\n\nSeu código de confirmação é: {verificacao.codigo}\n\nEle expira em 10 minutos.\n\nEquipe Freelas',
                from_email=None,
                recipient_list=[user.email],
            )
        except Exception:
            # Se falhar, o usuário pode solicitar um novo código na tela de verificação
            pass
        # Nenhum token emitido: o acesso só é liberado após confirmar o email
=======
>>>>>>> origin/main
        return Response({
            'message': 'Cadastro realizado. Confirme seu email para entrar.',
            'email': user.email,
            'user': UserSerializer(user, context=self.get_serializer_context()).data,
        })

class LoginAPI(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(username=username, password=password)
        if user:
            if VerificacaoEmail.objects.filter(usuario=user, verificado=False).exists():
                return Response(
                    {'error': 'Confirme seu email para poder entrar.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                "user": UserSerializer(user).data,
                "token": token.key
            })
        return Response({"error": "Wrong Credentials"}, status=status.HTTP_400_BAD_REQUEST)

class UserAPI(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        serializer.save()

class UserProfileAPIView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile

    def perform_update(self, serializer):
        serializer.save()


class FotoPerfilUploadAPIView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FotoPerfilSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_object(self):
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile

    def update(self, request, *args, **kwargs):
        profile = self.get_object()
        foto_file = request.FILES.get('foto_perfil')
        if foto_file in (None, ''):
            if request.data.get('foto_perfil') is None:
                self._deletar_imagem_antiga(profile.foto_perfil)
                profile.foto_perfil = None
                profile.save(update_fields=['foto_perfil', 'atualizado_em'])
                return Response({'foto_perfil': None}, status=status.HTTP_200_OK)
            return Response({'error': 'Nenhum arquivo de imagem enviado.'}, status=status.HTTP_400_BAD_REQUEST)

        if foto_file.size > 2 * 1024 * 1024:
            return Response({'error': 'A foto de perfil não pode exceder 2 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        url = self._subir_cloudinary(foto_file, 'fotos_perfil')
        if not url:
            return Response({'error': 'Não foi possível enviar a imagem.'}, status=status.HTTP_400_BAD_REQUEST)

        self._deletar_imagem_antiga(profile.foto_perfil)
        profile.foto_perfil = url
        profile.save(update_fields=['foto_perfil', 'atualizado_em'])
        return Response({'foto_perfil': url}, status=status.HTTP_200_OK)

    @staticmethod
    def _subir_cloudinary(arquivo, pasta):
        import cloudinary.uploader
        try:
            resposta = cloudinary.uploader.upload(
                arquivo,
                folder=pasta,
                resource_type='image',
            )
            return resposta.get('secure_url') or resposta.get('url')
        except Exception:
            return None

    @staticmethod
    def _deletar_imagem_antiga(url):
        if not url or 'res.cloudinary.com' not in url:
            return
        import cloudinary.uploader
        try:
            public_id = url.split('/image/upload/')[-1].split('?')[0]
            cloudinary.uploader.destroy(public_id, resource_type='image', invalidate=True)
        except Exception:
            pass


class CertificadoListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = CertificadoSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        return Certificado.objects.filter(usuario__user=self.request.user).order_by('-criado_em')

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user.profile)


class CertificadoRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CertificadoSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        return Certificado.objects.filter(usuario__user=self.request.user)


class InstituicaoEnsinoListAPIView(generics.ListAPIView):
    queryset = InstituicaoEnsino.objects.filter(verificado=True)
    serializer_class = InstituicaoEnsinoSerializer
    permission_classes = [permissions.AllowAny]


class ExperienciaListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ExperienciaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Experiencia.objects.filter(usuario__user=self.request.user).order_by('-data_inicio')

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user.profile)


class ExperienciaRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExperienciaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Experiencia.objects.filter(usuario__user=self.request.user)


class ReportAdminPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class ReportListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ReportSerializer
    pagination_class = ReportAdminPagination

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        from django.db.models import Case, IntegerField, Value, When

        queryset = Report.objects.select_related('reporter').annotate(
            status_order=Case(
                When(status='pending', then=Value(0)),
                When(status='procedente', then=Value(1)),
                When(status='improcedente', then=Value(2)),
                default=Value(3),
                output_field=IntegerField(),
            ),
        ).order_by('status_order', '-created_at')
        status_filter = self.request.query_params.get('status')
        valid_statuses = {choice[0] for choice in Report.STATUS_CHOICES}
        if status_filter in valid_statuses:
            queryset = queryset.filter(status=status_filter)
        return queryset

    def perform_create(self, serializer):
        # Uma denúncia nova nunca pode chegar do cliente já julgada, e quem
        # denunciou é sempre o usuário autenticado (nunca o que o cliente
        # mandar no corpo) — reporter já é read-only no serializer.
        reporter = self.request.user if self.request.user.is_authenticated else None
        serializer.save(status='pending', reporter=reporter)

class ReportUpdateAPIView(generics.UpdateAPIView):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ['patch', 'options', 'head']

    def patch(self, request, *args, **kwargs):
        report = self.get_object()
        new_status = request.data.get('status')
        if new_status not in {'procedente', 'improcedente'}:
            return Response(
                {'error': 'Escolha procedente ou improcedente.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        report.status = new_status
        report.save(update_fields=['status'])
        return Response(self.get_serializer(report).data)


# Limite de anúncios que cada plano de assinatura pode publicar por mês.
# None = sem limite (plano Platinum).
LIMITE_ANUNCIOS_MENSAL = {
    'Gratuito': 3,
    'Gold': 10,
    'Platinum': None,
}

MENSAGEM_LIMITE_ANUNCIOS_ATINGIDO = (
    'Você já atingiu seu limite de postagem de anúncios esse mês, '
    'atualize seu plano para postar mais anúncios.'
)


def _status_limite_anuncios(user):
    profile = getattr(user, 'profile', None)
    plano = (profile.subscription_plan if profile else None) or 'Gratuito'
    limite = LIMITE_ANUNCIOS_MENSAL.get(plano, LIMITE_ANUNCIOS_MENSAL['Gratuito'])

    usados = 0
    if limite is not None:
        inicio_mes = _mes_inicio(timezone.now())
        usados = Ad.objects.exclude(deletado=True).filter(
            author=user,
            created_at__gte=inicio_mes,
        ).count()

    return {
        'plano': plano,
        'limite': limite,
        'usados': usados,
        'atingiu_limite': limite is not None and usados >= limite,
    }


class AdLimiteMensalAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(_status_limite_anuncios(request.user))


class AdListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = AdSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        from django.db.models import Q, Avg

        Ad.atualizar_vencidos()
        queryset = (
            Ad.objects.exclude(deletado=True)
            .select_related('author', 'author__profile')
            .annotate(
                _media_freelancer=Avg(
                    'author__profile__avaliacoes_recebidas__nota_geral',
                    filter=Q(author__profile__avaliacoes_recebidas__papel_avaliado='freelancer'),
                ),
                _media_contratante=Avg(
                    'author__profile__avaliacoes_recebidas__nota_geral',
                    filter=Q(author__profile__avaliacoes_recebidas__papel_avaliado='contratante'),
                ),
            )
            .order_by('-created_at')
        )
        all_ads = self.request.query_params.get('all', 'false').lower() == 'true'
        if not all_ads:
            # Only show ads that are open (status is NULL, empty, 'Em aberto', or 'Ativo')
            queryset = queryset.filter(Q(status_anuncio__isnull=True) | Q(status_anuncio='') | Q(status_anuncio='Em aberto') | Q(status_anuncio='Ativo'))
        return queryset

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError

        user = self.request.user
        if _status_limite_anuncios(user)['atingiu_limite']:
            raise ValidationError(MENSAGEM_LIMITE_ANUNCIOS_ATINGIDO)

        serializer.save(author=user)

class AdRetrieveAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdSerializer

    def get_queryset(self):
        from django.db.models import Q, Avg

        Ad.atualizar_vencidos()
        return (
            Ad.objects.exclude(deletado=True)
            .select_related('author', 'author__profile')
            .annotate(
                _media_freelancer=Avg(
                    'author__profile__avaliacoes_recebidas__nota_geral',
                    filter=Q(author__profile__avaliacoes_recebidas__papel_avaliado='freelancer'),
                ),
                _media_contratante=Avg(
                    'author__profile__avaliacoes_recebidas__nota_geral',
                    filter=Q(author__profile__avaliacoes_recebidas__papel_avaliado='contratante'),
                ),
            )
        )

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_update(self, serializer):
        ad = self.get_object()
        if ad.author != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Apenas o autor do anúncio pode editá-lo.")
        from django.utils import timezone
        serializer.save(atualizado_em=timezone.now())

    def destroy(self, request, *args, **kwargs):
        ad = self.get_object()
        if ad.author != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Apenas o autor do anúncio pode deletá-lo.")
        if ad.status_anuncio == 'Finalizado':
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Anúncios com status finalizado não podem ser excluídos.")
        ad.deletado = True
        ad.save()
        from rest_framework.response import Response
        from rest_framework import status
        return Response({"message": "Anúncio deletado com sucesso (soft delete)."}, status=status.HTTP_200_OK)

class PublicProfileAPIView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

class CandidaturaListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = CandidaturaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from django.db.models import Q

        Ad.atualizar_vencidos()
        queryset = Candidatura.objects.select_related(
            'ad__author', 'user',
        ).filter(
            Q(user=self.request.user) | Q(ad__author=self.request.user)
        ).order_by('-enviado_em')
        user_id = self.request.query_params.get('user_id')
        ad_id = self.request.query_params.get('ad_id')

        if user_id:
            queryset = queryset.filter(user=self.request.user)
        if ad_id:
            queryset = queryset.filter(
                anuncio_id=ad_id,
                ad__author=self.request.user,
            )

        return queryset

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError

        ad = serializer.validated_data.get('ad')
        if not ad:
            raise ValidationError('O anúncio é obrigatório.')
        if ad.author_id == self.request.user.id:
            raise ValidationError('Você não pode se candidatar ao próprio anúncio.')
        Ad.atualizar_vencidos()
        ad.refresh_from_db(fields=['status_anuncio'])
        if ad.status_anuncio == 'Vencido':
            raise ValidationError('Este anúncio expirou e não aceita novas candidaturas.')
        if ad.status_anuncio == 'Finalizado' or ad.candidaturas.filter(status='aprovada').exists():
            raise ValidationError('Este anúncio já possui uma candidatura aprovada.')
        if ad.candidaturas.filter(user=self.request.user).exists():
            raise ValidationError('Você já se candidatou a este anúncio.')

        try:
            usuario_id = self.request.user.profile.id
        except Exception:
            usuario_id = self.request.user.id
        candidatura = serializer.save(
            user=self.request.user,
            usuario_id=usuario_id,
            status='pendente',
        )

        if ad.author and ad.author_id != self.request.user.id:
            profile = getattr(self.request.user, 'profile', None)
            nome = getattr(profile, 'nome_completo', None) or self.request.user.username
            criar_notificacao(
                usuario=ad.author,
                tipo='candidatura',
                titulo='Nova candidatura no seu anúncio',
                mensagem=f'{nome} se candidatou ao anúncio "{ad.title or ad.titulo}".',
                link=f'/my-ads/manage/{ad.id}',
            )

class CandidaturaUpdateAPIView(generics.UpdateAPIView):
    serializer_class = CandidaturaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Candidatura.objects.filter(ad__author=self.request.user)

    def patch(self, request, *args, **kwargs):
        from django.db import transaction
        from django.shortcuts import get_object_or_404

        new_status = str(request.data.get('status') or '').lower()
        if new_status not in {'aprovada', 'recusada'}:
            return Response(
                {'error': 'Status inválido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            Ad.atualizar_vencidos()
            candidatura = get_object_or_404(
                self.get_queryset().select_for_update(),
                pk=kwargs['pk'],
            )
            ad = Ad.objects.select_for_update().get(pk=candidatura.ad_id)

            if ad.status_anuncio == 'Vencido':
                return Response(
                    {'error': 'Não é possível decidir candidaturas de um anúncio vencido.'},
                    status=status.HTTP_409_CONFLICT,
                )

            if candidatura.status != 'pendente':
                return Response(
                    {'error': 'Esta candidatura não está mais pendente.'},
                    status=status.HTTP_409_CONFLICT,
                )
            if new_status == 'aprovada' and Candidatura.objects.filter(
                ad_id=candidatura.ad_id,
                status='aprovada',
            ).exclude(pk=candidatura.pk).exists():
                return Response(
                    {'error': 'Este anúncio já possui uma candidatura aprovada.'},
                    status=status.HTTP_409_CONFLICT,
                )

            candidatura.status = new_status
            candidatura.save()

            ad_titulo = candidatura.ad.title or candidatura.ad.titulo
            if new_status == 'aprovada':
                criar_notificacao(
                    usuario=candidatura.user,
                    tipo='acordo',
                    titulo='Candidatura aprovada!',
                    mensagem=f'Sua candidatura ao anúncio "{ad_titulo}" foi aprovada. Um acordo foi iniciado.',
                    link='/my-freelas',
                )
            else:
                criar_notificacao(
                    usuario=candidatura.user,
                    tipo='candidatura',
                    titulo='Candidatura recusada',
                    mensagem=f'Sua candidatura ao anúncio "{ad_titulo}" foi recusada.',
                    link='/my-applications',
                )

        return Response(self.get_serializer(candidatura).data)

class CandidaturaRetrieveAPIView(generics.RetrieveAPIView):
    serializer_class = CandidaturaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from django.db.models import Q
        return Candidatura.objects.filter(
            Q(user=self.request.user) | Q(ad__author=self.request.user)
        )


### notificações ###
from .models import Notificacao
from .serializers import NotificacaoSerializer
from .notificacoes import criar_notificacao


class NotificacaoListAPIView(generics.ListAPIView):
    serializer_class = NotificacaoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notificacao.objects.filter(
            usuario=self.request.user,
        ).order_by('-criado_em')[:50]


class NotificacaoNaoLidasAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Count

        nao_lidas = Notificacao.objects.filter(
            usuario=request.user,
            lida=False,
        )
        total = nao_lidas.count()
        por_tipo = dict(
            nao_lidas.values_list('tipo').annotate(total_tipo=Count('id'))
        )
        return Response({
            'count': total,
            'tipos': por_tipo,
        })


class NotificacaoMarcarLidaAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        from django.shortcuts import get_object_or_404

        notificacao = get_object_or_404(
            Notificacao,
            pk=pk,
            usuario=request.user,
        )
        notificacao.lida = True
        notificacao.save(update_fields=['lida'])
<<<<<<< HEAD
        from .notificacoes import publicar_resumo_notificacoes

        publicar_resumo_notificacoes(request.user)
=======
>>>>>>> origin/main
        return Response({'ok': True})


class NotificacaoMarcarLidasAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        queryset = Notificacao.objects.filter(
            usuario=request.user,
            lida=False,
        )
        tipos = request.data.get('tipos')
        if tipos:
            queryset = queryset.filter(tipo__in=tipos)
        quantidade = queryset.update(lida=True)
<<<<<<< HEAD
        from .notificacoes import publicar_resumo_notificacoes

        publicar_resumo_notificacoes(request.user)
=======
>>>>>>> origin/main
        return Response({'count': quantidade})


### autenticação com conta google ###
class GoogleSocialLoginAPI(APIView):
<<<<<<< HEAD
    """
    Login/cadastro unificado via Google.
    Recebe o id_token do Google Identity Services, verifica com allauth
    e retorna DRF Token.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        credential = request.data.get('id_token')
        if not credential:
            return Response(
                {'error': 'Token não fornecido'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Verifica o JWT do Google usando o allauth ---
        try:
            provider = get_social_adapter().get_provider(
                request, GoogleOAuth2Adapter.provider_id
            )
            sociallogin = provider.verify_token(request, {'id_token': credential})
        except Exception:
            return Response(
                {'error': 'Token inválido ou expirado'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Dados extraídos do JWT
        identity = sociallogin.account.extra_data
        email = identity.get('email', '').strip().lower()
        first_name = identity.get('given_name', '')
        last_name = identity.get('family_name', '')

        if not email:
            return Response(
                {'error': 'Não foi possível obter o email do Google'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cadastro/login unificado com verificação de conflito de email:
        #  - sem usuário com esse email        → cria conta nova (cadastro)
        #  - email vinculado ao mesmo Google   → login da conta existente
        #  - email já usado por outra conta    → conflito (manual ou outro)
        conta_google = SocialAccount.objects.filter(
            provider='google', uid__iexact=email,
        ).select_related('user').first()

        if conta_google:
            user = conta_google.user
            conta_google.extra_data = identity
            conta_google.save(update_fields=['extra_data'])
            if (not user.first_name and first_name) or (not user.last_name and last_name):
                user.first_name = user.first_name or first_name
                user.last_name = user.last_name or last_name
                user.save(update_fields=['first_name', 'last_name'])
        else:
            if User.objects.filter(email__iexact=email).exists():
                return Response(
                    {
                        'error': 'Este email já está sendo utilizado.',
                        'code': 'email_em_uso',
                    },
                    status=status.HTTP_409_CONFLICT,
                )
=======
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('id_token')
        if not token:
            return Response({'error': 'Token não fornecido'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            # Valida o token diretamente com o Google
            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                os.environ.get('GOOGLE_CLIENT_ID')
            )
            email = idinfo.get('email')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')

            # Cria ou pega o usuário
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
            # Usuário não cadastrado, retorna erro para o frontend redirecionar
                return Response(
                    {'error': 'not_registered', 'email': email},
                        status=status.HTTP_404_NOT_FOUND
                    )

            auth_token, _ = Token.objects.get_or_create(user=user)

            return Response({
                'token': auth_token.key,
                'user': UserSerializer(user).data,
})

        except ValueError:
            return Response({'error': 'Token inválido'}, status=status.HTTP_400_BAD_REQUEST)
        
        
## cadastro google ###
class GoogleSocialRegisterAPI(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('id_token')
        if not token:
            return Response({'error': 'Token não fornecido'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                os.environ.get('GOOGLE_CLIENT_ID')
            )
            email = idinfo.get('email')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')

            # Se já existe, não deixa cadastrar de novo
            if User.objects.filter(email=email).exists():
                return Response(
                    {'error': 'already_registered'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Cria o usuário
>>>>>>> origin/main
            user = User.objects.create_user(
                username=email,
                email=email,
                first_name=first_name,
                last_name=last_name,
            )
<<<<<<< HEAD
            SocialAccount.objects.create(
                provider='google',
                uid=email,
                user=user,
                extra_data=identity,
            )

        # --- Garante que o UserProfile existe ---
        UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'nome_completo': f'{first_name} {last_name}'.strip() or user.username,
                'email': email,
            },
        )

        # --- Retorna DRF Token ---
        auth_token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'token': auth_token.key,
            'user': UserSerializer(user).data,
        })
=======

            auth_token, _ = Token.objects.get_or_create(user=user)

            return Response({
                'token': auth_token.key,
                'user': UserSerializer(user).data,
            })

        except ValueError:
            return Response({'error': 'Token inválido'}, status=status.HTTP_400_BAD_REQUEST)
>>>>>>> origin/main
        

class EnviarCodigoVerificacaoAPI(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email não fornecido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'Usuário não encontrado'}, status=status.HTTP_404_NOT_FOUND)

        # Cria ou atualiza o código
        verificacao, _ = VerificacaoEmail.objects.get_or_create(usuario=user)
        verificacao.verificado = False
        verificacao.gerar_codigo()

        # Envia o email
        send_mail(
            subject='Seu código de verificação - Freelas',
            message=f'Olá, {user.first_name}!\n\nSeu código de verificação é: {verificacao.codigo}\n\nEle expira em 10 minutos.\n\nEquipe Freelas',
            from_email=None,
            recipient_list=[email],
        )

        return Response({'message': 'Código enviado com sucesso!'})


class VerificarCodigoAPI(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        codigo = request.data.get('codigo')

        if not email or not codigo:
            return Response({'error': 'Email e código são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            verificacao = VerificacaoEmail.objects.get(usuario=user)
        except (User.DoesNotExist, VerificacaoEmail.DoesNotExist):
            return Response({'error': 'Usuário não encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if verificacao.esta_expirado():
            return Response({'error': 'Código expirado. Solicite um novo.'}, status=status.HTTP_400_BAD_REQUEST)

        if verificacao.codigo != codigo:
            return Response({'error': 'Código incorreto.'}, status=status.HTTP_400_BAD_REQUEST)

        # Marca como verificado
        verificacao.verificado = True
        verificacao.save()

        # Cria o UserProfile agora que o email foi verificado
        UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'nome_completo': f"{user.first_name} {user.last_name}".strip() or user.username,
                'email': user.email,
            }
        )

        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'message': 'Email verificado com sucesso!',
            'token': token.key,
            'user': UserSerializer(user).data,
        })
    
    
## redefinir senha ###
class RedefinicaoSenhaAPI(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email não fornecido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'Nenhuma conta encontrada com esse email.'}, status=status.HTTP_404_NOT_FOUND)

        verificacao, _ = VerificacaoEmail.objects.get_or_create(usuario=user)
        verificacao.verificado = False
        verificacao.gerar_codigo()

        send_mail(
            subject='Redefinição de senha - Freelas',
            message=f'Olá, {user.first_name}!\n\nSeu código para redefinir a senha é: {verificacao.codigo}\n\nEle expira em 10 minutos.\n\nEquipe Freelas',
            from_email=None,
            recipient_list=[email],
        )

        return Response({'message': 'Código enviado com sucesso!'})


class RedefinirSenhaAPI(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        codigo = request.data.get('codigo')
        nova_senha = request.data.get('nova_senha')

        if not email or not codigo or not nova_senha:
            return Response({'error': 'Todos os campos são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            verificacao = VerificacaoEmail.objects.get(usuario=user)
        except (User.DoesNotExist, VerificacaoEmail.DoesNotExist):
            return Response({'error': 'Usuário não encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if verificacao.esta_expirado():
            return Response({'error': 'Código expirado. Solicite um novo.'}, status=status.HTTP_400_BAD_REQUEST)

        if verificacao.codigo != codigo:
            return Response({'error': 'Código incorreto.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(nova_senha)
        user.save()

        verificacao.verificado = True
        verificacao.save()

        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'message': 'Senha redefinida com sucesso!',
            'token': token.key,
            'user': UserSerializer(user).data,
        })


from .models import AcordoServico
from .serializers import AcordoServicoSerializer

class AcordoServicoListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = AcordoServicoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        from django.db.models import Prefetch
        from .models import SolicitacaoCancelamentoAcordo

        if user.is_staff or user.is_superuser:
            queryset = AcordoServico.objects.all().order_by('-data_confirmacao')
        else:
            from django.db.models import Q
            queryset = AcordoServico.objects.filter(
                Q(candidatura__user=user) | Q(candidatura__ad__author=user)
            ).order_by('-data_confirmacao')

        tem_solicitacao = self.request.query_params.get('tem_solicitacao')
        if tem_solicitacao is not None:
            if tem_solicitacao.lower() == 'true':
                queryset = queryset.filter(tem_solicitacao=True)
            elif tem_solicitacao.lower() == 'false':
                queryset = queryset.filter(tem_solicitacao=False)

        status_acordo = self.request.query_params.get('status')
        if status_acordo:
            queryset = queryset.filter(status_acordo=status_acordo)

        return queryset.select_related(
            'candidatura__user',
            'candidatura__ad__author',
        ).prefetch_related(
            Prefetch(
                'solicitacoes_cancelamento',
                queryset=SolicitacaoCancelamentoAcordo.objects.filter(status='pendente'),
                to_attr='cancelamentos_pendentes',
            ),
        )

class AcordoServicoRetrieveUpdateAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = AcordoServicoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from django.db.models import Q
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return AcordoServico.objects.all()
        return AcordoServico.objects.filter(
            Q(candidatura__user=user) | Q(candidatura__ad__author=user)
        )


from .models import SolicitacaoAlteracaoAcordo, SolicitacaoCancelamentoAcordo
from .serializers import (
    SolicitacaoAlteracaoAcordoSerializer,
    SolicitacaoCancelamentoAcordoSerializer,
)


class SolicitacoesAdminPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class SolicitarCancelamentoAcordoAPI(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        from django.shortcuts import get_object_or_404

        justificativa = str(request.data.get('justificativa') or '').strip()
        if len(justificativa) < 10:
            return Response(
                {'error': 'Informe uma justificativa com pelo menos 10 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            acordo = get_object_or_404(
                AcordoServico.objects.select_for_update(),
                pk=pk,
            )
            contratante, freelancer = _partes_do_acordo(acordo)
            if request.user not in {contratante, freelancer}:
                return Response(
                    {'error': 'Você não participa deste acordo.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if acordo.status_acordo not in {'Ativo', 'Pendente Pagamento'}:
                return Response(
                    {'error': 'Este acordo não pode mais receber solicitação de cancelamento.'},
                    status=status.HTTP_409_CONFLICT,
                )
            if acordo.solicitacoes_cancelamento.filter(status='pendente').exists():
                return Response(
                    {'error': 'Já existe uma solicitação de cancelamento pendente.'},
                    status=status.HTTP_409_CONFLICT,
                )
            if acordo.tem_solicitacao:
                return Response(
                    {'error': 'Decida a alteração pendente antes de solicitar o cancelamento.'},
                    status=status.HTTP_409_CONFLICT,
                )

            solicitacao = SolicitacaoCancelamentoAcordo.objects.create(
                acordo=acordo,
                solicitante=request.user,
                papel_solicitante=(
                    'freelancer' if request.user == freelancer else 'contratante'
                ),
                justificativa=justificativa,
            )

        return Response(
            SolicitacaoCancelamentoAcordoSerializer(
                solicitacao,
                context={'request': request},
            ).data,
            status=status.HTTP_201_CREATED,
        )


class SolicitacaoCancelamentoAdminListAPIView(generics.ListAPIView):
    serializer_class = SolicitacaoCancelamentoAcordoSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = SolicitacoesAdminPagination

    def get_queryset(self):
        from django.db.models import Case, IntegerField, Value, When

        queryset = SolicitacaoCancelamentoAcordo.objects.select_related(
            'acordo',
            'solicitante',
            'analisado_por',
        ).annotate(
            status_order=Case(
                When(status='pendente', then=Value(0)),
                When(status='aprovada', then=Value(1)),
                When(status='recusada', then=Value(2)),
                default=Value(3),
                output_field=IntegerField(),
            ),
        ).order_by('status_order', '-criado_em')
        status_filtro = self.request.query_params.get('status')
        if status_filtro in {'pendente', 'aprovada', 'recusada'}:
            queryset = queryset.filter(status=status_filtro)
        return queryset


class DecidirCancelamentoAcordoAPI(APIView):
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, pk):
        from django.shortcuts import get_object_or_404

        decisao = str(request.data.get('decisao') or '').lower()
        if decisao not in {'aprovar', 'recusar'}:
            return Response(
                {'error': 'Informe a decisão como "aprovar" ou "recusar".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            solicitacao = get_object_or_404(
                SolicitacaoCancelamentoAcordo.objects.select_for_update().select_related(
                    'acordo',
                    'solicitante',
                ),
                pk=pk,
            )
            if solicitacao.status != 'pendente':
                return Response(
                    {'error': 'Esta solicitação já foi analisada.'},
                    status=status.HTTP_409_CONFLICT,
                )

            solicitacao.status = 'aprovada' if decisao == 'aprovar' else 'recusada'
            solicitacao.analisado_por = request.user
            solicitacao.resposta_admin = str(request.data.get('resposta_admin') or '').strip() or None
            solicitacao.analisado_em = timezone.now()
            solicitacao.save(update_fields=[
                'status', 'analisado_por', 'resposta_admin', 'analisado_em',
            ])

            if decisao == 'aprovar':
                acordo = solicitacao.acordo
                acordo.status_acordo = 'Cancelado'
                acordo.cancelado_em = timezone.now()
                acordo.save(update_fields=['status_acordo', 'cancelado_em'])
                acordo.pagamentos.filter(status='pendente').update(
                    status='cancelado',
                    detalhe_status='cancelamento_acordo_aprovado',
                )

                contratante, freelancer = _partes_do_acordo(acordo)
                mensagem = f'O acordo "{acordo.titulo_anuncio}" foi cancelado.'
                criar_notificacao(contratante, 'acordo', 'Acordo cancelado', mensagem, '/my-freelas')
                criar_notificacao(freelancer, 'acordo', 'Acordo cancelado', mensagem, '/my-freelas')

        return Response(
            SolicitacaoCancelamentoAcordoSerializer(
                solicitacao,
                context={'request': request},
            ).data,
        )


class SolicitacaoAlteracaoAdminListAPIView(generics.ListAPIView):
    serializer_class = SolicitacaoAlteracaoAcordoSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = SolicitacoesAdminPagination

    def get_queryset(self):
        from django.db.models import Case, IntegerField, Value, When

        queryset = SolicitacaoAlteracaoAcordo.objects.select_related(
            'acordo',
            'solicitante',
            'decidido_por',
        ).annotate(
            status_order=Case(
                When(status='pendente', then=Value(0)),
                When(status='aprovada', then=Value(1)),
                When(status='recusada', then=Value(2)),
                default=Value(3),
                output_field=IntegerField(),
            ),
        ).order_by('status_order', '-criado_em')
        status_filtro = self.request.query_params.get('status')
        if status_filtro in {'pendente', 'aprovada', 'recusada'}:
            queryset = queryset.filter(status=status_filtro)
        return queryset


from .models import Avaliacao
from .serializers import AvaliacaoSerializer, CRITERIOS_AVALIACAO


def _partes_do_acordo(acordo):
    candidatura = acordo.candidatura
    freelancer = candidatura.user if candidatura else None
    contratante = candidatura.ad.author if candidatura and candidatura.ad else None
    return contratante, freelancer


class ConcluirAcordoAPI(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        from django.db import transaction
        from django.shortcuts import get_object_or_404

        with transaction.atomic():
            acordo = get_object_or_404(
                AcordoServico.objects.select_for_update(),
                pk=pk,
            )
            contratante, freelancer = _partes_do_acordo(acordo)
            if request.user not in {contratante, freelancer}:
                return Response(
                    {'error': 'Você não participa deste acordo.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if acordo.status_acordo != 'Ativo':
                return Response(
                    {'error': 'Somente acordos em andamento podem ser concluídos.'},
                    status=status.HTTP_409_CONFLICT,
                )
            if acordo.solicitacoes_cancelamento.filter(status='pendente').exists():
                return Response(
                    {'error': 'Existe uma solicitação de cancelamento aguardando análise.'},
                    status=status.HTTP_409_CONFLICT,
                )
            if not acordo.pagamentos.filter(status='pago').exists():
                if not _checkout_academico_habilitado() or not contratante:
                    return Response(
                        {'error': 'O pagamento precisa estar aprovado antes da conclusão.'},
                        status=status.HTTP_409_CONFLICT,
                    )

                # Compatibilidade com acordos locais antigos que foram ativados antes
                # de o histórico de pagamentos passar a ser obrigatório.
                try:
                    amount = Decimal(str(acordo.valor_acordado)).quantize(Decimal('0.01'))
                except (InvalidOperation, TypeError):
                    amount = Decimal('0.00')
                Pagamento.objects.create(
                    usuario=contratante,
                    tipo='acordo',
                    status='pago',
                    valor=amount,
                    referencia_externa=f'teste:legado:acordo:{acordo.id}:{uuid4().hex}',
                    acordo=acordo,
                    mp_payment_id=f'LOCAL-LEGACY-{uuid4().hex}',
                    forma_pagamento='simulacao_pagamento',
                    detalhe_status='registro_local_compatibilidade',
                    aprovado_em=timezone.now(),
                )

            acordo.status_acordo = 'Concluído'
            acordo.concluido_em = timezone.now()
            acordo.save(update_fields=['status_acordo', 'concluido_em'])

            outra_parte = freelancer if request.user == contratante else contratante
            criar_notificacao(
                usuario=outra_parte,
                tipo='acordo',
                titulo='Acordo concluído',
                mensagem=f'O acordo "{acordo.titulo_anuncio}" foi concluído. Deixe sua avaliação.',
                link='/my-freelas',
            )

        return Response({
            'message': 'Acordo concluído. As avaliações das duas partes estão disponíveis.',
            'acordo_id': acordo.id,
        })


class AvaliacaoListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = AvaliacaoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Avaliacao.objects.filter(
            avaliador=self.request.user.profile,
        ).select_related(
            'avaliador__user',
            'avaliado__user',
            'acordo',
        ).order_by('-criado_em')

    def perform_create(self, serializer):
        super().perform_create(serializer)
        avaliacao = serializer.instance
        avaliado_user = avaliacao.avaliado.user if avaliacao.avaliado and avaliacao.avaliado.user else None
        avaliador_nome = (
            avaliacao.avaliador.nome_completo
            or avaliacao.avaliador.user.get_full_name()
            or avaliacao.avaliador.user.username
        )
        criar_notificacao(
            usuario=avaliado_user,
            tipo='avaliacao',
            titulo='Nova avaliação recebida',
            mensagem=f'{avaliador_nome} avaliou seu trabalho no acordo "{avaliacao.acordo.titulo_anuncio}".',
            link='/my-reviews',
        )


class AvaliacoesPendentesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Q

        acordos = AcordoServico.objects.filter(
            Q(candidatura__user=request.user) |
            Q(candidatura__ad__author=request.user),
            status_acordo='Concluído',
        ).exclude(
            avaliacoes__avaliador=request.user.profile,
        ).select_related(
            'candidatura__user__profile',
            'candidatura__ad__author__profile',
        ).distinct().order_by('-concluido_em')

        pendentes = []
        for acordo in acordos:
            contratante, freelancer = _partes_do_acordo(acordo)
            user_is_contratante = request.user == contratante
            avaliado = freelancer if user_is_contratante else contratante
            papel_avaliado = 'freelancer' if user_is_contratante else 'contratante'
            nome = (
                avaliado.profile.nome_completo
                if avaliado and hasattr(avaliado, 'profile')
                else avaliado.get_full_name() or avaliado.username
            )
            pendentes.append({
                'acordo_id': acordo.id,
                'titulo_acordo': acordo.titulo_anuncio,
                'avaliado_id': avaliado.id,
                'avaliado_nome': nome,
                'papel_avaliado': papel_avaliado,
                'criterios': [
                    {'chave': key, 'rotulo': label}
                    for key, label in CRITERIOS_AVALIACAO[papel_avaliado].items()
                ],
                'concluido_em': acordo.concluido_em,
            })

        return Response(pendentes)


import logging
import requests
from decimal import Decimal, InvalidOperation
from uuid import uuid4
from django.db import transaction
from django.utils import timezone
from .models import CartaoUsuario, Pagamento
from .serializers import CartaoUsuarioSerializer, PagamentoSerializer


logger = logging.getLogger(__name__)
MERCADO_PAGO_API = 'https://api.mercadopago.com'
PLANOS_PAGOS = {
    'gold': {'nome': 'Gold', 'valor': Decimal('29.90')},
    'platinum': {'nome': 'Platinum', 'valor': Decimal('79.90')},
}


def _mercado_pago_headers(reference=None):
    token = os.environ.get('MERCADO_PAGO_ACCESS_TOKEN', '').strip()
    if not token or token.startswith('YOUR_'):
        return None

    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }
    if reference:
        headers['X-Idempotency-Key'] = reference
    return headers


def _frontend_url(path):
    base_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    return f'{base_url}{path}'


def _notification_url():
    base_url = os.environ.get('BACKEND_PUBLIC_URL', '').rstrip('/')
    if base_url.startswith('https://'):
        return f'{base_url}/api/pagamentos/webhook/'
    return None


def _checkout_return_url(flow, result='success'):
    public_backend = os.environ.get('BACKEND_PUBLIC_URL', '').rstrip('/')
    if public_backend.startswith('https://'):
        return f'{public_backend}/api/pagamentos/retorno/{flow}/{result}/'

    frontend = os.environ.get('FRONTEND_URL', '').rstrip('/')
    if frontend.startswith('https://'):
        if flow == 'acordo':
            return f'{frontend}/my-freelas?checkout={result}'
        return f'{frontend}/my-payments?checkout=subscription'
    return None


class MercadoPagoReturnAPI(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, flow, result):
        if flow == 'acordo' and result in {'success', 'failure', 'pending'}:
            path = f'/my-freelas?checkout={result}'
        elif flow == 'assinatura':
            path = '/my-payments?checkout=subscription'
        else:
            path = '/'
        return redirect(_frontend_url(path))


def _checkout_response_error(response):
    try:
        data = response.json()
        return data.get('message') or data.get('error') or 'Erro não informado pelo Mercado Pago.'
    except ValueError:
        return 'Resposta inválida do Mercado Pago.'


def _response_json(response):
    try:
        return response.json()
    except ValueError:
        return {}


def _checkout_academico_habilitado():
    test_mode = os.environ.get('MERCADO_PAGO_TEST_MODE', '').strip().lower()
    return settings.DEBUG and test_mode in {'1', 'true', 'yes', 'on'}


def _aprovar_checkout_academico(pagamento):
    """Confirma localmente após o MP aceitar a criação do checkout."""
    return _confirmar_pagamento({
        'id': f'ACADEMIC-{uuid4().hex}',
        'external_reference': pagamento.referencia_externa,
        'transaction_amount': str(pagamento.valor),
        'currency_id': 'BRL',
        'status': 'approved',
        'status_detail': 'checkout_criado_em_modo_academico',
        'payment_method_id': 'simulacao_pagamento',
    })


def _registrar_cartao(usuario, payment_data):
    card = payment_data.get('card') or {}
    last_four = str(card.get('last_four_digits') or '').strip()
    payment_method = str(payment_data.get('payment_method_id') or '').strip()
    if not last_four or not payment_method:
        return

    cardholder = card.get('cardholder') or {}
    CartaoUsuario.objects.update_or_create(
        usuario=usuario,
        bandeira=payment_method,
        ultimos_quatro=last_four[-4:],
        defaults={
            'mp_card_id': str(card.get('id')) if card.get('id') else None,
            'mes_expiracao': card.get('expiration_month'),
            'ano_expiracao': card.get('expiration_year'),
            'nome_titular': cardholder.get('name') or None,
            'ativo': True,
        },
    )


def _confirmar_pagamento(payment_data):
    reference = payment_data.get('external_reference')
    if not reference:
        return False

    try:
        amount = Decimal(str(payment_data.get('transaction_amount')))
    except (InvalidOperation, TypeError):
        return False

    with transaction.atomic():
        try:
            pagamento = (
                Pagamento.objects.select_for_update()
                .get(referencia_externa=reference)
            )
        except Pagamento.DoesNotExist:
            return False

        if amount != pagamento.valor or payment_data.get('currency_id') != 'BRL':
            logger.warning('Pagamento Mercado Pago divergente para a referência %s.', reference)
            return False

        mp_status = payment_data.get('status')
        pagamento.mp_payment_id = str(payment_data.get('id') or '')
        pagamento.detalhe_status = payment_data.get('status_detail') or None
        pagamento.forma_pagamento = payment_data.get('payment_method_id') or None

        if mp_status == 'approved':
            pagamento.status = 'pago'
            pagamento.aprovado_em = pagamento.aprovado_em or timezone.now()
            pagamento.save()

            if pagamento.tipo == 'assinatura':
                profile, _ = UserProfile.objects.get_or_create(user=pagamento.usuario)
                profile.subscription_plan = pagamento.plano
                profile.save(update_fields=['subscription_plan'])
                criar_notificacao(
                    usuario=pagamento.usuario,
                    tipo='pagamento',
                    titulo='Plano ativado',
                    mensagem=f'Seu plano {pagamento.plano} foi ativado com sucesso.',
                    link='/my-payments',
                )
            elif pagamento.tipo == 'acordo' and pagamento.acordo:
                if pagamento.acordo.status_acordo != 'Cancelado':
                    pagamento.acordo.status_acordo = 'Ativo'
                    pagamento.acordo.save(update_fields=['status_acordo'])

                    _, freelancer = _partes_do_acordo(pagamento.acordo)
                    criar_notificacao(
                        usuario=freelancer,
                        tipo='pagamento',
                        titulo='Pagamento recebido',
                        mensagem=f'O pagamento do acordo "{pagamento.acordo.titulo_anuncio}" foi aprovado. O serviço já está em andamento.',
                        link='/my-freelas',
                    )
                else:
                    logger.warning(
                        'Pagamento aprovado após cancelamento do acordo %s; '
                        'o acordo permaneceu cancelado e exige análise financeira.',
                        pagamento.acordo_id,
                    )

            _registrar_cartao(pagamento.usuario, payment_data)
            return True

        if mp_status in {'rejected', 'cancelled', 'refunded', 'charged_back'}:
            pagamento.status = 'cancelado' if mp_status in {'cancelled', 'refunded'} else 'falhou'
        else:
            pagamento.status = 'pendente'
        pagamento.save()
        return False

class CriarPreferenciaAssinaturaAPI(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plano = str(request.data.get('plano') or '').lower()
        if plano == 'free':
            profile, _ = UserProfile.objects.get_or_create(user=request.user)
            profile.subscription_plan = 'Gratuito'
            profile.save(update_fields=['subscription_plan'])
            return Response({
                'checkout_required': False,
                'message': 'Plano gratuito ativado com sucesso.',
            })

        if plano not in PLANOS_PAGOS:
            return Response(
                {'error': 'Plano inválido ou não informado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        headers = _mercado_pago_headers()
        if not headers:
            return Response(
                {'error': 'O checkout do Mercado Pago ainda não está configurado.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return_urls = {
            result: _checkout_return_url('assinatura', result)
            for result in ('success', 'failure', 'pending')
        }
        if not all(return_urls.values()):
            return Response(
                {'error': 'Configure BACKEND_PUBLIC_URL com a URL HTTPS do ngrok.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        plan = PLANOS_PAGOS[plano]
        reference = f'sub:{plano}:{request.user.id}:{uuid4().hex}'
        pagamento = Pagamento.objects.create(
            usuario=request.user,
            tipo='assinatura',
            status='pendente',
            valor=plan['valor'],
            referencia_externa=reference,
            plano=plan['nome'],
        )

        payer_email = request.user.email
        if _checkout_academico_habilitado():
            payer_email = (
                os.environ.get('MERCADO_PAGO_TEST_PAYER_EMAIL', '').strip()
                or payer_email
            )

        body = {
            'items': [{
                'id': f'assinatura-{plano}',
                'title': f"Assinatura mensal - Plano {plan['nome']}",
                'description': 'Checkout simbólico de assinatura do projeto acadêmico',
                'quantity': 1,
                'unit_price': float(plan['valor']),
                'currency_id': 'BRL',
            }],
            'payer': {'email': payer_email},
            'back_urls': return_urls,
            'auto_return': 'approved',
            'external_reference': reference,
        }
        notification_url = _notification_url()
        if notification_url:
            body['notification_url'] = notification_url

        try:
            mp_response = requests.post(
                f'{MERCADO_PAGO_API}/checkout/preferences',
                json=body,
                headers={**headers, 'X-Idempotency-Key': reference},
                timeout=15,
            )
        except requests.RequestException:
            pagamento.status = 'falhou'
            pagamento.detalhe_status = 'mercado_pago_indisponivel'
            pagamento.save(update_fields=['status', 'detalhe_status', 'atualizado_em'])
            return Response(
                {'error': 'Não foi possível conectar ao Mercado Pago. Tente novamente.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        data = _response_json(mp_response)
        checkout_url = data.get('init_point') or data.get('sandbox_init_point')
        if mp_response.status_code not in (200, 201) or not checkout_url:
            pagamento.status = 'falhou'
            pagamento.detalhe_status = 'erro_criacao_checkout'
            pagamento.save(update_fields=['status', 'detalhe_status', 'atualizado_em'])
            return Response(
                {'error': _checkout_response_error(mp_response)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        pagamento.mp_preference_id = data.get('id')
        pagamento.checkout_url = checkout_url
        pagamento.save(update_fields=['mp_preference_id', 'checkout_url', 'atualizado_em'])
        test_approved = False
        if _checkout_academico_habilitado():
            test_approved = _aprovar_checkout_academico(pagamento)
        return Response({
            'checkout_required': True,
            'init_point': checkout_url,
            'reference': reference,
            'test_approved': test_approved,
        })


class CriarPreferenciaAcordoAPI(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        acordo_id = request.data.get('acordo_id')
        if not acordo_id:
            return Response(
                {'error': 'ID do acordo não informado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            acordo = AcordoServico.objects.select_related('candidatura__ad').get(id=acordo_id)
        except AcordoServico.DoesNotExist:
            return Response(
                {'error': 'Acordo não encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        contratante_id = getattr(getattr(acordo.candidatura, 'ad', None), 'author_id', None)
        if contratante_id != request.user.id:
            return Response(
                {'error': 'Somente o contratante deste serviço pode realizar o pagamento.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if acordo.status_acordo != 'Pendente Pagamento':
            return Response(
                {'error': 'Este acordo não está aguardando pagamento.'},
                status=status.HTTP_409_CONFLICT,
            )
        if acordo.solicitacoes_cancelamento.filter(status='pendente').exists():
            return Response(
                {'error': 'Este acordo possui uma solicitação de cancelamento pendente.'},
                status=status.HTTP_409_CONFLICT,
            )

        try:
            price = Decimal(str(acordo.valor_acordado)).quantize(Decimal('0.01'))
        except (InvalidOperation, TypeError):
            price = Decimal('0.00')
        if price <= 0:
            return Response(
                {'error': 'O acordo precisa ter um valor maior que zero.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pending_payment = Pagamento.objects.filter(
            usuario=request.user,
            acordo=acordo,
            tipo='acordo',
            status='pendente',
            checkout_url__isnull=False,
        ).order_by('-criado_em').first()
        if pending_payment:
            test_approved = False
            if _checkout_academico_habilitado():
                test_approved = _aprovar_checkout_academico(pending_payment)
            return Response({
                'checkout_required': True,
                'init_point': pending_payment.checkout_url,
                'reference': pending_payment.referencia_externa,
                'test_approved': test_approved,
            })

        headers = _mercado_pago_headers()
        if not headers:
            return Response(
                {'error': 'O checkout do Mercado Pago ainda não está configurado.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return_urls = {
            result: _checkout_return_url('acordo', result)
            for result in ('success', 'failure', 'pending')
        }
        if not all(return_urls.values()):
            return Response(
                {'error': 'Configure BACKEND_PUBLIC_URL com a URL HTTPS do ngrok.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        reference = f'acordo:{acordo_id}:{request.user.id}:{uuid4().hex}'
        pagamento = Pagamento.objects.create(
            usuario=request.user,
            tipo='acordo',
            status='pendente',
            valor=price,
            referencia_externa=reference,
            acordo=acordo,
        )

        body = {
            'items': [{
                'id': f'acordo-{acordo.id}',
                'title': f'Serviço freelancer - {acordo.titulo_anuncio}',
                'description': acordo.descricao_servico or 'Pagamento de serviço freelancer',
                'quantity': 1,
                'unit_price': float(price),
                'currency_id': 'BRL',
            }],
            'payer': {'email': request.user.email},
            'back_urls': return_urls,
            'auto_return': 'approved',
            'external_reference': reference,
        }
        notification_url = _notification_url()
        if notification_url:
            body['notification_url'] = notification_url

        try:
            mp_response = requests.post(
                f'{MERCADO_PAGO_API}/checkout/preferences',
                json=body,
                headers={**headers, 'X-Idempotency-Key': reference},
                timeout=15,
            )
        except requests.RequestException:
            pagamento.status = 'falhou'
            pagamento.detalhe_status = 'mercado_pago_indisponivel'
            pagamento.save(update_fields=['status', 'detalhe_status', 'atualizado_em'])
            return Response(
                {'error': 'Não foi possível conectar ao Mercado Pago. Tente novamente.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        data = _response_json(mp_response)
        checkout_url = data.get('init_point') or data.get('sandbox_init_point')
        if mp_response.status_code not in (200, 201) or not checkout_url:
            pagamento.status = 'falhou'
            pagamento.detalhe_status = 'erro_criacao_checkout'
            pagamento.save(update_fields=['status', 'detalhe_status', 'atualizado_em'])
            return Response(
                {'error': _checkout_response_error(mp_response)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        pagamento.mp_preference_id = data.get('id')
        pagamento.checkout_url = checkout_url
        pagamento.save(update_fields=['mp_preference_id', 'checkout_url', 'atualizado_em'])
        test_approved = False
        if _checkout_academico_habilitado():
            test_approved = _aprovar_checkout_academico(pagamento)
        return Response({
            'checkout_required': True,
            'init_point': checkout_url,
            'reference': reference,
            'test_approved': test_approved,
        })


class SimularPagamentoAcordoAPI(APIView):
    """Aprovação local explícita para testes quando o sandbox externo não conclui."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        test_mode = os.environ.get('MERCADO_PAGO_TEST_MODE', '').strip().lower()
        if not settings.DEBUG or test_mode not in {'1', 'true', 'yes', 'on'}:
            return Response(
                {'error': 'A simulação de pagamento não está habilitada.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        from django.shortcuts import get_object_or_404

        with transaction.atomic():
            acordo = get_object_or_404(
                AcordoServico.objects.select_for_update(),
                pk=pk,
            )
            contratante, _ = _partes_do_acordo(acordo)
            if request.user != contratante:
                return Response(
                    {'error': 'Somente o contratante pode simular o pagamento.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if acordo.status_acordo != 'Pendente Pagamento':
                return Response(
                    {'error': 'O acordo não está aguardando pagamento.'},
                    status=status.HTTP_409_CONFLICT,
                )
            if acordo.solicitacoes_cancelamento.filter(status='pendente').exists():
                return Response(
                    {'error': 'Existe uma solicitação de cancelamento pendente.'},
                    status=status.HTTP_409_CONFLICT,
                )

            try:
                amount = Decimal(str(acordo.valor_acordado)).quantize(Decimal('0.01'))
            except (InvalidOperation, TypeError):
                amount = Decimal('0.00')
            if amount <= 0:
                return Response(
                    {'error': 'O acordo precisa ter um valor válido.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            pagamento = acordo.pagamentos.filter(
                usuario=request.user,
                tipo='acordo',
                status__in=['pendente', 'falhou', 'pago'],
            ).order_by('-criado_em').first()
            if not pagamento:
                pagamento = Pagamento.objects.create(
                    usuario=request.user,
                    tipo='acordo',
                    status='pendente',
                    valor=amount,
                    referencia_externa=f'teste:acordo:{acordo.id}:{uuid4().hex}',
                    acordo=acordo,
                )

            pagamento.status = 'pago'
            pagamento.valor = amount
            pagamento.mp_payment_id = f'LOCAL-TEST-{uuid4().hex}'
            pagamento.forma_pagamento = 'simulacao_pagamento'
            pagamento.detalhe_status = 'aprovado_em_ambiente_local'
            pagamento.aprovado_em = pagamento.aprovado_em or timezone.now()
            pagamento.save()

            acordo.status_acordo = 'Ativo'
            acordo.save(update_fields=['status_acordo'])

            _, freelancer = _partes_do_acordo(acordo)
            criar_notificacao(
                usuario=freelancer,
                tipo='pagamento',
                titulo='Pagamento recebido',
                mensagem=f'O pagamento do acordo "{acordo.titulo_anuncio}" foi aprovado. O serviço já está em andamento.',
                link='/my-freelas',
            )

        return Response({
            'message': 'Pagamento de teste aprovado e acordo movido para Em Andamento.',
            'acordo_id': acordo.id,
            'status_acordo': acordo.status_acordo,
        })


class MercadoPagoWebhookAPI(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payment_id = request.data.get('data', {}).get('id') or request.query_params.get('id')
        topic = request.data.get('type') or request.query_params.get('topic')

        if not payment_id or (topic and topic != 'payment'):
            return Response({'status': 'ignored'})

        headers = _mercado_pago_headers()
        if not headers:
            return Response(
                {'error': 'Credencial do Mercado Pago não configurada.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            mp_response = requests.get(
                f'{MERCADO_PAGO_API}/v1/payments/{payment_id}',
                headers=headers,
                timeout=15,
            )
        except requests.RequestException:
            return Response(
                {'error': 'Falha temporária ao consultar o Mercado Pago.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if mp_response.status_code != 200:
            return Response(
                {'error': 'Pagamento não encontrado no Mercado Pago.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        processed = _confirmar_pagamento(mp_response.json())
        return Response({'status': 'processed' if processed else 'received'})


class PagamentoHistoricoAPIView(generics.ListAPIView):
    serializer_class = PagamentoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Tentativas pendentes/falhas existem apenas para conciliação e não são
        # registradas no histórico visível antes da confirmação do checkout.
        return Pagamento.objects.filter(
            usuario=self.request.user,
            status='pago',
        ).order_by('-aprovado_em', '-criado_em')


class CartaoUsuarioListAPIView(generics.ListAPIView):
    serializer_class = CartaoUsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CartaoUsuario.objects.filter(
            usuario=self.request.user,
            ativo=True,
        ).order_by('-atualizado_em')


def _mes_inicio(data):
    return data.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


<<<<<<< HEAD
def _corte_dashboard():
    """Data de corte: a dashboard contabiliza somente usuários registrados a
    partir da migração do login social para django-allauth (era atual)."""
    from datetime import datetime
    return timezone.make_aware(datetime(2026, 9, 9))


=======
>>>>>>> origin/main
def _variacao(atual, anterior):
    if not anterior:
        return 100 if atual else 0
    return round(((atual - anterior) / anterior) * 100, 1)


# Filtros de período do dashboard: além do "mês atual" (que sempre existiu e
# compara o mês corrente até agora com o mês calendário anterior INTEIRO),
# aceita janelas móveis de N dias e um intervalo de datas personalizado. Para
# esses dois últimos, o período anterior é a mesma duração imediatamente
# antes, para a comparação ficar justa.
_PERIODOS_DIAS = {'7d': 7, '30d': 30, '90d': 90, 'ano': 365}

_PERIODO_LABELS = {
    'mes_atual': 'Mês atual',
    '7d': 'Últimos 7 dias',
    '30d': 'Últimos 30 dias',
    '90d': 'Últimos 90 dias',
    'ano': 'Últimos 12 meses',
    'custom': 'Período personalizado',
}


def _parse_data(valor):
    if not valor:
        return None
    from datetime import datetime

    try:
        return timezone.make_aware(datetime.strptime(valor, '%Y-%m-%d'))
    except ValueError:
        return None


def _resolver_periodo(request):
    """Resolve o filtro de período (?periodo=... e, se personalizado,
    ?data_inicio=AAAA-MM-DD&data_fim=AAAA-MM-DD) em limites de data concretos.

    Retorna (chave_periodo, inicio_atual, fim_atual, inicio_anterior); o fim
    do período anterior é sempre inicio_atual (janelas contíguas, sem lacuna).
    """
    agora = timezone.now()
    periodo = request.query_params.get('periodo') or 'mes_atual'

    if periodo == 'custom':
        inicio_atual = _parse_data(request.query_params.get('data_inicio'))
        fim_informado = _parse_data(request.query_params.get('data_fim'))
        if inicio_atual and fim_informado:
            fim_atual = min(fim_informado + timezone.timedelta(days=1), agora)
            duracao = max(fim_atual - inicio_atual, timezone.timedelta(days=1))
            inicio_anterior = inicio_atual - duracao
            return periodo, inicio_atual, fim_atual, inicio_anterior
        periodo = 'mes_atual'

    if periodo in _PERIODOS_DIAS:
        fim_atual = agora
        inicio_atual = agora - timezone.timedelta(days=_PERIODOS_DIAS[periodo])
        inicio_anterior = inicio_atual - (fim_atual - inicio_atual)
        return periodo, inicio_atual, fim_atual, inicio_anterior

    inicio_atual = _mes_inicio(agora)
    fim_atual = agora
    inicio_anterior = _mes_inicio(inicio_atual - timezone.timedelta(days=1))
    return 'mes_atual', inicio_atual, fim_atual, inicio_anterior


def _contagem_por_periodo(queryset, campo, inicio_atual, fim_atual, inicio_anterior):
    atual = queryset.filter(
        **{f'{campo}__gte': inicio_atual, f'{campo}__lt': fim_atual},
    ).count()
    anterior = queryset.filter(
        **{f'{campo}__gte': inicio_anterior, f'{campo}__lt': inicio_atual},
    ).count()
    return atual, anterior


class DashboardAdminAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, *args, **kwargs):
        from django.db.models import Count, Sum

        periodo, inicio_atual, fim_atual, inicio_anterior = _resolver_periodo(request)

        def serie_usuarios(qs):
            return _contagem_por_periodo(qs, 'date_joined', inicio_atual, fim_atual, inicio_anterior)

<<<<<<< HEAD
        # Com a migração do login para django-allauth, a estatística começa a
        # contabilizar apenas os usuários registrados a partir de hoje.
        corte = _corte_dashboard()
        usuarios_atual, usuarios_anterior = serie_usuarios(
            User.objects.filter(date_joined__gte=corte),
        )
=======
        usuarios_atual, usuarios_anterior = serie_usuarios(User.objects.all())
>>>>>>> origin/main

        autores_freelancer = User.objects.filter(
            ads__role='freelancer',
            ads__deletado=False,
<<<<<<< HEAD
            date_joined__gte=corte,
=======
>>>>>>> origin/main
        ).distinct()
        autores_contratante = User.objects.filter(
            ads__role__in=['contractor', 'contratante'],
            ads__deletado=False,
<<<<<<< HEAD
            date_joined__gte=corte,
=======
>>>>>>> origin/main
        ).distinct()

        freelancer_atual, freelancer_anterior = serie_usuarios(autores_freelancer)
        contratante_atual, contratante_anterior = serie_usuarios(autores_contratante)
        freelas_atual, freelas_anterior = serie_usuarios(
            (autores_freelancer | autores_contratante).distinct(),
        )

        acordos_do_periodo = AcordoServico.objects.filter(
            data_confirmacao__gte=inicio_atual, data_confirmacao__lt=fim_atual,
        )
        ids_freela_acordo_periodo = set(
            acordos_do_periodo.exclude(candidatura__user=None)
<<<<<<< HEAD
            .exclude(candidatura__user__date_joined__lt=corte)
=======
>>>>>>> origin/main
            .values_list('candidatura__user_id', flat=True),
        )
        ids_contratante_acordo_periodo = set(
            acordos_do_periodo.exclude(candidatura__ad__author=None)
<<<<<<< HEAD
            .exclude(candidatura__ad__author__date_joined__lt=corte)
=======
>>>>>>> origin/main
            .values_list('candidatura__ad__author_id', flat=True),
        )
        pessoas_fecharam_acordo_periodo = len(ids_freela_acordo_periodo | ids_contratante_acordo_periodo)

<<<<<<< HEAD
        # Indicador mensal fixo: quantos usuários manuais fecharam acordo no
        # mês calendário atual, independentemente do filtro de período.
        agora = timezone.now()
        acordos_do_mes = AcordoServico.objects.filter(
            data_confirmacao__gte=_mes_inicio(agora),
            data_confirmacao__lte=agora,
        )
        ids_freela_acordo_mes = set(
            acordos_do_mes.exclude(candidatura__user=None)
            .exclude(candidatura__user__date_joined__lt=corte)
            .values_list('candidatura__user_id', flat=True),
        )
        ids_contratante_acordo_mes = set(
            acordos_do_mes.exclude(candidatura__ad__author=None)
            .exclude(candidatura__ad__author__date_joined__lt=corte)
            .values_list('candidatura__ad__author_id', flat=True),
        )
        pessoas_fecharam_acordo_mes = len(ids_freela_acordo_mes | ids_contratante_acordo_mes)

=======
>>>>>>> origin/main
        denuncias_atual, denuncias_anterior = _contagem_por_periodo(
            Report.objects.all(), 'created_at', inicio_atual, fim_atual, inicio_anterior,
        )
        cancelamentos_atual, cancelamentos_anterior = _contagem_por_periodo(
            Pagamento.objects.filter(tipo='assinatura', status='cancelado'),
            'criado_em', inicio_atual, fim_atual, inicio_anterior,
        )

        receita_assinatura_atual = Pagamento.objects.filter(
            tipo='assinatura', status='pago',
            aprovado_em__gte=inicio_atual, aprovado_em__lt=fim_atual,
        ).aggregate(total=Sum('valor'))['total'] or 0
        receita_assinatura_anterior = Pagamento.objects.filter(
            tipo='assinatura', status='pago',
            aprovado_em__gte=inicio_anterior,
            aprovado_em__lt=inicio_atual,
        ).aggregate(total=Sum('valor'))['total'] or 0

        receita_acordo_atual = Pagamento.objects.filter(
            tipo='acordo', status='pago',
            aprovado_em__gte=inicio_atual, aprovado_em__lt=fim_atual,
        ).aggregate(total=Sum('valor'))['total'] or 0
        receita_acordo_anterior = Pagamento.objects.filter(
            tipo='acordo', status='pago',
            aprovado_em__gte=inicio_anterior,
            aprovado_em__lt=inicio_atual,
        ).aggregate(total=Sum('valor'))['total'] or 0

        return Response({
            'periodo': {
                'chave': periodo,
                'label': _PERIODO_LABELS.get(periodo, periodo),
                'inicio': inicio_atual.date().isoformat(),
                # fim_atual é o limite exclusivo (__lt) usado nas queries; para exibir
                # a data "até" de forma inclusiva, mostramos o último instante contido.
                'fim': (fim_atual - timezone.timedelta(microseconds=1)).date().isoformat(),
            },
            'geral': {
                'usuarios': _item_contagem(usuarios_atual, usuarios_anterior),
                'freelancers': _item_contagem(freelancer_atual, freelancer_anterior),
                'contratantes': _item_contagem(contratante_atual, contratante_anterior),
                'freelas': {
                    **_item_contagem(freelas_atual, freelas_anterior),
                    'fecharam_acordo_periodo': pessoas_fecharam_acordo_periodo,
<<<<<<< HEAD
                    'fecharam_acordo_mes': pessoas_fecharam_acordo_mes,
=======
>>>>>>> origin/main
                },
                'denuncias': _item_contagem(denuncias_atual, denuncias_anterior),
                'cancelamentos_planos': _item_contagem(cancelamentos_atual, cancelamentos_anterior),
            },
            'denuncias': {
                'total': Report.objects.count(),
                'pendentes': Report.objects.filter(status='pending').count(),
                'procedentes': Report.objects.filter(status='procedente').count(),
                'improcedentes': Report.objects.filter(status='improcedente').count(),
            },
            'cancelamentos': {
                'total': SolicitacaoCancelamentoAcordo.objects.count(),
                'pendentes': SolicitacaoCancelamentoAcordo.objects.filter(status='pendente').count(),
                'aprovados': SolicitacaoCancelamentoAcordo.objects.filter(status='aprovada').count(),
                'recusados': SolicitacaoCancelamentoAcordo.objects.filter(status='recusada').count(),
            },
            'alteracoes': {
                'total': SolicitacaoAlteracaoAcordo.objects.count(),
                'pendentes': SolicitacaoAlteracaoAcordo.objects.filter(status='pendente').count(),
                'aprovadas': SolicitacaoAlteracaoAcordo.objects.filter(status='aprovada').count(),
                'recusadas': SolicitacaoAlteracaoAcordo.objects.filter(status='recusada').count(),
            },
            'planos': _distribuicao_planos(),
            'assinaturas_ativas': UserProfile.objects.exclude(
                subscription_plan='Gratuito',
            ).count(),
            'receita': {
                'assinatura': {
                    'atual': str(receita_assinatura_atual),
                    'anterior': str(receita_assinatura_anterior),
                    'variacao': _variacao(receita_assinatura_atual, receita_assinatura_anterior),
                },
                'acordo': {
                    'atual': str(receita_acordo_atual),
                    'anterior': str(receita_acordo_anterior),
                    'variacao': _variacao(receita_acordo_atual, receita_acordo_anterior),
                },
            },
            'anuncios': {
                'total': Ad.objects.filter(deletado=False).count(),
                'ativos': Ad.objects.filter(deletado=False, status_anuncio__isnull=True).count()
                          + Ad.objects.filter(deletado=False, status_anuncio='Ativo').count(),
                'finalizados': Ad.objects.filter(deletado=False, status_anuncio='Finalizado').count(),
            },
            'acordos': {
                'total': AcordoServico.objects.count(),
                'ativos': AcordoServico.objects.filter(status_acordo='Ativo').count(),
                'concluidos': AcordoServico.objects.filter(status_acordo='Concluído').count(),
                'cancelados': AcordoServico.objects.filter(status_acordo='Cancelado').count(),
                'pendentes_pagamento': AcordoServico.objects.filter(
                    status_acordo='Pendente Pagamento',
                ).count(),
            },
            'candidaturas': Candidatura.objects.count(),
            'avaliacoes': Avaliacao.objects.count(),
        })


def _item_contagem(atual, anterior):
    return {
        'total': atual,
        'atual': atual,
        'anterior': anterior,
        'variacao': _variacao(atual, anterior),
    }


def _distribuicao_planos():
    from django.db.models import Count

    contagem = (
        UserProfile.objects.values('subscription_plan')
        .annotate(total=Count('id'))
        .order_by('-total')
    )
    planos = [
        {'nome': item['subscription_plan'] or 'Gratuito', 'total': item['total']}
        for item in contagem
    ]
    for nome in ('Gratuito', 'Gold', 'Platinum'):
        if not any(p['nome'] == nome for p in planos):
            planos.append({'nome': nome, 'total': 0})
    return planos


### chat entre freelancer e contratante (mensagens no Postgres) ###
from django.db.models import Q as _Q
from .chat import (
    chat_ativo,
    enviar_mensagem,
    listar_mensagens,
    marcar_lidas,
    total_nao_lidas,
    partes_do_acordo as _partes_chat,
)
from .serializers import ChatConversaSerializer, _info_usuario_com_papel


def _acordo_do_chat(pk, user):
    """Retorna o acordo se o usuário participa dele (ou é moderador)."""
    from django.shortcuts import get_object_or_404

    acordo = get_object_or_404(
        AcordoServico.objects.select_related(
            'candidatura__user__profile',
            'candidatura__ad__author__profile',
        ),
        pk=pk,
    )
    contratante, freelancer = _partes_chat(acordo)
    if user.is_staff or user.is_superuser:
        return acordo
    if user not in {contratante, freelancer}:
        return None
    return acordo


class ChatListAPIView(APIView):
    """Lista as conversas (acordos) do usuário logado, restritas às partes."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.is_staff or user.is_superuser:
            acordos = AcordoServico.objects.all()
        else:
            acordos = AcordoServico.objects.filter(
                _Q(candidatura__user=user) | _Q(candidatura__ad__author=user)
            )
        acordos = acordos.select_related(
            'candidatura__user__profile',
            'candidatura__ad__author__profile',
        )
        dados = ChatConversaSerializer(
            acordos,
            many=True,
            context={'request': request},
        ).data

        def _chave_ordenacao(item):
            ultima = item.get('ultima_mensagem')
            if ultima and ultima.get('criado_em'):
                return ultima['criado_em']
            return item.get('data_confirmacao') or ''

        dados.sort(key=_chave_ordenacao, reverse=True)
        return Response(dados)


class ChatDetailAPIView(APIView):
    """Detalhe de uma conversa + histórico de mensagens (somente as partes)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        acordo = _acordo_do_chat(pk, request.user)
        if acordo is None:
            return Response(
                {'error': 'Você não participa deste acordo.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        request_user = request.user
        contratante, freelancer = _partes_chat(acordo)
        outra = freelancer if request_user == contratante else contratante
        papel = 'freelancer' if outra == freelancer else 'contratante'
        mensagens = listar_mensagens(acordo.id)
        return Response({
            'id': acordo.id,
            'titulo_anuncio': acordo.titulo_anuncio,
            'status_acordo': acordo.status_acordo,
            'valor_acordado': acordo.valor_acordado,
            'unidade_valor': acordo.unidade_valor,
            'data_confirmacao': acordo.data_confirmacao,
            'chat_ativo': chat_ativo(acordo),
            'outra_parte': _info_usuario_com_papel(outra, papel, request),
            'messages': mensagens,
        })


class ChatEnviarMensagemAPIView(APIView):
    """Envia uma mensagem no chat do acordo (somente se o chat estiver ativo)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        acordo = _acordo_do_chat(pk, request.user)
        if acordo is None:
            return Response(
                {'error': 'Você não participa deste acordo.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not chat_ativo(acordo):
            return Response(
                {'error': 'Este chat foi encerrado. O acordo não está mais em andamento.'},
                status=status.HTTP_409_CONFLICT,
            )
        texto = str(request.data.get('texto') or '').strip()
        if not texto:
            return Response(
                {'error': 'A mensagem não pode estar vazia.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(texto) > 2000:
            return Response(
                {'error': 'A mensagem deve ter no máximo 2000 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        mensagem = enviar_mensagem(acordo, request.user, texto)
        return Response(mensagem, status=status.HTTP_201_CREATED)


class ChatMarcarLidaAPIView(APIView):
    """Marca as mensagens do acordo como lidas para o usuário logado."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        acordo = _acordo_do_chat(pk, request.user)
        if acordo is None:
            return Response(
                {'error': 'Você não participa deste acordo.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        marcar_lidas(acordo.id, request.user.id)
        return Response({'ok': True})


class ChatNaoLidasAPIView(APIView):
    """Total de mensagens não lidas do usuário em todas as conversas."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.is_staff or user.is_superuser:
            acordos = AcordoServico.objects.all()
        else:
            acordos = AcordoServico.objects.filter(
                _Q(candidatura__user=user) | _Q(candidatura__ad__author=user)
            )
        total = total_nao_lidas(acordos.values_list('id', flat=True), user.id)
        return Response({'total': total})
