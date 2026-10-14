from django.core.management.base import BaseCommand

from core.ciclo_acordo import processar_prazos


class Command(BaseCommand):
    help = (
        'Cancela acordos com prazo de pagamento vencido e conclui os que '
        'passaram do prazo de confirmação (útil para demonstrar os prazos).'
    )

    def handle(self, *args, **options):
        resultado = processar_prazos()
        self.stdout.write(self.style.SUCCESS(
            f"Pagamentos expirados: {resultado['pagamentos_expirados']} | "
            f"Concluídos automaticamente: {resultado['concluidos_automaticamente']}"
        ))
