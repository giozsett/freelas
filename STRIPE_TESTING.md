# Testando pagamentos com Stripe (ambiente local)

Guia para configurar e testar o checkout do Stripe em qualquer máquina de
desenvolvimento. Desde a mudança mais recente, **um pagamento só é
confirmado quando o Stripe avisa o backend via webhook** — não existe mais
nenhum atalho que aprove um pagamento sozinho ao abrir o checkout. Por isso,
para testar de ponta a ponta localmente, seu backend precisa conseguir
receber esse aviso do Stripe.

Todo pagamento de acordo (freela) cobra o **valor do anúncio + 10% de taxa
da plataforma**. Esse total é o que aparece no checkout e é gravado como
valor do pagamento.

---

## 1. Pré-requisitos

- Conta no [Stripe](https://dashboard.stripe.com) em **modo de teste** (o
  projeto já usa chaves `sk_test_...`).
- [Stripe CLI](https://docs.stripe.com/stripe-cli) instalado. É a forma mais
  simples de testar o webhook localmente, sem precisar expor sua máquina na
  internet.
  - Windows: `winget install stripe.stripe-cli`
  - Mac: `brew install stripe/stripe-cli/stripe`
  - Linux: instruções em https://docs.stripe.com/stripe-cli
- Python (venv) e Node.js já instalados, seguindo o `README.md` do projeto.

## 2. Configurar o `backend/.env`

Preencha (ou confirme) essas variáveis — peça as chaves de teste para quem
administra a conta Stripe do projeto:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_GOLD=price_...       # ID do preço recorrente do plano Gold
STRIPE_PRICE_PLATINUM=price_...   # ID do preço recorrente do plano Platinum
STRIPE_WEBHOOK_SECRET=whsec_...   # gerado no passo 4, muda a cada `stripe listen`
FRONTEND_URL=http://localhost:5173
DEBUG=True
```

`STRIPE_WEBHOOK_SECRET` é o segredo que o Stripe usa para assinar os eventos
enviados ao seu backend. Cada vez que você inicia o `stripe listen` (passo
4), ele gera um segredo novo — sempre atualize essa variável e reinicie o
backend antes de testar.

## 3. Subir o backend e o frontend

**Windows (PowerShell):**
```powershell
# Terminal 1 — backend
cd backend
.\venv\Scripts\Activate.ps1
python manage.py runserver

# Terminal 2 — frontend
npm run dev
```

**Mac/Linux:**
```bash
# Terminal 1 — backend
cd backend
source venv/bin/activate
python manage.py runserver

# Terminal 2 — frontend
npm run dev
```

Acesse `http://localhost:5173`.

## 4. Receber o webhook do Stripe localmente (Stripe CLI)

Em um terceiro terminal:

```bash
stripe login
# abre o navegador para autorizar a CLI na conta Stripe do projeto (só na primeira vez)

stripe listen --forward-to localhost:8000/api/pagamentos/webhook/
```

A saída vai mostrar algo assim:
```
Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

1. Copie esse `whsec_...` para `STRIPE_WEBHOOK_SECRET` no `backend/.env`.
2. Reinicie o backend (Ctrl+C no Terminal 1 e rode `python manage.py runserver`
   de novo).
3. **Deixe o `stripe listen` rodando** durante todo o teste — é ele quem
   entrega a confirmação de pagamento para o seu backend.

> Alternativa: o projeto também tem um script (`npm run dev:checkout` /
> `npm run dev:checkout:windows`) que sobe um túnel ngrok com domínio fixo e
> espera um webhook já configurado no Dashboard do Stripe apontando pra ele.
> Use essa opção só se precisar testar em outro dispositivo (ex: celular) ou
> já tiver esse webhook configurado no Dashboard — para desenvolvimento do
> dia a dia, o Stripe CLI (acima) é mais simples e não depende de nenhum
> túnel externo.

## 5. Fluxo de teste manual

1. Faça login em `http://localhost:5173` (crie uma conta nova se precisar,
   ou use o login com Google).
