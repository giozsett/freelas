# Roteiro da apresentação

Duração estimada da demonstração: 15 a 20 minutos. O roteiro percorre o fluxo completo do freelancer e do contratante, os prazos do acordo e a moderação, usando as contas criadas por `python manage.py popular_demo`.

## Antes do dia

1. Migrations `0043` a `0046` aplicadas no Supabase (uma pessoa roda, depois do backup):
   ```powershell
   cd backend
   .\venv\Scripts\Activate.ps1
   python manage.py showmigrations core
   python manage.py migrate
   ```
2. `python manage.py verificar_dados --detalhes` sem pendências que apareçam na demonstração (contas sem papel, acordos com as partes trocadas, anúncios antigos de freelancer).
3. Pagamento de teste funcionando pelo menos uma vez no notebook da apresentação (ver `STRIPE_TESTING.md`).
4. Manter os prazos padrão no `backend\.env` (sem `PRAZO_PAGAMENTO_HORAS` e `PRAZO_CONFIRMACAO_HORAS`, ou com `72`). Prazos curtos fariam os acordos de demonstração expirarem antes da hora.

## No dia (30 minutos antes)

1. Na raiz do projeto: `npm run dev:checkout` (Redis, Ngrok, backend e frontend).
2. Se o webhook do Stripe for pelo Stripe CLI: `stripe listen --forward-to localhost:8000/api/pagamentos/webhook/` e atualizar `STRIPE_WEBHOOK_SECRET`.
3. Recriar os dados de demonstração (os prazos contam a partir deste momento):
   ```powershell
   cd backend
   .\venv\Scripts\Activate.ps1
   python manage.py popular_demo
   ```
4. Abrir três janelas já logadas, para não perder tempo digitando senhas:
   - Navegador normal: contratante.
   - Janela anônima: freelancer.
   - Outro navegador: administrador (login de moderação, `/moderator-login`).

## Contas de demonstração

Senha de todas: `Freelas@2026`.

| E-mail | Papel | Plano | Uso no roteiro |
|---|---|---|---|
| `clinica@demo.freelas.com` | Contratante (empresa com CNPJ) | Platinum | Aprova candidatura, confirma entrega, avalia |
| `padaria@demo.freelas.com` | Contratante (empresa com CNPJ) | Gold | Relatou problema; teve acordo cancelado por falta de pagamento |
| `marcos@demo.freelas.com` | Contratante (pessoa física) | Gratuito | Paga um acordo com o cartão de teste; é alvo de uma denúncia |
| `ana@demo.freelas.com` | Freelancer | Gold | Candidata-se ao vivo; recebe o pagamento |
| `bruno@demo.freelas.com` | Freelancer | Gratuito | Marca a entrega do site; está em uma disputa |
| `carla@demo.freelas.com` | Freelancer | Gratuito | Entregou o ensaio fotográfico; é avaliada |

Acordos criados:

| Acordo | Partes | Estado inicial |
|---|---|---|
| Identidade visual para clínica veterinária | Clínica × Ana | Concluído e avaliado pelas duas partes |
| Site institucional com agendamento online | Clínica × Bruno | Em andamento (pago), com mensagens no chat |
| Ensaio fotográfico dos pacientes | Clínica × Carla | Aguardando confirmação |
| Logotipo para loja virtual de bolos caseiros | Marcos × Ana | Aguardando pagamento |
| Cardápio digital para pedidos de delivery | Padaria × Bruno | Em andamento, atrasado, com problema relatado |
| Fotos dos produtos para o cardápio | Padaria × Carla | Cancelado por falta de pagamento (vaga reaberta) |

Também existem: a vaga "Vídeo institucional de 1 minuto" (Clínica, sem candidaturas), a vaga "Planilha de controle financeiro" (Marcos, com duas candidaturas pendentes) e uma denúncia pendente contra o Marcos.

## Cenas

### 1. Visitante (1 min)
1. Sair da conta e abrir o Início: só aparecem vagas, e as da Clínica (Platinum) e da Padaria (Gold) vêm primeiro, com selo do plano.
2. Abrir uma vaga e clicar em "Candidatar-se": o sistema pede login.
3. Abrir Planos: o visitante vê os limites dos dois papéis e o benefício de destaque.

**Mensagem para a banca:** o papel é fixo por conta; só o contratante publica e só ele paga, então não há ambiguidade sobre quem é quem num acordo.

### 2. Freelancer se candidata (2 min) — janela da Ana
1. Início: subtítulo "Encontre vagas publicadas por contratantes".
2. Abrir "Vídeo institucional de 1 minuto" e enviar a candidatura (com contraproposta de valor, se quiser).
3. Mostrar o contador de candidaturas do plano e a aba "Minhas candidaturas".

### 3. Contratante aprova (2 min) — janela da Clínica
1. Notificação da nova candidatura → Meus anúncios → "Vídeo institucional".
2. A candidatura da Ana aparece com o selo Gold (assinantes vêm primeiro).
3. Aprovar: o acordo é criado como "Aguardando pagamento", com o aviso "Pague até dd/mm hh:mm".

