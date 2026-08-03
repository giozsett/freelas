# Plataforma de Freelance


### 1. Criar o env
    Botão direito na raiz do projeto "Novo" > "Arquivo .env"
    Colocar dentro : DATABASE_URL="link do banco de dados no supabase"

    Para habilitar os checkouts do Mercado Pago, copie também as variáveis de
    backend/.env.example e configure:
        - MERCADO_PAGO_ACCESS_TOKEN
        - FRONTEND_URL
        - BACKEND_PUBLIC_URL (URL HTTPS pública do backend)

    No painel "Suas integrações" do Mercado Pago, habilite o evento Pagamentos
    e aponte o webhook para:
        https://api.seu-dominio.com/api/pagamentos/webhook/


### 2. Instalar os requirements
    Em um terminal, navegar até a pasta do backend e executar o comando:
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt


### 3. Executar o projeto
    Abrir terminal
    Executar o comando:
        npm run dev:checkout


### 04/05
     - Conexões no banco de dados (usuários, anúncios, candidaturas e denúncias)
     - Página "Meus Anúncios" agora funciona com a conexão ao banco
     - Envio de candidaturas e página "Minhas Candidaturas" agora funciona com a conexão ao banco 

    
        
    
