from django.urls import path
from .views import EnviarCodigoVerificacaoAPI, RegisterAPI, LoginAPI, UserAPI, UserProfileAPIView, ReportListCreateAPIView, ReportUpdateAPIView, AdListCreateAPIView, AdRetrieveAPIView, PublicProfileAPIView, CandidaturaListCreateAPIView, CandidaturaUpdateAPIView, CandidaturaRetrieveAPIView, GoogleSocialLoginAPI, GoogleSocialLoginAPI, GoogleSocialRegisterAPI, VerificarCodigoAPI
from .views import RegisterAPI, LoginAPI, UserAPI, UserProfileAPIView, ReportListCreateAPIView, ReportUpdateAPIView, AdListCreateAPIView, AdRetrieveAPIView, PublicProfileAPIView, CandidaturaListCreateAPIView, CandidaturaUpdateAPIView, CandidaturaRetrieveAPIView, GoogleSocialLoginAPI, GoogleSocialRegisterAPI, EnviarCodigoVerificacaoAPI, VerificarCodigoAPI, RedefinicaoSenhaAPI, RedefinirSenhaAPI

urlpatterns = [
    path('api/auth/register/', RegisterAPI.as_view(), name='register'),
    path('api/auth/login/', LoginAPI.as_view(), name='login'),
    path('api/auth/user/', UserAPI.as_view(), name='user'),
    path('api/auth/profile/', UserProfileAPIView.as_view(), name='profile'),
    path('api/reports/', ReportListCreateAPIView.as_view(), name='report-list'),
    path('api/reports/<int:pk>/', ReportUpdateAPIView.as_view(), name='report-detail'),
    path('api/ads/', AdListCreateAPIView.as_view(), name='ad-list'),
    path('api/ads/<int:pk>/', AdRetrieveAPIView.as_view(), name='ad-detail'),
    path('api/users/<int:pk>/', PublicProfileAPIView.as_view(), name='public-profile'),
    path('api/candidaturas/', CandidaturaListCreateAPIView.as_view(), name='candidatura-list'),
    path('api/candidaturas/<int:pk>/', CandidaturaUpdateAPIView.as_view(), name='candidatura-detail'),
    path('api/auth/google/', GoogleSocialLoginAPI.as_view(), name='google-login'),
    path('api/auth/google/register/', GoogleSocialRegisterAPI.as_view(), name='google-register'),
    path('api/auth/enviar-codigo/', EnviarCodigoVerificacaoAPI.as_view(), name='enviar-codigo'),
    path('api/auth/verificar-codigo/', VerificarCodigoAPI.as_view(), name='verificar-codigo'),
    path('api/auth/solicitar-redefinicao/', RedefinicaoSenhaAPI.as_view(), name='solicitar-redefinicao'),
    path('api/auth/redefinir-senha/', RedefinirSenhaAPI.as_view(), name='redefinir-senha'),
]