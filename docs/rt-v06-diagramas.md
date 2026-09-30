# RT v06 — diagramas

Diagramas atualizados para o relatório técnico, em Mermaid. O GitHub renderiza este arquivo direto. Para colar no .docx, cole cada bloco em <https://mermaid.live> e exporte como PNG ou SVG.

Eles refletem o código atual (`backend/core/models.py`). Os textos de requisitos estão em [`rt-v06-secoes.md`](rt-v06-secoes.md).

## 1. Casos de uso

```mermaid
flowchart LR
    V([Visitante])
    F([Freelancer])
    C([Contratante])
    A([Administrador])

    subgraph Conta
        UC1(Cadastrar-se / entrar com e-mail, Google ou LinkedIn)
        UC2(Escolher papel no primeiro acesso)
        UC3(Editar perfil)
        UC4(Assinar, trocar ou cancelar plano)
    end

    subgraph Vagas
        UC5(Consultar vagas e planos)
        UC6(Publicar, editar e excluir vaga)
        UC7(Enviar candidatura)
        UC8(Aprovar ou recusar candidatura)
    end

    subgraph Acordo
        UC9(Pagar acordo pelo Stripe)
        UC10(Conversar no chat)
        UC11(Solicitar alteração do acordo)
        UC12(Marcar serviço como entregue)
        UC13(Confirmar conclusão)
        UC14(Relatar problema)
        UC15(Avaliar a outra parte)
    end

    subgraph Moderação
        UC16(Denunciar usuário ou anúncio)
        UC17(Julgar denúncia)
        UC18(Decidir disputa)
        UC19(Consultar dashboard)
    end

    V --- UC5
    V --- UC1
    F --- UC1 & UC2 & UC3 & UC4 & UC5 & UC7 & UC10 & UC11 & UC12 & UC14 & UC15 & UC16
    C --- UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC8 & UC9 & UC10 & UC11 & UC13 & UC14 & UC15 & UC16
    A --- UC17 & UC18 & UC19
```

## 2. Diagrama de classes

A especialização `AnuncioContratante` / `AnuncioFreelancer` do RT v05 saiu: só o contratante publica, então `Anuncio` é uma classe única (vaga). `partes()` devolve o contratante (autor da vaga) e o freelancer (quem se candidatou); `taxa_plataforma` é 10% do valor acordado.

```mermaid
classDiagram
    direction LR

    class Usuario {
        papel: PapelUsuario
        nome_completo
        plano_assinatura
        servicos_contratados
        como_trabalha
        pontos_infracao
        banido
        deletado
    }
    class Anuncio {
        titulo
        descricao
        categoria
        habilidades
        valor
        modalidade
        prazo
        status
        atualizar_vencidos()
    }
    class Candidatura {
        mensagem
        status: StatusCandidatura
        partes()
    }
    class AcordoServico {
        valor_acordado
        status: StatusAcordo
        conclusao_prevista
        entregue_em
        motivo_cancelamento
        taxa_plataforma
        prazo_pagamento
        prazo_confirmacao
        atrasado
        partes()
    }
    class RelatoProblema {
        motivo
        justificativa
        status
        parte_infratora
        estornado
    }
    class SolicitacaoAlteracao {
        valor_proposto
        descricao_proposta
        conclusao_proposta
        status
    }
    class Pagamento {
        tipo
        status
        valor
        referencia_externa
    }
    class Avaliacao {
        papel_avaliado
        modalidade
        nota_geral
        comentario
    }
    class CriterioAvaliacao {
        chave
        nota
    }
    class MensagemChat {
        texto
        lida
    }
    class Notificacao {
        tipo
        titulo
        mensagem
        lida
    }
    class Denuncia {
        tipo
        categoria
        comentario
        status
    }
    class PapelUsuario {
        <<enumeration>>
        freelancer
        contratante
        administrador
    }
    class StatusAcordo {
        <<enumeration>>
        Pendente Pagamento
        Ativo
        Aguardando confirmação
        Concluído
        Cancelado
    }
    class StatusCandidatura {
        <<enumeration>>
        pendente
        aprovada
        recusada
        encerrada
        cancelada
    }

    Usuario "1" --> "0..*" Anuncio : publica, se contratante
    Usuario "1" --> "0..*" Candidatura : envia, se freelancer
    Anuncio "1" --> "0..*" Candidatura : recebe
    Candidatura "1" --> "0..1" AcordoServico : origina
    AcordoServico "1" --> "0..*" Pagamento : pago por
    AcordoServico "1" --> "0..*" RelatoProblema : disputas
    AcordoServico "1" --> "0..*" SolicitacaoAlteracao : alterações
    AcordoServico "1" --> "0..*" MensagemChat : chat
    AcordoServico "1" --> "0..2" Avaliacao : avaliações mútuas
    Avaliacao "1" --> "3" CriterioAvaliacao : critérios
    Usuario "1" --> "0..*" Pagamento : paga
    Usuario "1" --> "0..*" Notificacao : recebe
    Usuario "1" --> "0..*" Denuncia : envia
```

