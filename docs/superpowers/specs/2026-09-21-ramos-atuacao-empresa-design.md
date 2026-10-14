# Ramos de atuação da empresa — design

Data: 2026-09-21 · Branch: `giovana`

## Atualização (implementação)

Pedido posterior à spec, que prevalece sobre o texto abaixo onde houver conflito:

- **Máximo de 3 ramos** (não 5). O limite está em `ramos-empresa.json` (`maxSelecionados`) e no serializer (`MAX_RAMOS_ATUACAO`).
- **Sem texto livre no cadastro.** O usuário digita, mas o campo só filtra a lista: é preciso escolher ramos do `src/data/ramos-empresa.json`.
- **`ramo_empresa` passa a ser derivado:** o serializer grava os ramos escolhidos unidos por vírgula. Assim `Perfil.jsx`, `PerfilPublico.jsx` e a validação existente seguem funcionando sem mudança. Lista vazia não apaga o texto antigo.
- **Chips nos perfis ficaram de fora:** os perfis continuam mostrando o texto derivado. Pode entrar junto com o filtro da tela inicial.
- **`Configuracoes.jsx` também usa o seletor** (exige ao menos 1 ramo ao salvar), para não sobrescrever o texto derivado com texto livre.

## Objetivo

Empresas (contratantes com CNPJ) passam a informar **vários ramos de atuação**, escolhidos de uma lista fixa, além do texto livre atual. O dado será usado depois para o freelancer filtrar anúncios pelo setor da empresa contratante.

## Decisões já tomadas

- **Abordagem C:** lista fixa nova de ramos (JSON no front) + `JSONField` no `UserProfile`, no mesmo padrão de `categories` e `skills`. Sem tabela nova.
- **Fonte única:** os ramos ficam no perfil da empresa. O anúncio não guarda ramo próprio; ele herdará do autor.
- **`ramo_empresa` (texto livre) continua**, obrigatório, como descrição do ramo (ex.: "Clínica odontológica"). Quem alimentará o filtro é o novo campo.
- **Não é o `category` do anúncio.** `category`/`skills` do anúncio são o serviço procurado; o ramo é o setor da empresa. São eixos independentes.

## Escopo desta entrega

Dentro:

1. Model, migration e serializer do perfil.
2. Lista fixa de ramos.
3. Componente de seleção (texto em cima, chips com busca embaixo).
4. Onboarding (`CriarPerfilEmpresa.jsx`) e edição (`Configuracoes.jsx`).
5. Exibição nos perfis (`Perfil.jsx`, `PerfilPublico.jsx`).

Fora (você avalia depois de ver o resultado):

- Filtro "Ramo da empresa" na sidebar de `Inicio.jsx`.
- Chip de ramo no `CardAnuncio.jsx`.
- `author_ramos` no `AdSerializer`.
- Aba/listagem de empresas e ramo por anúncio.

O dado nasce pronto para esses itens: basta o `AdSerializer` expor `author.profile.ramos_atuacao` e o `Inicio.jsx` filtrar no cliente, como já faz com categoria e habilidade.

## Dados

`UserProfile.ramos_atuacao = models.JSONField(blank=True, default=list)`, lista de strings (nomes dos ramos), igual a `categories`/`skills`. Migration nova depois da `0041_merge_20260921_1042`.

Lista em `src/data/ramos-empresa.json`, com um módulo de acesso em `src/constants/options.js` (`RAMOS_EMPRESA`), no formato do `professional-options.json`. Proposta inicial (ajustável):

Saúde e Bem-estar · Educação · Tecnologia e Software · Varejo e Comércio · Alimentação e Restaurantes · Construção e Engenharia · Indústria · Serviços Financeiros · Jurídico e Contabilidade · Marketing e Publicidade · Mídia e Comunicação · Eventos e Entretenimento · Turismo e Hospedagem · Transporte e Logística · Imobiliário · Agronegócio · Beleza e Estética · Moda e Vestuário · Automotivo · Energia e Sustentabilidade · Pet e Veterinário · ONGs e Terceiro Setor · Setor Público · Outros

## Backend (`backend/core/serializers.py`)

- Adicionar `ramos_atuacao` em `UserProfileSerializer.Meta.fields`.
- No `update`, incluir `ramos_atuacao` na lista que já faz `json.loads` de `categories`/`skills` (caso venha como string em multipart).
- Validação de formato: lista de strings, sem repetição, no máximo 5, cada item com até 60 caracteres. **Não** valida pertencimento à lista: `categories`/`skills` também não validam, e o backend não importa o JSON do front. A lista fixa é garantida pelo componente de seleção.
- O mínimo de 1 ramo **não** é exigido no backend. Exigir no `validate` quebraria a troca de papel de empresas legadas (`papel: 'empresa'` reenviado por `handleMudarPapel`) que ainda não têm ramos. O mínimo é imposto nos formulários (ver abaixo).

## Frontend

**Componente novo `src/components/SeletorRamos.jsx`** (props: `valor`, `onChange`, máximo 5). Campo de busca, sugestões filtradas da lista `RAMOS_EMPRESA`, chips dos selecionados com remoção, aviso ao atingir o limite. Reaproveita o estilo dos chips de habilidades de `EditarPerfil.jsx` e o `ComboFiltro` de `Inicio.jsx` como referência de busca.

**`CriarPerfilEmpresa.jsx`:** no passo 2, o campo de texto "Ramo / segmento" permanece; abaixo dele entra `SeletorRamos`. `conferirForm` exige ao menos 1 ramo. O payload envia `ramos_atuacao`. A revisão (passo 3) lista os ramos escolhidos.

**`Configuracoes.jsx`:** `dadosEmpresa` ganha `ramos_atuacao`; mesmo componente; `salvarDadosEmpresa` exige ao menos 1 ramo antes de enviar. Empresas legadas abrem com a lista vazia e, ao salvar, precisam escolher.

**`Perfil.jsx` e `PerfilPublico.jsx`:** leem `ramos_atuacao`. Onde hoje aparece só o texto de `ramo_empresa`, mostram o texto e, abaixo, os ramos como chips (mesmo estilo de "Categorias de Atuação").

## Empresas já cadastradas

Têm `ramo_empresa` mas `ramos_atuacao` vazio. Não há conversão automática do texto livre. Elas só entrarão no futuro filtro depois de escolherem os ramos em Configurações. Aviso opcional: se `ramos_atuacao` estiver vazio, `Configuracoes.jsx` mostra uma nota curta pedindo a escolha.

## Testes

- Backend (`backend/core/tests.py`): PATCH aceita lista válida; rejeita mais de 5, repetidos, item que não é string e item com mais de 60 caracteres; aceita `ramos_atuacao` como string JSON; não altera `ramos_atuacao` em PATCH que não o envia.
- Frontend: sem testes de componente no projeto hoje (só `validacaoSenha.test.js`); verificação manual do fluxo de onboarding e de Configurações.

## Riscos

- Sem validação de pertencimento no backend, um cliente não oficial pode gravar um ramo fora da lista. Impacto: só o filtro futuro; o padrão já existe em `skills`.
- Lista de ramos pode precisar de ajustes de negócio; trocar nomes depois exige migrar dados já gravados (os valores são os próprios nomes).
