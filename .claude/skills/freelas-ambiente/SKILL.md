---
name: freelas-ambiente
description: Ambiente de desenvolvimento do Freelas (Windows, Django + React, Postgres compartilhado no Supabase). Use ao preparar o projeto depois de git pull ou troca de branch, rodar o app, rodar os testes do backend, ou criar e aplicar migrations.
---

# Freelas: ambiente de desenvolvimento

O `README.md` é a fonte da verdade dos comandos: **leia as seções citadas abaixo antes de rodar qualquer coisa** e use os comandos de lá:

- Preparar o projeto: seção "Antes de abrir o projeto".
- Rodar o app: seção "Executando o projeto" (`npm run dev:checkout`).
- Testes: seção "Testes e lint".
- Migrations em conflito: seção "Conflitos de migration".

Este arquivo guarda só o que o README e a configuração não deixam evidente.

## Como executar comandos aqui

- O Python do backend é `backend\venv\Scripts\python.exe`. Chame-o pelo caminho em vez de depender de um venv ativado: sem ele, o `manage.py` falha com `No module named 'django'`.
- Rode o `manage.py` de dentro de `backend\`. O `requirements.txt` fica na raiz.
- `manage.py shell -c` recebe uma linha só. Para scripts com várias linhas, salve um arquivo temporário e rode `manage.py shell -c "exec(open(r'<arquivo>', encoding='utf-8').read())"`. Mandar o script por pipe do PowerShell insere um BOM e quebra a primeira linha.

## Banco de dados compartilhado

O `DATABASE_URL` em `backend\.env` aponta para o **mesmo Postgres do Supabase usado por todo o grupo**. Todo `migrate` e toda escrita de dados afetam os outros integrantes na hora.

- Confirme com a pessoa antes de aplicar migrations ou alterar dados no banco.
- Aplique uma migration no Supabase só depois de ela estar no GitHub (pushed). `python manage.py showmigrations core` mostra o que já foi aplicado.
- Uma migration que limpa dados (`RunPython`) e depois cria um índice ou uma restrição na mesma tabela falha no Postgres com `cannot CREATE INDEX ... pending trigger events`. Use `atomic = False` na classe `Migration` e `RunPython(..., atomic=True)`, para que a limpeza rode numa transação própria.

## Testes do backend

- Rode sempre `python manage.py test <alvo> --keepdb`. A suíte completa leva cerca de 7 minutos: rode-a em segundo plano e, enquanto isso, teste primeiro a classe afetada.
- Só no Postgres: as migrations usam SQL específico do Postgres, então trocar o `DATABASE_URL` para SQLite quebra a criação do banco.
- Sem `--keepdb`, o pooler do Supabase (porta 6543) segura a conexão e o `DROP DATABASE` do final falha (`is being accessed by other users`). O banco de teste fica sobrando, e a execução seguinte para no prompt `Type 'yes'...`. O resumo `Ran N tests ... OK/FAILED` sai **antes** desse traceback: guarde a saída completa num arquivo em vez de cortá-la com `tail`.
- Para simular uma condição de corrida num teste, faça um `patch` de uma função chamada entre a checagem e o `save()`, e grave a linha concorrente dentro dela. Veja `CandidaturaDuplicadaTests` em `backend/core/tests.py`.

## Busca no catálogo

- O modelo de embeddings e os vetores ficam em `backend\.cache\busca_catalogo` (fora do Git). `manage.py preparar_busca_catalogo` baixa e vetoriza: cerca de 40 s na primeira vez, 2 s depois.
- O `runserver` não carrega o modelo na inicialização: a primeira busca dispara o carregamento em segundo plano e responde no modo `texto` (campo `modo` da resposta) até ele terminar.
- Para medir a qualidade da busca, chame `indice.carregar()` e `indice.buscar(...)` de `core.busca_catalogo` num script com `manage.py shell`. A saída do console do Windows sai em cp1252: use `PYTHONIOENCODING=utf-8` para ver os acentos.

## Mapa e localização no navegador

- O pedido de permissão de localização do Chrome não aparece para a automação do navegador. Para testar, troque `navigator.geolocation.getCurrentPosition` na página por uma função que chame o sucesso com `{ coords: { latitude, longitude } }` ou o erro com `{ code: 1 }` (bloqueado).
- `/create-ad` e `/edit-ad/:id` só abrem para contratante. Se a sessão do navegador for de outro papel, teste `LocalizacaoAnuncio` e `MapaVagas` numa página `.html` temporária na raiz, que o Vite serve, e apague-a depois. Assim nenhuma vaga de teste vai para o banco compartilhado.
- O Nominatim tem limite de uso. Teste com poucos endereços e só pelo fluxo da tela, que já espera a digitação terminar.

## Frontend

- `npm test` roda `node --test` só em arquivos `.test.js`, sem renderizar JSX. Para validar componentes, use `npm run lint` e `npx vite build`.
- O aviso `Some chunks are larger than 500 kB` no build já existia: não indica erro.
