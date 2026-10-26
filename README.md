# Freelas

Plataforma web que conecta **freelancers** a **pessoas e empresas** que querem contratá-los. Projeto acadêmico, desenvolvido por um grupo de três pessoas e executado apenas em ambiente local (Windows), sem deploy.

## Como funciona

1. O contratante (ou o freelancer) **publica um anúncio**.
2. Outros usuários **enviam candidatura** ao anúncio.
3. O autor do anúncio **aprova ou rejeita** cada candidatura.
4. Ao aprovar, é criado um **freela** em **Meus Freelas**. Ele é o acordo de serviço e tem um **chat em tempo real** entre as partes.
5. O pagamento do acordo é feito pelo Stripe (valor do anúncio + 10% de taxa da plataforma).
6. Quando o freela é concluído, **contratante e freelancer se avaliam mutuamente**.

Também existem: login com e-mail, Google e LinkedIn, perfis de freelancer e de empresa, planos Gold e Platinum (assinatura), notificações em tempo real, denúncias e painel de moderação.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, Vite 5, React Router 7, Lucide React, react-easy-crop, CSS puro (`src/index.css` e `src/App.css`) |
| Backend | Python 3.14, Django 6, Django REST Framework, django-allauth e dj-rest-auth (login social), django-cors-headers |
| Tempo real | Django Channels + Daphne (WebSocket) e **Redis Pub/Sub** (mensagens do chat) |
| Banco de dados | PostgreSQL hospedado no **Supabase** (só o banco; sem SDK do Supabase no frontend) |
| Pagamentos | **Stripe** (checkout, assinaturas e webhook) |
| Túnel público | **Ngrok** (expõe o backend para o Stripe entregar o webhook) |
| Mídia | Cloudinary (imagens) |
| Busca no catálogo | **fastembed** (modelo de embeddings multilíngue, roda localmente via ONNX). Veja [Busca no catálogo](#busca-no-catálogo-categorias-e-habilidades) |
| E-mail | SMTP do Gmail (validação de cadastro) |
| Qualidade | ESLint e `node --test` (frontend), `manage.py test` (backend) |

## Estrutura de pastas

```
freelas/
├── src/                 # Frontend (pages, components, context, hooks, utils, constants, data)
│   └── data/            # Catálogo de categorias e habilidades (usado também pelo backend)
├── backend/
│   ├── server/          # Configuração do Django (settings, urls, asgi)
│   ├── core/            # App principal (models, views, serializers, chat, consumers, routing, notificações)
│   └── .cache/          # Modelo e vetores da busca no catálogo (gerados localmente, fora do Git)
├── scripts/
│   └── dev-checkout.ps1 # Sobe todo o ambiente de desenvolvimento
├── tools/redis/         # Redis portátil para Windows (baixado automaticamente pelo script)
├── supabase-migration/  # Dump de schema e dados do banco
├── requirements.txt     # Dependências Python (único arquivo, na raiz)
├── package.json         # Dependências e scripts do frontend
└── STRIPE_TESTING.md    # Guia de teste dos pagamentos
```

---

## Instalação em um computador Windows novo

### 1. Instalar os programas

| Programa | Observação |
|---|---|
| [Git](https://git-scm.com/download/win) | |
| [Node.js](https://nodejs.org) (LTS ou superior) | Desenvolvido com Node 24. Já inclui o `npm`. |
| [Python 3.14](https://www.python.org/downloads/windows/) | Na instalação, marque **"Add python.exe to PATH"**. |
| [Ngrok](https://ngrok.com/download) | Crie uma conta gratuita e copie o *authtoken* em https://dashboard.ngrok.com/get-started/your-authtoken |
| [Stripe CLI](https://docs.stripe.com/stripe-cli) (opcional) | `winget install stripe.stripe-cli`. Recomendado para testar pagamentos. |

O **Redis não precisa ser instalado**: o script de execução baixa e inicia uma versão portátil em `tools\redis`.

Confira no PowerShell:

```powershell
git --version
node --version
python --version
ngrok version
```

### 2. Baixar o projeto

```powershell
git clone https://github.com/giozsett/freelas.git
cd freelas
git checkout giovana        # troque pelo nome da sua branch (main, ana, giovana, melissa)
```

### 3. Criar os arquivos `.env`

Os arquivos `.env` **não vão para o Git** (contêm chaves secretas). Peça os valores a alguém do grupo por um canal privado. Nunca envie chaves pelo repositório e não deixe senhas escritas em comentários do `.env`.

**`.env` na raiz** (usado pelo Vite):

```
VITE_GOOGLE_CLIENT_ID=
VITE_LINKEDIN_CLIENT_ID=
VITE_STRIPE_PUBLISHABLE_KEY=
```

**`backend\.env`** (usado pelo Django e pelo script):

```
DATABASE_URL=                 # string de conexão PostgreSQL do Supabase
DEBUG=True
ALLOWED_HOSTS=
FRONTEND_URL=http://localhost:5173
BACKEND_PUBLIC_URL=           # preenchido automaticamente pelo script (URL do Ngrok)
NGROK_AUTHTOKEN=              # o seu token pessoal do Ngrok

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

EMAIL_HOST_USER=              # conta Gmail usada para enviar e-mails
EMAIL_HOST_PASSWORD=          # senha de app do Gmail

STRIPE_SECRET_KEY=
STRIPE_PRICE_GOLD=
STRIPE_PRICE_PLATINUM=
STRIPE_WEBHOOK_SECRET=        # muda a cada `stripe listen` (veja STRIPE_TESTING.md)

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Opcionais: prazos do acordo em horas (padrão 72). Use valores curtos para demonstrar,
# ex.: 0.05 = 3 minutos.
PRAZO_PAGAMENTO_HORAS=
PRAZO_CONFIRMACAO_HORAS=

# Opcional: outro modelo do fastembed para a busca no catálogo
# (padrão sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)
BUSCA_CATALOGO_MODELO=
```

> Se `DATABASE_URL` ficar vazio, o Django usa um SQLite local (`db.sqlite3`). Para trabalhar no mesmo banco do grupo, use a URL do Supabase.

### 4. Instalar as dependências

Ambiente virtual e pacotes do Python (a partir da raiz do projeto):

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r ..\requirements.txt
cd ..
```

Pacotes do frontend (na raiz):

```powershell
npm install
```

> Se o PowerShell bloquear o `Activate.ps1`, execute uma vez:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

Prepare a busca no catálogo (baixa uma vez um modelo de cerca de 220 MB para `backend\.cache`):

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py preparar_busca_catalogo
cd ..
```

Sem esse passo o projeto funciona, mas a primeira busca dispara o download em segundo plano e, até ele terminar, as sugestões saem só pelo texto.

### 5. Aplicar as migrations do banco

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py migrate
cd ..
```

O banco do Supabase é **compartilhado pelo grupo**. Se outra pessoa já aplicou as migrations, o comando apenas informa que não há nada a aplicar.

---

## Antes de abrir o projeto

Rode esta sequência **sempre depois de um `git pull` ou de trocar de branch**. Todos os comandos podem ser repetidos sem risco: se não houver nada novo, eles só confirmam que está tudo em dia.

```powershell
# Na raiz do projeto
npm install

cd backend
.\venv\Scripts\Activate.ps1
pip install -r ..\requirements.txt
python manage.py makemigrations --check --dry-run   # 1. alguém alterou um model sem criar a migration?
python manage.py showmigrations core                # 2. lista as migrations; [ ] = ainda não aplicada
python manage.py migrate                            # 3. aplica as que faltam
cd ..
```

| Comando | Por que rodar |
|---|---|
| `npm install` | `package.json` ou `package-lock.json` mudaram |
| `pip install -r ..\requirements.txt` | `requirements.txt` mudou |
| `makemigrations --check --dry-run` | Deve responder `No changes detected`. Se listar mudanças, um model foi alterado sem migration: avise quem fez a alteração. |
| `showmigrations core` | Mostra o estado das migrations antes de aplicar |
| `migrate` | Novos arquivos em `backend\core\migrations\` |
| `python manage.py preparar_busca_catalogo` | Na primeira vez depois de instalar o `fastembed`, para baixar o modelo da busca no catálogo |
| Variáveis novas de `.env` | Peça os valores ao grupo e acrescente aos seus `.env` |

Se o `migrate` falhar com `Conflicting migrations detected`, veja [Conflitos de migration](#conflitos-de-migration).

---

## Executando o projeto

Na raiz do projeto:

```powershell
npm run dev:checkout
```

O script `scripts\dev-checkout.ps1` faz tudo na ordem:

1. Inicia o **Redis** na porta 6379 (baixa o portátil na primeira vez).
2. Abre o túnel **Ngrok** para a porta 8000 e grava a URL pública em `BACKEND_PUBLIC_URL`.
3. Inicia o **backend** (Django) e o **frontend** (Vite).

| Serviço | Endereço |
|---|---|
| Frontend | http://localhost:5173 |
| Backend (API) | http://localhost:8000 |
| Painel do Ngrok | http://127.0.0.1:4040 |

Para encerrar tudo, pressione `Ctrl+C` no terminal. Os logs ficam em `%TEMP%\freelas-ngrok`.

### Executando sem o script (4 terminais)

Útil se você não usa o Ngrok. Rode cada comando em um terminal, sempre a partir da raiz:

```powershell
# Terminal 1: Redis (o executável existe depois que o script rodou uma vez)
.\tools\redis\redis-server.exe --port 6379 --bind 127.0.0.1

# Terminal 2: backend
cd backend
.\venv\Scripts\Activate.ps1
python manage.py runserver

# Terminal 3: frontend
npm run dev

# Terminal 4 (só para testar pagamentos): Stripe CLI
stripe listen --forward-to localhost:8000/api/pagamentos/webhook/
```

O passo a passo completo dos pagamentos (variáveis, cartões de teste e problemas comuns) está em [`STRIPE_TESTING.md`](STRIPE_TESTING.md).

### Prazos dos acordos

Não há tarefa agendada: os prazos são aplicados sempre que alguém abre as telas de acordos, notificações ou o painel. Para aplicar na hora (por exemplo, durante a apresentação):

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py processar_prazos
```

- **Pagamento:** o contratante tem `PRAZO_PAGAMENTO_HORAS` para pagar depois da aprovação da candidatura. Se não pagar, o acordo é cancelado e a vaga volta a receber candidaturas.
- **Confirmação:** depois que o freelancer marca o serviço como entregue, o contratante tem `PRAZO_CONFIRMACAO_HORAS` para confirmar ou relatar um problema. Sem resposta, o acordo é concluído automaticamente.

### Dados de demonstração e verificação do banco

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py popular_demo            # recria as contas @demo.freelas.com (senha Freelas@2026)
python manage.py popular_demo --remover  # remove só os dados de demonstração
python manage.py verificar_dados         # lista dados fora das regras atuais, sem alterar nada
```

- `popular_demo` cria contratantes, freelancers, vagas e um acordo em cada etapa do ciclo. Só mexe nas contas `@demo.freelas.com`, então pode rodar no banco compartilhado; rode no dia da apresentação, porque os prazos contam a partir da criação.
- O roteiro da apresentação está em [`docs/roteiro-apresentacao.md`](docs/roteiro-apresentacao.md) e os textos e diagramas do relatório técnico em [`docs/rt-v06-secoes.md`](docs/rt-v06-secoes.md) e [`docs/rt-v06-diagramas.md`](docs/rt-v06-diagramas.md).

### Busca no catálogo (categorias e habilidades)

As vagas usam um catálogo fixo, de dois níveis: **categorias amplas** (ex.: "Cuidados Pessoais") e **habilidades** que as especificam (ex.: "Babá", "Manicure"). Os filtros da página inicial, o formulário de vaga e a validação do backend usam os mesmos arquivos:

| Arquivo | Conteúdo |
|---|---|
| `src/data/professional-options.json` | Categorias e as habilidades de cada uma. Uma habilidade pode aparecer em mais de uma categoria (ex.: "Garçom" em Gastronomia e em Eventos e Promoções). |
| `src/data/termos-habilidades.json` | Palavras que as pessoas digitam ao procurar uma habilidade (ex.: "Encanador" → "torneira vazando, cano, descarga"). Só a busca usa. |

A **busca semântica** (`backend/core/busca_catalogo.py`, rota `GET /api/catalogo/buscar/?q=...&tipo=habilidade|categoria&categoria=...`) entende o significado do texto: "cuidar do meu filho à noite" sugere "Babá Noturna", e "babá" no campo de categoria sugere "Cuidados Pessoais". Ela roda toda no computador, sem serviço na nuvem:

- O modelo `paraphrase-multilingual-MiniLM-L12-v2` (fastembed/ONNX, cerca de 220 MB) fica em `backend\.cache\busca_catalogo\modelos`.
- Cada categoria e habilidade vira um vetor uma vez; os vetores ficam em `backend\.cache\busca_catalogo` e são refeitos sozinhos quando o catálogo, os termos ou o modelo mudam. O catálogo cabe na memória, então não há banco vetorial: a comparação leva milissegundos.
- A nota final soma a semelhança do modelo com um bônus para cada palavra digitada que aparece no texto da habilidade. Sem esse bônus, o modelo pequeno erra pedidos como "trocar o chuveiro".
- Enquanto o modelo carrega, ou se o `fastembed` não estiver instalado, a busca responde só pelo texto.
- Para testar outro modelo do fastembed, defina `BUSCA_CATALOGO_MODELO` no `backend\.env` e rode `python manage.py preparar_busca_catalogo`.

A pesquisa de anúncios da página inicial usa as mesmas sugestões: o anúncio aparece se tiver todas as palavras digitadas (título, descrição, categoria ou habilidades) ou se pedir uma das habilidades sugeridas.

**Para alterar o catálogo:**

- **Acrescentar** uma categoria ou habilidade: edite o JSON. Nada mais é necessário.
- **Melhorar a busca** de uma habilidade: acrescente termos em `termos-habilidades.json`. As chaves precisam existir no catálogo (um teste confere).
- **Renomear ou remover** uma categoria ou habilidade: anúncios e perfis guardam os nomes como texto, então crie também uma migration de dados que troque o nome antigo pelo novo, como a `0049_categorias_amplas`. Sem isso, as vagas antigas somem dos filtros e não podem ser editadas sem trocar a categoria.

### Testes e lint

```powershell
npm test                          # frontend
npm run lint                      # frontend

cd backend
.\venv\Scripts\Activate.ps1
python manage.py test --keepdb    # backend (leva cerca de 7 minutos)
python manage.py test core.tests.CandidaturaDuplicadaTests --keepdb   # só uma classe de testes
```

Os testes do backend **precisam do PostgreSQL**: as migrations usam SQL específico do Postgres, então o SQLite não serve. O Django cria um banco `test_postgres` no Supabase.

Use sempre `--keepdb`. Pela porta 6543 (pooler do Supabase), a conexão continua aberta por alguns instantes depois dos testes, e o Django não consegue apagar o banco de teste no final. Sem `--keepdb`, a próxima execução encontra o banco antigo e para com a pergunta `Type 'yes' if you would like to try deleting the test database`. Com `--keepdb`, o banco de teste é reaproveitado e só recebe as migrations novas.

---

## Atualizando o projeto (`git pull`)

### Rotina do dia a dia

```powershell
# 1. Veja em que branch você está e o que mudou
git status

# 2. Guarde o seu trabalho antes de puxar (escolha UMA das opções)
git add .
git commit -m "descrição do que você fez"     # opção A: commitar
git stash                                       # opção B: guardar sem commitar (recupere com `git stash pop`)

# 3. Traga as novidades da sua branch
git pull origin giovana                         # troque pelo nome da sua branch

# 4. Traga também o que o grupo integrou na main
git pull origin main

# 5. Envie o seu trabalho
git push origin giovana
```

### Depois do `git pull`: o que rodar

Rode a sequência de [Antes de abrir o projeto](#antes-de-abrir-o-projeto).

Para ver o que veio no pull:

```powershell
git diff --stat ORIG_HEAD HEAD
```

### Conflitos de merge

Se o `git pull` avisar de conflito:

1. Rode `git status` para ver os arquivos em conflito.
2. Abra cada arquivo e resolva os trechos entre `<<<<<<<`, `=======` e `>>>>>>>`, mantendo o código correto.
3. Finalize com `git add <arquivo>` e `git commit`.

### Conflitos de migration

Acontecem quando duas pessoas criam migrations com o mesmo número em branches diferentes (por exemplo, duas `0048_...` partindo da `0047`). O Git não acusa conflito, porque os nomes dos arquivos são diferentes, mas o Django recusa o `migrate`:

```
CommandError: Conflicting migrations detected; multiple leaf nodes in the migration graph
```

Para resolver, depois de juntar as branches:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py makemigrations --merge   # cria uma migration que junta as duas
python manage.py migrate
```

Faça o commit da migration de merge e avise o grupo.

**Como o banco é compartilhado, aplique uma migration no Supabase só depois de enviá-la ao GitHub** (`git push`). Uma migration aplicada a partir de código que não está em nenhuma branch fica registrada no banco sem que o resto do grupo tenha o arquivo, e ninguém consegue reproduzir nem desfazer a mudança. Para conferir o que já foi aplicado no banco:

```powershell
python manage.py showmigrations core
```

---

## Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `ngrok nao foi encontrado` | O Ngrok não está instalado ou não está no PATH. Instale e reabra o terminal. |
| `Preencha NGROK_AUTHTOKEN no arquivo backend/.env` | Cadastre o seu token do Ngrok em `backend\.env`. |
| `O ambiente virtual nao foi encontrado` | Crie o venv em `backend\venv` (passo 4). |
| `Activate.ps1 ... execução de scripts foi desabilitada` | Rode `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`. |
| Chat não conecta | O Redis não está rodando na porta 6379. Use `npm run dev:checkout` ou inicie o Redis manualmente. |
| `Signature verification failed` (Stripe) | O `STRIPE_WEBHOOK_SECRET` está desatualizado. Veja `STRIPE_TESTING.md`. |
| Pagamento fica pendente | O `stripe listen` não está rodando durante o pagamento. |
| Erro de CORS no navegador | Acesse o frontend por `http://localhost:5173` ou `http://127.0.0.1:5173`. |
| `ModuleNotFoundError: No module named 'django'` | O venv não está ativo. Rode `.\venv\Scripts\Activate.ps1` dentro de `backend`. |
| `Type 'yes' if you would like to try deleting the test database` | Sobrou um banco de teste de uma execução anterior. Rode os testes com `--keepdb` (veja [Testes e lint](#testes-e-lint)). |
| `database "test_..." is being accessed by other users` | O pooler do Supabase ainda segura a conexão no fim dos testes. Use `--keepdb`; os resultados dos testes aparecem antes desse erro. |
| `Conflicting migrations detected` | Duas migrations com o mesmo número. Veja [Conflitos de migration](#conflitos-de-migration). |
| Sugestões de categoria/habilidade só aparecem quando o texto bate | A busca semântica ainda está carregando ou falhou. Rode `python manage.py preparar_busca_catalogo` e leia a mensagem. |
| `To support symlinks on Windows, you either need to activate Developer Mode` | Aviso do download do modelo; pode ser ignorado. O modelo funciona sem symlinks. |