### 4. Pagamento com o Stripe (2 min) — janela do Marcos
1. Minhas contratações → "Logotipo para loja virtual" → Pagar agora (valor + 10% de taxa).
2. Cartão `4242 4242 4242 4242`, qualquer data futura e qualquer CVC.
3. Voltar ao Freelas: o acordo passa a "Em andamento" quando o webhook confirma. Na janela da Ana aparece "Pagamento recebido".

**Mensagem:** o valor fica em custódia (simulada); o freelancer só começa depois da confirmação. Se o contratante não pagar em 72 h, o acordo é cancelado e a vaga reaberta (cena 8).

### 5. Chat e entrega (2 min) — janela do Bruno (trocar a conta da janela anônima)
1. Meus freelas → "Site institucional" → Abrir conversa: mensagens em tempo real.
2. Voltar e clicar em "Marcar como entregue": o status vira "Aguardando confirmação" e a Clínica é avisada.

### 6. Confirmação e avaliação (2 min) — janela da Clínica
1. "Ensaio fotográfico dos pacientes": aviso "Conclusão automática em …" (se ninguém confirmar em 72 h, conclui sozinho).
2. Confirmar conclusão → Minhas avaliações → avaliar a Carla (critérios de serviço presencial).
3. Abrir o perfil público da Carla: a reputação já considera a avaliação.

### 7. Problema relatado e moderação (3 min) — janela do administrador
1. Aba Disputas → "Cardápio digital": motivo "O serviço não foi entregue", acordo atrasado.
2. Decidir disputa → "Cancelar acordo e estornar" → ponto de infração para o freelancer.
   - Os pagamentos do `popular_demo` são registros de demonstração, então o painel mostra "Estorno: não realizado". Para mostrar um estorno real no Stripe, relatar um problema no acordo pago na cena 4 (janela do Marcos → Relatar problema → Desistência) e decidir essa disputa.
3. Aba Denúncias → denúncia contra o Marcos ("pagamento por fora da plataforma") → Aprovar: o Marcos recebe 1 ponto de infração (Configurações mostra "1 de 3") e o Bruno é avisado do resultado.

**Mensagem:** com 3 pontos a conta é banida (login e sessões bloqueados, anúncios ocultos). Quem faz muitas denúncias improcedentes fica temporariamente impedido de denunciar.

### 8. Prazos automáticos (1 min) — janela da Padaria
1. Minhas contratações → Cancelados → "Fotos dos produtos": "Prazo de pagamento expirado".
2. Meus anúncios → a vaga voltou a "Em aberto" e a candidatura da Ana voltou a ficar pendente.

**Mensagem:** não há tarefa agendada; os prazos são aplicados quando alguém abre as telas, e o comando `python manage.py processar_prazos` força a aplicação.

### 9. Dashboard (1 min) — janela do administrador
Indicadores por período: usuários por papel, acordos, assinaturas e denúncias.

## Plano B

| Problema | O que fazer |
|---|---|
| Checkout ou webhook do Stripe falha | Mostrar o acordo pendente e seguir para a cena 5 (o acordo "Site institucional" já está pago). Conferir depois com `STRIPE_TESTING.md`. |
| Chat não atualiza em tempo real | Recarregar a página: as mensagens ficam salvas no PostgreSQL; o Redis só entrega em tempo real. |
| Dados bagunçados durante os ensaios | Rodar `python manage.py popular_demo` de novo: ele remove e recria só as contas `@demo.freelas.com`. |
| Banco do Supabase inacessível | Sem alternativa rápida: o banco é compartilhado. Testar a conexão na véspera. |

## Perguntas prováveis da banca

- **Por que o papel é fixo?** A troca de papel na mesma conta gerou ambiguidade sobre quem paga e quem entrega. Com o papel fixo, as regras ficam no backend e o modelo de dados é simples (plataformas como 99Freelas e Workana também separam cliente e freelancer).
- **Por que só o contratante publica?** Quem publica é quem contrata e paga; o freelancer se apresenta pelo perfil e pelas candidaturas. Isso eliminou o fluxo invertido em que o freelancer era cobrado.
- **Como o dinheiro circula?** O contratante paga valor + 10% no Stripe (modo de teste). O valor fica em custódia simulada; o repasse ao freelancer (Stripe Connect) está fora do escopo acadêmico.
- **E se o contratante não pagar ou o freelancer não entregar?** Prazo de pagamento de 72 h com cancelamento automático; entrega marcada pelo freelancer com confirmação do contratante e conclusão automática; relato de problema julgado pela moderação, com estorno e ponto de infração.
- **Como evitam denúncias abusivas?** Denúncia só com login, uma decisão por denúncia e soft ban para quem acumula denúncias improcedentes.
- **Como garantem as regras?** Todas as permissões são validadas no backend (o frontend só reflete), com 130 testes automatizados (`python manage.py test core`).
- **LGPD?** Exclusão lógica, controle de visibilidade de e-mail e telefone e exclusão da própria conta.
