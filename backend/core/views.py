import email
from rest_framework import generics, permissions, parsers
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from rest_framework.views import APIView
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


class ReportListCreateAPIView(generics.ListCreateAPIView):
    queryset = Report.objects.all().order_by('-created_at')
    serializer_class = ReportSerializer
    permission_classes = [permissions.AllowAny] # Using AllowAny for now since frontend mock might not send auth tokens yet

class ReportUpdateAPIView(generics.UpdateAPIView):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.AllowAny]


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
        queryset = Candidatura.objects.all().order_by('-enviado_em')
        user_id = self.request.query_params.get('user_id')
        ad_id = self.request.query_params.get('ad_id')
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if ad_id:
            queryset = queryset.filter(anuncio_id=ad_id)
            
        return queryset

    def perform_create(self, serializer):
        try:
            usuario_id = self.request.user.profile.id
        except Exception:
            usuario_id = self.request.user.id
        serializer.save(user=self.request.user, usuario_id=usuario_id)

class CandidaturaUpdateAPIView(generics.UpdateAPIView):
    queryset = Candidatura.objects.all()
    serializer_class = CandidaturaSerializer
    permission_classes = [permissions.IsAuthenticated]

class CandidaturaRetrieveAPIView(generics.RetrieveAPIView):
    queryset = Candidatura.objects.all()
    serializer_class = CandidaturaSerializer
    permission_classes = [permissions.IsAuthenticated]


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

        return queryset

class AcordoServicoRetrieveUpdateAPIView(generics.RetrieveUpdateAPIView):
    queryset = AcordoServico.objects.all()
    serializer_class = AcordoServicoSerializer
    permission_classes = [permissions.IsAuthenticated]