2. Publique um anúncio como contratante e aprove uma candidatura para gerar
   um acordo "Pendente Pagamento" — ou use um acordo existente nesse status.
3. Em **Meus Freelas**, no card do acordo, confira a linha discreta abaixo
   do valor: `+ taxa da plataforma (10%): R$ X · Total R$ Y`.
4. Clique em **Pagar Agora** — abre o checkout real do Stripe em nova aba,
   já com o valor total (anúncio + 10%).
5. Preencha com um cartão de teste (tabela abaixo) e finalize o pagamento.
6. Confira:
   - O terminal do `stripe listen` mostra o evento `checkout.session.completed`
     sendo repassado.
   - O terminal do backend loga a chamada em `/api/pagamentos/webhook/`.
   - Em **Meus Freelas**, o acordo passa para "Em andamento".
   - Em **Meus Pagamentos**, aparece um novo registro com forma de pagamento
     "Stripe" e o valor já com a taxa incluída — nunca mais aparece
     "Simulado (modo de teste)".
7. **Teste também o caminho de recusa/abandono**: inicie um checkout e feche
   a aba sem pagar (ou use um cartão de recusa da tabela abaixo). O acordo
   deve continuar "Pendente Pagamento" — prova de que não existe mais
   aprovação automática.

## 6. Cartões de teste do Stripe

Nenhum desses cartões move dinheiro de verdade — só funcionam com uma chave
`sk_test_...`. Para qualquer um deles, use:
- **Validade**: qualquer data futura (ex: `12/30`)
- **CVC**: qualquer 3 dígitos (4 dígitos para Amex, ex: `1234`)
- **Nome / CEP**: qualquer valor

| Número do cartão | Resultado |
|---|---|
| `4242 4242 4242 4242` | ✅ Pagamento aprovado (Visa) |
| `5555 5555 5555 4444` | ✅ Pagamento aprovado (Mastercard) |
| `3782 822463 10005` | ✅ Pagamento aprovado (American Express) |
| `4000 0000 0000 0002` | ❌ Recusado (recusa genérica) |
| `4000 0000 0000 9995` | ❌ Recusado (saldo insuficiente) |
| `4000 0000 0000 9987` | ❌ Recusado (cartão perdido) |
| `4000 0000 0000 9979` | ❌ Recusado (cartão roubado) |
| `4000 0000 0000 0069` | ❌ Recusado (cartão expirado) |
| `4000 0000 0000 0127` | ❌ Recusado (CVC incorreto) |
| `4000 0000 0000 0119` | ❌ Recusado (erro de processamento) |
| `4000 0025 0000 3155` | 🔐 Exige autenticação extra (3D Secure) — precisa confirmar na tela de simulação do banco |

Lista completa e sempre atualizada: https://docs.stripe.com/testing

## 7. Problemas comuns

- **"Signature verification failed" no backend**: o `STRIPE_WEBHOOK_SECRET`
  no `.env` está desatualizado. Copie o valor mais recente impresso pelo
  `stripe listen` e reinicie o backend.
- **Pagamento fica "pendente" para sempre**: o `stripe listen` não está
  rodando, ou foi fechado no meio do teste. Ele precisa estar ativo no
  momento em que você finaliza o pagamento no Stripe.
- **`stripe: command not found`**: a Stripe CLI não está instalada ou não
  está no PATH — reabra o terminal após instalar, ou reinstale seguindo
  https://docs.stripe.com/stripe-cli.
- **ngrok reclama que o domínio "já está online"** (só relevante se usar a
  alternativa do túnel ngrok, passo 4): outra sessão sua (outro dispositivo
  ou janela) já está com esse túnel aberto. Feche-a ou use o Stripe CLI
  (recomendado) em vez do ngrok.
