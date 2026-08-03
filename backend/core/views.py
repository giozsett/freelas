import email
from django.conf import settings
from rest_framework import generics, permissions, parsers
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
from django.contrib.auth.models import User
from .serializers import UserSerializer, RegisterSerializer
from google.oauth2 import id_token
import os
from google.auth.transport import requests as google_requests
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
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


class RegisterAPI(generics.GenericAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        # Cria o UserProfile imediatamente no cadastro comum
        UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'nome_completo': f"{user.first_name} {user.last_name}".strip() or user.username,
                'email': user.email,
            }
        )
        return Response({
            "user": UserSerializer(user, context=self.get_serializer_context()).data,
            "token": token.key
        })

class LoginAPI(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(username=username, password=password)
        if user:
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
        queryset = Report.objects.all().order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        valid_statuses = {choice[0] for choice in Report.STATUS_CHOICES}
        if status_filter in valid_statuses:
            queryset = queryset.filter(status=status_filter)
        return queryset

    def perform_create(self, serializer):
        # Uma denúncia nova nunca pode chegar do cliente já julgada.
        serializer.save(status='pending')

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


class AdListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = AdSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Ad.objects.exclude(deletado=True).order_by('-created_at')
        all_ads = self.request.query_params.get('all', 'false').lower() == 'true'
        if not all_ads:
            from django.db.models import Q
            # Only show ads that are open (status is NULL, empty, 'Em aberto', or 'Ativo')
            queryset = queryset.filter(Q(status_anuncio__isnull=True) | Q(status_anuncio='') | Q(status_anuncio='Em aberto') | Q(status_anuncio='Ativo'))
        return queryset

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class AdRetrieveAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Ad.objects.exclude(deletado=True)
    serializer_class = AdSerializer

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
        if ad.status_anuncio == 'Finalizado' or ad.candidaturas.filter(status='aprovada').exists():
            raise ValidationError('Este anúncio já possui uma candidatura aprovada.')
        if ad.candidaturas.filter(user=self.request.user).exists():
            raise ValidationError('Você já se candidatou a este anúncio.')

        try:
            usuario_id = self.request.user.profile.id
        except Exception:
            usuario_id = self.request.user.id
        serializer.save(
            user=self.request.user,
            usuario_id=usuario_id,
            status='pendente',
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
            candidatura = get_object_or_404(
                self.get_queryset().select_for_update(),
                pk=kwargs['pk'],
            )
            Ad.objects.select_for_update().get(pk=candidatura.ad_id)

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

        return Response(self.get_serializer(candidatura).data)

class CandidaturaRetrieveAPIView(generics.RetrieveAPIView):
    serializer_class = CandidaturaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from django.db.models import Q
        return Candidatura.objects.filter(
            Q(user=self.request.user) | Q(ad__author=self.request.user)
        )


### autenticação com conta google ###
class GoogleSocialLoginAPI(APIView):
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
            user = User.objects.create_user(
                username=email,
                email=email,
                first_name=first_name,
                last_name=last_name,
            )

            auth_token, _ = Token.objects.get_or_create(user=user)

            return Response({
                'token': auth_token.key,
                'user': UserSerializer(user).data,
            })

        except ValueError:
            return Response({'error': 'Token inválido'}, status=status.HTTP_400_BAD_REQUEST)
        

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
        queryset = SolicitacaoCancelamentoAcordo.objects.select_related(
            'acordo',
            'solicitante',
            'analisado_por',
        ).order_by('-criado_em')
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
        queryset = SolicitacaoAlteracaoAcordo.objects.select_related(
            'acordo',
            'solicitante',
            'decidido_por',
        ).order_by('-criado_em')
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
                return Response(
                    {'error': 'O pagamento precisa estar aprovado antes da conclusão.'},
                    status=status.HTTP_409_CONFLICT,
                )

            acordo.status_acordo = 'Concluído'
            acordo.concluido_em = timezone.now()
            acordo.save(update_fields=['status_acordo', 'concluido_em'])

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
            elif pagamento.tipo == 'acordo' and pagamento.acordo:
                if pagamento.acordo.status_acordo != 'Cancelado':
                    pagamento.acordo.status_acordo = 'Ativo'
                    pagamento.acordo.save(update_fields=['status_acordo'])
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
            return Response({
                'checkout_required': True,
                'init_point': pending_payment.checkout_url,
                'reference': pending_payment.referencia_externa,
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