## 3. Estados

### Acordo de serviço

```mermaid
stateDiagram-v2
    [*] --> PendentePagamento: contratante aprova a candidatura
    PendentePagamento --> Ativo: pagamento confirmado (webhook do Stripe)
    PendentePagamento --> Cancelado: 72 h sem pagamento (automático)
    Ativo --> AguardandoConfirmacao: freelancer marca a entrega
    Ativo --> Concluido: contratante confirma
    AguardandoConfirmacao --> Concluido: contratante confirma ou 72 h sem resposta
    Ativo --> Cancelado: moderação aprova o problema relatado (estorno)
    AguardandoConfirmacao --> Cancelado: moderação aprova o problema relatado (estorno)
    AguardandoConfirmacao --> Concluido: moderação recusa o problema relatado
    Concluido --> [*]: avaliações liberadas
    Cancelado --> [*]
```

Um problema relatado pendente congela a conclusão automática até a decisão da moderação.

### Candidatura

```mermaid
stateDiagram-v2
    [*] --> pendente: freelancer se candidata
    pendente --> aprovada: contratante aprova (cria o acordo)
    pendente --> recusada: contratante recusa
    pendente --> encerrada: outra candidatura foi aprovada
    aprovada --> cancelada: acordo cancelado por falta de pagamento
    encerrada --> pendente: vaga reaberta (acordo expirou)
```

## 4. Modelo entidade-relacionamento (tabelas usadas pelo Django)

Colunas principais de cada tabela. As tabelas `anuncios` e `candidaturas` mantêm colunas espelhadas herdadas da modelagem inicial do Supabase (`titulo`/`title`, `descricao`/`description`, `valor`/`price`, `usuario_id`/`author_id`), sincronizadas pelo `save()` dos models.

