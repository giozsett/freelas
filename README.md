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
| E-mail | SMTP do Gmail (validação de cadastro) |
| Qualidade | ESLint e `node --test` (frontend), `manage.py test` (backend) |

## Estrutura de pastas

```
freelas/
├── src/                 # Frontend (pages, components, context, hooks, utils, constants, data)
├── backend/
│   ├── server/          # Configuração do Django (settings, urls, asgi)
│   └── core/            # App principal (models, views, serializers, chat, consumers, routing, notificações)
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

### 5. Aplicar as migrations do banco

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py migrate
cd ..
```

O banco do Supabase é **compartilhado pelo grupo**. Se outra pessoa já aplicou as migrations, o comando apenas informa que não há nada a aplicar.

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

### Testes e lint

```powershell
npm test                          # frontend
npm run lint                      # frontend

cd backend
.\venv\Scripts\Activate.ps1
python manage.py test             # backend
```

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

Confira o que mudou e execute só o que for necessário:

| O que mudou no pull | Comando |
|---|---|
| `package.json` ou `package-lock.json` | `npm install` |
| `requirements.txt` | `cd backend`, ativar o venv e `pip install -r ..\requirements.txt` |
| Arquivos em `backend\core\migrations\` | `cd backend`, ativar o venv e `python manage.py migrate` |
| Variáveis novas de `.env` | Peça os valores ao grupo e acrescente aos seus `.env` |

Para ver o que veio no pull:

```powershell
git diff --stat ORIG_HEAD HEAD
```

### Conflitos de merge

Se o `git pull` avisar de conflito:

1. Rode `git status` para ver os arquivos em conflito.
2. Abra cada arquivo e resolva os trechos entre `<<<<<<<`, `=======` e `>>>>>>>`, mantendo o código correto.
3. Finalize com `git add <arquivo>` e `git commit`.

Conflitos em migrations do Django (dois integrantes criando `0042_...`) precisam de atenção: avise o grupo antes de resolver.

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
