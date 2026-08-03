from django.contrib import admin
from .models import (
    AcordoServico,
    SolicitacaoAlteracaoAcordo,
    SolicitacaoCancelamentoAcordo,
)


@admin.register(AcordoServico)
class AcordoServicoAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'titulo_anuncio', 'nome_contratante', 'nome_prestador',
        'status_acordo', 'data_confirmacao',
    )
    list_filter = ('status_acordo',)
    search_fields = ('titulo_anuncio', 'nome_contratante', 'nome_prestador')
    list_per_page = 25


@admin.register(SolicitacaoCancelamentoAcordo)
class SolicitacaoCancelamentoAcordoAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'acordo', 'solicitante', 'papel_solicitante',
        'status', 'criado_em', 'analisado_em',
    )
    list_filter = ('status', 'papel_solicitante')
    search_fields = (
        'acordo__titulo_anuncio', 'solicitante__username',
        'justificativa', 'resposta_admin',
    )
    readonly_fields = ('criado_em', 'analisado_em')
    list_per_page = 25


@admin.register(SolicitacaoAlteracaoAcordo)
class SolicitacaoAlteracaoAcordoAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'acordo', 'solicitante', 'papel_solicitante',
        'status', 'criado_em', 'decidido_em',
    )
    list_filter = ('status', 'papel_solicitante')
    search_fields = (
        'acordo__titulo_anuncio', 'solicitante__username', 'justificativa',
    )
    readonly_fields = ('criado_em', 'decidido_em')
    list_per_page = 25
