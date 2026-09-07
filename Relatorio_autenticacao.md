# Relatório de Testes de Autenticação — Projeto Freelas

Data: 2026-09-07

## 1. Funções de autenticação encontradas

A autenticação do projeto é dividida entre o backend (Django + DRF, responsável por criar/validar
usuário e senha) e o frontend (React, responsável apenas por uma checagem visual de força de senha
antes de enviar o cadastro).

| Função / Classe | Arquivo | Responsabilidade |
|---|---|---|
| `RegisterAPI` | `backend/core/views.py:29` | Endpoint `POST /api/auth/register/` — cria o usuário |
| `RegisterSerializer` | `backend/core/serializers.py:132` | Serializa e persiste `username`, `email`, `password`, `first_name` via `User.objects.create_user` |
| `LoginAPI` | `backend/core/views.py:51` | Endpoint `POST /api/auth/login/` — autentica com `django.contrib.auth.authenticate` |
| `RedefinicaoSenhaAPI` | `backend/core/views.py:752` | Endpoint `POST /api/auth/solicitar-redefinicao/` — envia código de verificação por e-mail |
| `RedefinirSenhaAPI` | `backend/core/views.py:779` | Endpoint `POST /api/auth/redefinir-senha/` — troca a senha via `user.set_password(nova_senha)` |
| `AUTH_PASSWORD_VALIDATORS` | `backend/server/settings.py:118-131` | Validadores padrão do Django (comprimento mínimo, senha comum, similaridade com dados do usuário, senha 100% numérica) |
| `checkPasswordStrength` | `src/utils/validacaoSenha.js` (extraída de `src/pages/Cadastro.jsx`) | Calcula a força da senha no formulário de cadastro (`Fraca` / `Média` / `Forte`) |
| `AuthProvider` / `ContextoAutenticacao` | `src/context/ContextoAutenticacao.jsx` | Guarda `token`/`user` no `localStorage` e valida a sessão contra `/api/auth/user/` |

**Confirmação:** as funções responsáveis pela autenticação (cadastro, login e redefinição de senha)
foram localizadas com sucesso no backend (`backend/core/views.py`, `backend/core/serializers.py`) e a
checagem de força de senha foi localizada no frontend (`src/pages/Cadastro.jsx`).

> **Observação relevante:** os validadores em `AUTH_PASSWORD_VALIDATORS` (settings.py) só são
> aplicados quando algo chama explicitamente `django.contrib.auth.password_validation.validate_password()`
> (ex.: formulários do Django). Nem `RegisterSerializer.create()` nem `RedefinirSenhaAPI.post()`
> fazem essa chamada — eles usam `create_user()` / `set_password()` diretamente. Ou seja, **esses
> validadores não estão de fato em vigor nos endpoints da API**, mesmo estando configurados.

## 2. Requisitos avaliados

1. Senha com no mínimo 8 caracteres.
2. Pelo menos 1 letra maiúscula.
3. Pelo menos 1 número.
4. Pelo menos 1 caractere especial (`@`, `#`, `*`, etc.).

## 3. Metodologia

- **Backend:** testes automatizados com `django.test.TestCase` + `rest_framework.test.APIClient`,
  adicionados em `backend/core/tests.py` (classe `AutenticacaoSenhaAPITests`), seguindo o padrão já
  usado no projeto. Executados com `python manage.py test core.tests.AutenticacaoSenhaAPITests`.
- **Frontend:** testes com o test runner nativo do Node.js (`node --test`, sem novas dependências),
  em `src/utils/validacaoSenha.test.js`, cobrindo a função pura `checkPasswordStrength`. Executados
  com `node --test src/utils/validacaoSenha.test.js` (também disponível via `npm test`).

Cada teste assume que os 4 requisitos acima **deveriam** ser aplicados. Quando o teste falha, isso
indica que a implementação atual **não aplica** aquele requisito (gap de segurança), e não um erro no
teste em si.

## 4. Resultados — Backend (`core.tests.AutenticacaoSenhaAPITests`)

Total: **12 testes** — 4 passaram, 8 falharam.

### Cadastro — `POST /api/auth/register/`

| Teste | Requisito verificado | Resultado | Detalhe |
|---|---|---|---|
| `test_cadastro_recusa_senha_menor_que_8_caracteres` | mín. 8 caracteres | ❌ FALHOU | Enviado `Ab1@xyz` (7 caracteres); esperado `400`, retornado `200` — usuário foi criado |
| `test_cadastro_recusa_senha_sem_letra_maiuscula` | 1 maiúscula | ❌ FALHOU | Enviado `abcdef1@`; esperado `400`, retornado `200` |
| `test_cadastro_recusa_senha_sem_numero` | 1 número | ❌ FALHOU | Enviado `Abcdefg@`; esperado `400`, retornado `200` |
| `test_cadastro_recusa_senha_sem_caractere_especial` | 1 caractere especial | ❌ FALHOU | Enviado `Abcdefg1`; esperado `400`, retornado `200` |
| `test_cadastro_aceita_senha_que_atende_todos_os_requisitos` | todos os 4 | ✅ PASSOU | `Abcdef1@` aceita, token retornado, senha armazenada com hash (`check_password` confirma) |

### Redefinição de senha — `POST /api/auth/redefinir-senha/`

