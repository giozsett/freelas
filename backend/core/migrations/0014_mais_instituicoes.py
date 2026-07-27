from django.db import migrations


INSTITUICOES = [
    "Centro Universitário Auxilium Unisalesiano",
    "Centro Universitário Barão de Mauá",
    "Centro Universitário Católico Salesiano Auxilium (Unisalesiano)",
    "Centro Universitário Claretiano",
    "Centro Universitário de Araraquara (UNIARA)",
    "Centro Universitário de Bauru (ITE)",
    "Centro Universitário de Belo Horizonte (UNIBH)",
    "Centro Universitário de Brasília (UNICEUB)",
    "Centro Universitário de Franca (UNIFRAN)",
    "Centro Universitário de Itajubá (FEPI)",
    "Centro Universitário de Jacarezinho",
    "Centro Universitário de João Pessoa (UNIPÊ)",
    "Centro Universitário de Lavras (UNILAVRAS)",
    "Centro Universitário de Lins (UNILINS)",
    "Centro Universitário de Maringá (UNICESUMAR)",
    "Centro Universitário de Patos de Minas (UNIPAM)",
    "Centro Universitário de Rio Preto (UNIRP)",
    "Centro Universitário de Sete Lagoas (UNIFEMM)",
    "Centro Universitário de São João da Boa Vista (UNIFAE)",
    "Centro Universitário de Várzea Grande (UNIVAG)",
    "Centro Universitário de Volta Redonda (UNIFOA)",
    "Centro Universitário do Distrito Federal (UDF)",
    "Centro Universitário do Pará (CESUPA)",
    "Centro Universitário do Planalto Central Apparecido dos Santos (UNICEPLAC)",
    "Centro Universitário do Sul de Minas (UNIS-MG)",
    "Centro Universitário dos Guararapes (UNIFG)",
    "Centro Universitário Estácio de Sá",
    "Centro Universitário Eurípides de Marília (UNIVEM)",
    "Centro Universitário FAMESP",
    "Centro Universitário FECAP",
    "Centro Universitário FIEO (UNIFIEO)",
    "Centro Universitário Filadélfia (UNIFIL)",
    "Centro Universitário FMU",
    "Centro Universitário Franciscano (UNIFRA)",
    "Centro Universitário Hermínio Ometto (UNIARARAS)",
    "Centro Universitário INTA (UNINTA)",
    "Centro Universitário Internacional (UNINTER)",
    "Centro Universitário Jorge Amado (UNIJORGE)",
    "Centro Universitário La Salle (UNILASALLE)",
    "Centro Universitário Leonardo da Vinci (UNIASSELVI)",
    "Centro Universitário Lusíada (UNILUS)",
    "Centro Universitário Matéria Prima (UNIMATPRIM)",
    "Centro Universitário Maurício de Nassau (UNINASSAU)",
    "Centro Universitário Metodista Izabela Hendrix",
    "Centro Universitário Metropolitano de São Paulo (UNIMESP)",
    "Centro Universitário Monte Serrat (UNIMONTE)",
    "Centro Universitário Nossa Senhora do Patrocínio (CEUNSP)",
    "Centro Universitário deExcelência (UNEX)",
    "Centro Universitário Padre Anchieta (UNIANCHIETA)",
    "Centro Universitário Planalto do Distrito Federal (UNIPLAN)",
    "Centro Universitário Presidente Antônio Carlos (UNIPAC)",
    "Centro Universitário Ritter dos Reis (UNIRITTER)",
    "Centro Universitário Salesiano de São Paulo (UNISAL)",
    "Centro Universitário São Camilo",
    "Centro Universitário São Judas Tadeu",
    "Centro Universitário Senac",
    "Centro Universitário Serra dos Órgãos (UNIFESO)",
    "Centro Universitário Toledo (UNITOLEDO)",
    "Centro Universitário UNA",
    "Centro Universitário Univates",
    "Centro Universitário Vale do Cricaré (UNIVC)",
    "UNISALESIANO - Centro Universitário Católico Salesiano Auxilium",
    "Universidade Anhembi Morumbi",
    "Universidade Cruzeiro do Sul (UNICSUL)",
    "Universidade de Mogi das Cruzes (UMC)",
    "Universidade de Santo Amaro (UNISA)",
    "Universidade de São Paulo (USP)",
    "Universidade do Grande ABC (UNIABC)",
    "Universidade Guarulhos (UNG)",
    "Universidade Metodista de São Paulo",
    "Universidade Nove de Julho (UNINOVE)",
    "Universidade Paulista (UNIP)",
    "Universidade Presbiteriana Mackenzie",
    "Universidade São Francisco (USF)",
    "Universidade São Judas Tadeu",
    "Universidade Virtual do Estado de São Paulo (UNIVESP)",
]


def add_instituicoes(apps, schema_editor):
    InstituicaoEnsino = apps.get_model('core', 'InstituicaoEnsino')
    for nome in INSTITUICOES:
        InstituicaoEnsino.objects.get_or_create(nome=nome, defaults={'verificado': True})


def reverse(apps, schema_editor):
    InstituicaoEnsino = apps.get_model('core', 'InstituicaoEnsino')
    InstituicaoEnsino.objects.filter(nome__in=INSTITUICOES).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_instituicoes_ensino_seed'),
    ]

    operations = [
        migrations.RunPython(add_instituicoes, reverse),
    ]