```mermaid
erDiagram
    AUTH_USER ||--|| USUARIOS : "perfil"
    AUTH_USER ||--o{ ANUNCIOS : "publica"
    AUTH_USER ||--o{ CANDIDATURAS : "envia"
    ANUNCIOS ||--o{ CANDIDATURAS : "recebe"
    CANDIDATURAS ||--o{ ACORDO_SERVICO : "origina"
    ACORDO_SERVICO ||--o{ PAGAMENTOS : "pago por"
    AUTH_USER ||--o{ PAGAMENTOS : "paga"
    ACORDO_SERVICO ||--o{ SOLICITACOES_CANCELAMENTO_ACORDO : "problemas relatados"
    ACORDO_SERVICO ||--o{ SOLICITACOES_ALTERACAO_ACORDO : "alterações"
    ACORDO_SERVICO ||--o{ MENSAGENS_CHAT : "chat"
    ACORDO_SERVICO ||--o{ AVALIACOES : "avaliações"
    USUARIOS ||--o{ AVALIACOES : "avalia / é avaliado"
    AVALIACOES ||--o{ CRITERIOS_AVALIACAO : "critérios"
    AUTH_USER ||--o{ NOTIFICACOES : "recebe"
    AUTH_USER ||--o{ DENUNCIAS : "denuncia"
    USUARIOS ||--o{ CERTIFICADOS : "possui"
    USUARIOS ||--o{ EXPERIENCIAS : "possui"
    AUTH_USER ||--o| CODIGOS_VERIFICACAO_EMAIL : "verifica"

    AUTH_USER {
        int id PK
        varchar username
        varchar email
        varchar password
        bool is_staff
        bool is_superuser
    }
    USUARIOS {
        bigint id PK
        int user_id FK
        varchar papel "freelancer | contratante | administrador"
        varchar nome_completo
        varchar tipo_empresa "pessoa | cnpj"
        varchar nome_empresa
        json ramos_atuacao
        smallint ano_fundacao
        varchar responsavel_nome
        varchar responsavel_cargo
        json servicos_contratados "contratante"
        text como_trabalha "contratante"
        json categories
        json skills
        varchar subscription_plan
        smallint pontos_infracao
        bool banido
        bool deletado
    }
    ANUNCIOS {
        bigint id PK
        int author_id FK
        varchar title
        text description
        varchar category
        json skills
        varchar price
        varchar location_type
        varchar deadline
        varchar status
        varchar role "contractor = vaga"
        bool deletado
    }
    CANDIDATURAS {
        bigint id PK
        int user_id FK
        bigint ad_id FK
        text mensagem
        varchar status
        bool deletado
    }
    ACORDO_SERVICO {
        bigint id PK
        bigint candidatura_id FK
        varchar status_acordo
        float valor_acordado
        date conclusao_prevista
        datetime data_confirmacao
        datetime entregue_em
        datetime concluido_em
        datetime cancelado_em
        varchar motivo_cancelamento
    }
    PAGAMENTOS {
        bigint id PK
        int usuario_id FK
        bigint acordo_id FK
        varchar tipo "assinatura | acordo"
        varchar status
        decimal valor
        varchar referencia_externa
        varchar mp_payment_id "payment_intent do Stripe"
        varchar plano
    }
    SOLICITACOES_CANCELAMENTO_ACORDO {
        bigint id PK
        bigint acordo_id FK
        int solicitante_id FK
        varchar motivo
        text justificativa
        varchar status
        varchar parte_infratora
        bool estornado
        int analisado_por_id FK
    }
    SOLICITACOES_ALTERACAO_ACORDO {
        bigint id PK
        bigint acordo_id FK
        int solicitante_id FK
        float valor_proposto
        date conclusao_proposta
        varchar status
    }
    MENSAGENS_CHAT {
        bigint id PK
        bigint acordo_id FK
        int remetente_id FK
        text texto
        bool lida
    }
    AVALIACOES {
        bigint id PK
        bigint acordo_id FK
        bigint avaliador_id FK
        bigint avaliado_id FK
        varchar papel_avaliado
        decimal nota_geral
        text comentario
    }
    CRITERIOS_AVALIACAO {
        bigint id PK
        bigint avaliacao_id FK
        varchar chave
        smallint nota
    }
    NOTIFICACOES {
        bigint id PK
        int usuario_id FK
        bigint ad_id FK
        varchar tipo
        varchar titulo
        bool lida
    }
    DENUNCIAS {
        bigint id PK
        int reporter_id FK
        varchar type "user | ad"
        varchar target_id
        varchar category
        varchar status
    }
    CERTIFICADOS {
        bigint id PK
        bigint usuario_id FK
        varchar nome_certificado
        varchar instituicao
    }
    EXPERIENCIAS {
        bigint id PK
        bigint usuario_id FK
        varchar empresa
        varchar cargo
        date data_inicio
    }
    CODIGOS_VERIFICACAO_EMAIL {
        bigint id PK
        int usuario_id FK
        varchar codigo
        bool verificado
    }
```

Tabelas do django-allauth (`account_*`, `socialaccount_*`) e do DRF (`authtoken_token`) não aparecem no diagrama. As tabelas legadas do Supabase que o Django não usa (`anuncios_freelancer`, `anuncios_contratante`, `conversas`, `assinaturas`, `denuncia_usuario`, `denuncia_anuncio`, `cancelamento_acordo`, `alteracoes_acordo`, `core_ad`, `core_userprofile`, `cartoes_usuario`) ficam fora do DER.

## 5. Containers

```mermaid
flowchart LR
    U([Freelancer, Contratante, Administrador, Visitante])
    subgraph Local["Notebook (Windows) — npm run dev:checkout"]
        FE[Frontend React + Vite<br/>localhost:5173]
        API[Backend Django REST<br/>+ Django Channels / Daphne<br/>localhost:8000]
        R[(Redis<br/>Pub/Sub do chat<br/>e das notificações)]
        NG[Ngrok]
    end
    DB[(PostgreSQL<br/>Supabase)]
    ST[Stripe<br/>Checkout, assinaturas, estornos]
    CL[Cloudinary<br/>imagens]
    EM[Gmail SMTP<br/>códigos de verificação]
    OA[Google e LinkedIn<br/>OAuth]

    U --> FE
    FE -- HTTP / JSON --> API
    FE -- WebSocket --> API
    API <--> R
    API --> DB
    API --> ST
    ST -- webhook --> NG --> API
    API --> CL
    API --> EM
    FE --> OA
    API --> OA
```

As mensagens do chat são gravadas direto no PostgreSQL; o Redis só entrega as mensagens novas em tempo real aos WebSockets conectados.