| Teste | Requisito verificado | Resultado | Detalhe |
|---|---|---|---|
| `test_redefinicao_recusa_senha_menor_que_8_caracteres` | mín. 8 caracteres | ❌ FALHOU | Esperado `400`, retornado `200` — senha trocada mesmo sendo curta |
| `test_redefinicao_recusa_senha_sem_letra_maiuscula` | 1 maiúscula | ❌ FALHOU | Esperado `400`, retornado `200` |
| `test_redefinicao_recusa_senha_sem_numero` | 1 número | ❌ FALHOU | Esperado `400`, retornado `200` |
| `test_redefinicao_recusa_senha_sem_caractere_especial` | 1 caractere especial | ❌ FALHOU | Esperado `400`, retornado `200` |
| `test_redefinicao_aceita_senha_que_atende_todos_os_requisitos` | todos os 4 | ✅ PASSOU | Senha `Abcdef1@` aceita e persistida corretamente |

### Login — `POST /api/auth/login/` (cobertura básica, fora do escopo dos 4 requisitos)

| Teste | Resultado | Detalhe |
|---|---|---|
| `test_login_com_credenciais_corretas_retorna_token` | ✅ PASSOU | Retorna `200` + `token` |
| `test_login_com_senha_incorreta_e_recusado` | ✅ PASSOU | Retorna `400` + `error` |

## 5. Resultados — Frontend (`src/utils/validacaoSenha.test.js`)

Total: **6 testes** — 5 passaram, 1 falhou.

| Teste | Requisito verificado | Resultado | Detalhe |
|---|---|---|---|
| Recusa senha < 8 caracteres | mín. 8 caracteres | ❌ FALHOU | `checkPasswordStrength('Ab1@xyz')` retornou `'Forte'` mesmo com 7 caracteres — a função **não checa comprimento** |
| Recusa senha sem maiúscula | 1 maiúscula | ✅ PASSOU | `checkPasswordStrength('abcdef1@')` não retorna `'Forte'` |
| Recusa senha sem número | 1 número | ✅ PASSOU | `checkPasswordStrength('Abcdefg@')` não retorna `'Forte'` |
| Recusa senha sem caractere especial | 1 caractere especial | ✅ PASSOU | `checkPasswordStrength('Abcdefg1')` não retorna `'Forte'` |
| Aceita senha com os 4 requisitos | todos os 4 | ✅ PASSOU | `checkPasswordStrength('Abcdef1@')` retorna `'Forte'` |
| Senha vazia | — | ✅ PASSOU | Retorna `''` |

Além disso, mesmo quando `checkPasswordStrength` retorna `'Média'` (letras + números, sem exigir
maiúscula/especial/comprimento mínimo), o formulário de cadastro (`Cadastro.jsx`) **permite o envio**
— o bloqueio só ocorre para o nível `'Fraca'` (`if (passwordStrength === 'Fraca') { ... return; }`).
Ou seja, uma senha como `abcd1234` (8 caracteres, sem maiúscula e sem especial) passa pela validação
do formulário.

## 6. Achados (gaps de segurança)

1. **Nenhum dos 4 requisitos é aplicado no backend**, nem no cadastro (`RegisterSerializer`) nem na
   redefinição de senha (`RedefinirSenhaAPI`). Isso é o achado mais crítico: como o backend é a
   fonte de verdade, qualquer cliente que ignore o frontend (ex.: chamada direta à API via
   Postman/cURL) pode cadastrar ou redefinir senhas como `"a"` ou `"123"`.
2. **`AUTH_PASSWORD_VALIDATORS` está configurado mas não é usado** pelos endpoints da API — dá uma
   falsa sensação de proteção.
3. **No frontend, a checagem de força não valida comprimento mínimo** e classifica como `'Forte'`
   senhas com menos de 8 caracteres, desde que tenham maiúscula, número e especial.
4. **O frontend permite envio de senhas `'Média'`**, que não possuem maiúscula nem caractere
   especial e não têm comprimento mínimo garantido — o requisito descrito pelo usuário só é, na
   prática, sugerido, nunca exigido.
5. A validação de senha, mesmo quando presente, existe **apenas no cliente** — não há nenhuma
   barreira server-side equivalente.

## 7. Recomendação

Implementar a validação dos 4 requisitos no backend (idealmente em `RegisterSerializer.validate_password`
e no início de `RedefinirSenhaAPI.post`, usando um `RegexValidator`/checagem manual e retornando
`400` com mensagem clara), e replicar as mesmas regras no frontend (bloqueando o envio quando
`checkPasswordStrength` não for `'Forte'`, e fazendo essa função também checar o comprimento mínimo
de 8 caracteres). Os testes deste relatório podem ser reexecutados após a correção para confirmar que
passam a `PASSAR` (comando: `python manage.py test core.tests.AutenticacaoSenhaAPITests` e
`node --test src/utils/validacaoSenha.test.js`).

## 8. Arquivos criados/alterados nesta tarefa

- `backend/core/tests.py` — nova classe `AutenticacaoSenhaAPITests` (12 testes) + import de `VerificacaoEmail`.
- `src/utils/validacaoSenha.js` — função `checkPasswordStrength` extraída de `Cadastro.jsx` para ser testável.
- `src/utils/validacaoSenha.test.js` — 6 testes com `node:test`.
- `src/pages/Cadastro.jsx` — passou a importar `checkPasswordStrength` de `src/utils/validacaoSenha.js` (comportamento inalterado).
- `package.json` — adicionado script `"test": "node --test src/**/*.test.js"`.
