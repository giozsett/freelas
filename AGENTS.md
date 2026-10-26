# Freelas

Plataforma que conecta freelancers a contratantes. Frontend React + Vite na raiz (`src/`) e backend Django em `backend/`. Roda só localmente, no Windows (PowerShell). O banco é um PostgreSQL no Supabase **compartilhado por todo o grupo**.

Comandos de instalação, execução, testes e `git pull` estão no `README.md`, que é a fonte da verdade. Leia a seção correspondente antes de rodar qualquer comando.

## Skills do projeto

As skills ficam em `.claude/skills/`. Leia o `SKILL.md` correspondente **antes** de começar a tarefa:

| Tarefa | Leia |
|---|---|
| Preparar o projeto depois de `git pull` ou troca de branch, rodar o app, rodar testes do backend, criar ou aplicar migrations | `.claude/skills/freelas-ambiente/SKILL.md` |
| Criar ou redesenhar tela, componente ou mockup | `.claude/skills/freelas-design/SKILL.md` |

## Regras

- **Banco compartilhado:** `migrate` e qualquer escrita no `DATABASE_URL` afetam o grupo inteiro na hora. Peça confirmação antes e aplique só migrations que já estejam no GitHub.
- **Testes do backend:** `backend\venv\Scripts\python.exe manage.py test <alvo> --keepdb`, rodado de dentro de `backend\`. Corrija um bug escrevendo primeiro um teste que reproduza o problema.
- **Antes de dizer que terminou:** o backend passa nos testes, e no frontend `npm run lint` e `npx vite build` não dão erro.
- **Idioma:** textos de interface, mensagens de erro, comentários e nomes novos em português, seguindo o código ao redor.
- **Segredos:** os `.env` não vão para o Git. Nunca copie valores deles para código, commits ou mensagens.
