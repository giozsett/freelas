import time

from django.core.management.base import BaseCommand, CommandError

from core.busca_catalogo import indice


class Command(BaseCommand):
    help = (
        'Baixa o modelo de embeddings e vetoriza o catálogo de categorias e '
        'habilidades, para a primeira busca já sair semântica.'
    )

    def handle(self, *args, **options):
        inicio = time.monotonic()
        if not indice.carregar():
            raise CommandError(
                'Não foi possível carregar a busca semântica (veja o aviso acima). '
                'Confira se o fastembed está instalado: pip install -r requirements.txt'
            )
        exemplo = indice.buscar('cuidar do meu filho à noite', tipo='habilidade', limite=3)
        nomes = ', '.join(r['nome'] for r in exemplo['resultados'])
        self.stdout.write(self.style.SUCCESS(
            f'Busca semântica pronta em {time.monotonic() - inicio:.1f}s '
            f'({len(indice.itens)} itens). Exemplo "cuidar do meu filho à noite": {nomes}'
        ))
