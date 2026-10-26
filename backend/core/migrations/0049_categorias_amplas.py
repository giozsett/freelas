from django.db import migrations

# O catálogo (src/data/professional-options.json) passou de 35 categorias,
# várias estreitas ou repetidas, para categorias amplas. Cada categoria nova
# reúne todas as habilidades das antigas que absorveu, então só os nomes de
# categoria mudam: as habilidades gravadas continuam válidas.
CATEGORIA_NOVA = {
    'Desenvolvimento Web': 'Tecnologia',
    'Desenvolvimento Mobile': 'Tecnologia',
    'Dados e Inteligência Artificial': 'Tecnologia',
    'Infraestrutura e DevOps': 'Tecnologia',
    'Design Gráfico': 'Design',
    'UI/UX e Produto': 'Design',
    'Marketing Digital': 'Marketing e Redes Sociais',
    'Redes Sociais': 'Marketing e Redes Sociais',
    'Edição de Vídeo': 'Vídeo, Áudio e Fotografia',
    'Atendimento ao Cliente': 'Vendas e Atendimento',
    'Administração e Finanças': 'Negócios e Administração',
    'Suporte Administrativo': 'Negócios e Administração',
    'Gestão de Projetos': 'Negócios e Administração',
    'Consultoria': 'Negócios e Administração',
    'Recursos Humanos': 'Negócios e Administração',
    'Jurídico': 'Negócios e Administração',
    'Cuidados com Crianças e Idosos': 'Cuidados Pessoais',
    'Saúde e Bem-estar': 'Cuidados Pessoais',
    'Beleza e Cuidados Pessoais': 'Cuidados Pessoais',
    'Serviços Domésticos': 'Casa e Manutenção',
    'Manutenção e Reparos': 'Casa e Manutenção',
    'Cozinha e Alimentação': 'Gastronomia',
    'Eventos e Gastronomia': 'Eventos e Promoções',
    'Festas e Recreação': 'Eventos e Promoções',
    'Trabalhos Temporários e Promocionais': 'Eventos e Promoções',
    'Transporte e Logística': 'Transporte e Serviços Gerais',
    'Serviços Gerais': 'Transporte e Serviços Gerais',
}


def _renomear_lista(valores):
    """Troca os nomes antigos e remove as repetições que a fusão criou."""
    if not isinstance(valores, list):
        return valores
    novos = []
    for valor in valores:
        valor = CATEGORIA_NOVA.get(valor, valor)
        if valor not in novos:
            novos.append(valor)
    return novos


def migrar_categorias(apps, schema_editor):
    Ad = apps.get_model('core', 'Ad')
    UserProfile = apps.get_model('core', 'UserProfile')

    for antiga, nova in CATEGORIA_NOVA.items():
        Ad.objects.filter(category=antiga).update(category=nova)

    for perfil in UserProfile.objects.all().only('id', 'categories', 'servicos_contratados'):
        categorias = _renomear_lista(perfil.categories)
        servicos = _renomear_lista(perfil.servicos_contratados)
        if categorias != perfil.categories or servicos != perfil.servicos_contratados:
            perfil.categories = categorias
            perfil.servicos_contratados = servicos
            perfil.save(update_fields=['categories', 'servicos_contratados'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0048_candidatura_ativa_unica'),
    ]

    operations = [
        # Sem volta: depois da fusão não dá para saber qual era a categoria antiga
        migrations.RunPython(migrar_categorias, migrations.RunPython.noop),
    ]
