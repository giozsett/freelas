from django.urls import path
from .views import RegisterAPI, LoginAPI, UserAPI, UserProfileAPIView, ReportListCreateAPIView, ReportUpdateAPIView, AdListCreateAPIView, AdRetrieveAPIView

urlpatterns = [
    path('api/auth/register/', RegisterAPI.as_view(), name='register'),
    path('api/auth/login/', LoginAPI.as_view(), name='login'),
    path('api/auth/user/', UserAPI.as_view(), name='user'),
    path('api/auth/profile/', UserProfileAPIView.as_view(), name='profile'),
    path('api/reports/', ReportListCreateAPIView.as_view(), name='report-list'),
    path('api/reports/<int:pk>/', ReportUpdateAPIView.as_view(), name='report-detail'),
    path('api/ads/', AdListCreateAPIView.as_view(), name='ad-list'),
    path('api/ads/<int:pk>/', AdRetrieveAPIView.as_view(), name='ad-detail'),
]
