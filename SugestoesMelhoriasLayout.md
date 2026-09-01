# Sugestões de melhorias de layout

## Objetivo

Profissionalizar as páginas **Meus anúncios**, **Meus freelas** e **Minhas candidaturas** sem romper com a identidade atual da plataforma. As propostas abaixo preservam a paleta existente, a tipografia, os cards, os botões, os badges, o tema escuro e o comportamento responsivo já usados nas demais páginas.

## Direção visual comum às três páginas

### 1. Padronizar o cabeçalho

Usar em todas as páginas uma faixa de abertura com:

- ícone de 28 a 32 px na cor `var(--primary)`;
- título com tamanho entre `2rem` e `2.25rem` no desktop;
- descrição curta em `var(--text-secondary)`;
- ação principal à direita, quando existir;
- espaçamentos iguais entre título, descrição e conteúdo.

Em **Meus anúncios**, a ação principal deve ser **Criar anúncio**. Nas outras páginas, o cabeçalho pode manter apenas o conteúdo informativo.

### 2. Adotar uma barra de resumo

Logo abaixo do cabeçalho, exibir pequenos indicadores com a quantidade de itens em cada estado. Os indicadores devem usar fundo `var(--surface-color)`, borda `var(--border-color)` e apenas um detalhe de cor no ícone ou na lateral. Isso comunica progresso sem deixar a interface excessivamente colorida.

Exemplos:

- anúncios ativos, finalizados e vencidos;
- freelas aguardando pagamento, em andamento e concluídos;
- candidaturas em análise, aprovadas e recusadas.

No celular, os indicadores podem formar uma grade de duas colunas ou uma faixa horizontal rolável.

### 3. Unificar filtros e abas

Atualmente as páginas usam estilos diferentes para filtros semelhantes. Criar um único componente visual de abas segmentadas, inspirado nas abas já existentes no perfil:

- fundo `var(--bg-color)`;
- borda externa `var(--border-color)`;
- opção ativa com `var(--secondary)`, texto `var(--primary)` e borda primária;
- contador dentro de uma pequena cápsula;
- foco de teclado visível;
- rolagem horizontal em telas estreitas, sem quebrar os rótulos.

### 4. Criar uma anatomia única para os cards

Todos os cards devem seguir a mesma organização:

1. título e badge de status;
2. metadados essenciais em uma linha discreta;
3. informação principal do item;
4. ações agrupadas no rodapé;
5. detalhes secundários recolhidos em uma área expansível, quando necessários.

Usar bordas e sombras com moderação. Em vez de pintar o card inteiro conforme o status, usar uma faixa lateral de 4 px e um badge semântico. O hover deve ser reservado para cards realmente clicáveis.

### 5. Padronizar status e ações

Criar variantes semânticas reutilizáveis:

- **em andamento/ativo:** cor primária ou azul de apoio;
- **sucesso/concluído/aprovado:** `var(--success-color)` e `var(--success-soft)`;
- **atenção/aguardando:** tom âmbar já compatível com o tema;
- **erro/cancelado/recusado:** `var(--danger-color)` e `var(--danger-soft)`;
- **encerrado/vencido:** texto secundário e fundo neutro.

Evitar cores hexadecimais diretamente no JSX. Usar variáveis do tema garante consistência entre os modos claro e escuro.

As ações devem ter hierarquia clara:

- uma ação primária preenchida por card;
- ações secundárias com `btn-secondary`;
- ações destrutivas com estilo de perigo, preferencialmente dentro de um menu **Mais ações**;
- ícone acompanhado de texto, sem depender apenas da cor.

## Meus anúncios

### Estrutura sugerida

- Cabeçalho com título, descrição e botão **Criar anúncio**.
- Três indicadores: ativos, finalizados e vencidos.
- Abas segmentadas por status.
- Lista de cards compactos, com maior densidade de informação.

### Melhorias nos cards

Cada card pode apresentar:

- título do anúncio como link, sem sublinhado permanente; o sublinhado aparece no hover/foco;
- badge de status no canto superior direito;
- data de publicação e, para anúncios ativos, texto como **vence em 12 dias**;
- papel do anúncio, categoria, modalidade e faixa de valor, caso os dados estejam disponíveis;
- quantidade de candidaturas recebidas com destaque moderado;
- ação principal **Gerenciar candidaturas**;
- ações secundárias **Ver anúncio** e **Editar**;
- menu de ações para encerrar ou excluir, quando permitido.

O texto atual **Visualizar Solicitações** pode ser substituído por **Gerenciar candidaturas**, termo mais curto e alinhado à função da tela.

### Estados vazios

Usar ícone, título curto, explicação de uma linha e ação contextual. Exemplo para anúncios ativos: **Você ainda não tem anúncios ativos** + botão **Criar anúncio**. Para finalizados e vencidos, evitar ação genérica e explicar que o histórico aparecerá ali.

## Meus freelas

Esta é a página com maior volume de informações e ações. O principal ganho virá de reduzir o ruído visual e evidenciar a próxima ação necessária.

### Estrutura sugerida

- Cabeçalho padronizado.
- Bloco **Requer sua atenção** antes da lista, exibido somente quando houver pagamento, solicitação ou prazo pendente.
- Indicadores: aguardando pagamento, em andamento, concluídos e cancelados.
- Abas: **Ativos**, **Concluídos** e **Cancelados**.
- Dentro de **Ativos**, ordenar primeiro os itens com ação pendente.

### Bloco “Requer sua atenção”

Substituir ou refinar o expansor genérico de solicitações pendentes. Cada pendência deve informar:

- qual acordo foi afetado;
- quem iniciou a solicitação;
- o que o usuário precisa decidir;
- prazo ou consequência, quando houver;
- botões diretos e objetivos.

Usar fundo suave (`var(--secondary)`), ícone primário e borda discreta. Reservar vermelho apenas para cancelamento ou situação crítica.

### Melhorias nos cards

No estado recolhido, mostrar somente:

- título do serviço;
- nome e papel da outra parte;
- status atual;
- valor acordado;
- prazo de conclusão;
- próxima ação recomendada.

Os detalhes de proposta, descrição e histórico de alteração ficam na expansão **Ver detalhes do acordo**. Isso reduz a altura inicial dos cards e facilita a comparação entre vários freelas.

Adicionar um pequeno indicador de etapas para acordos ativos:

`Acordo aceito → Pagamento → Em andamento → Conclusão → Avaliação`

A etapa atual usa `var(--primary)`; etapas concluídas usam sucesso; futuras usam `var(--border-color)`. No celular, o indicador pode virar uma lista vertical curta.

### Organização das ações

- A ação principal deve refletir o momento: **Pagar agora**, **Marcar como concluído** ou **Avaliar**.
- **Abrir conversa** permanece secundária e deve apontar para a conversa do acordo específico, quando a rota permitir.
- **Solicitar alteração** e **Solicitar cancelamento** devem ficar em **Mais ações**, reduzindo a competição visual.
- Pedidos irreversíveis ou sensíveis continuam usando diálogo de confirmação.

## Minhas candidaturas

### Estrutura sugerida

- Cabeçalho padronizado.
- Indicadores: em análise, aprovadas e não selecionadas.
- Abas segmentadas: **Em andamento** e **Histórico**. Esses nomes são mais claros que **Ativas** e **Finalizadas** para esse contexto.
- Filtro opcional por status dentro do histórico, caso a lista cresça.

### Melhorias nos cards

Cada card pode mostrar:

- título do anúncio;
- contratante e categoria, se disponíveis;
- data de envio da proposta;
- valor e prazo propostos;
- badge de status;
- mensagem curta explicando o status;
- ação adequada ao estado.

Para candidaturas em análise, usar **Ver anúncio** como ação principal. **Ver conversa** só deve aparecer quando existir uma conversa relacionada. Para candidaturas aprovadas, destacar **Ir para o freela**. Para recusadas, encerradas ou expiradas, oferecer apenas **Ver detalhes**, sem botão desabilitado ocupando destaque.

Evitar aplicar opacidade e escala de cinza ao card inteiro, pois isso prejudica a leitura. Um badge neutro, uma faixa lateral e ações menos proeminentes já comunicam que o item está encerrado.

### Texto de status sugerido

- **Em análise:** “O anunciante ainda está avaliando as candidaturas.”
- **Aprovada:** “Sua proposta foi aceita. Acompanhe o acordo em Meus freelas.”
- **Recusada:** “O anunciante escolheu outra proposta.”
- **Anúncio vencido:** “O prazo do anúncio terminou antes da seleção.”
- **Encerrada:** “Este processo foi encerrado pelo anunciante.”

## Responsividade e acessibilidade

- Em telas abaixo de 768 px, empilhar conteúdo e ações; botões principais ocupam a largura do card.
- Remover divisórias verticais dos cards no celular e substituí-las por uma borda superior.
- Garantir área mínima de toque de 44 px nos botões e abas.
- Manter contraste suficiente nos badges nos temas claro e escuro.
- Não comunicar status somente por cor: combinar cor, ícone e texto.
- Usar `aria-current`, `aria-selected`, `aria-expanded` e rótulos descritivos nas ações.
- Aplicar skeletons com o formato dos cards durante o carregamento, evitando saltos bruscos do layout.
- Preservar mensagens de erro e sucesso próximas da ação que as originou.

## Componentes e estilos recomendados

Para reduzir estilos inline e manter consistência, criar componentes ou classes compartilhadas para:

- `page-header`;
- `summary-grid` e `summary-item`;
- `segmented-tabs` e `segmented-tab`;
- `management-card`, `management-card__meta` e `management-card__actions`;
- `status-badge` com variantes;
- `empty-state`;
- `attention-panel`;
- `agreement-progress`;
- `more-actions-menu`.

Esses estilos devem usar exclusivamente os tokens já existentes, como `var(--primary)`, `var(--secondary)`, `var(--accent)`, `var(--surface-color)`, `var(--bg-color)`, `var(--text-color)`, `var(--text-secondary)`, `var(--border-color)`, `var(--success-color)` e `var(--danger-color)`.

## Ordem de implementação sugerida

1. Extrair cabeçalho, abas, badges e estados vazios compartilhados.
2. Refatorar **Meus anúncios** como referência visual por ser a página mais simples.
3. Aplicar o padrão em **Minhas candidaturas** e ajustar os textos e ações por status.
4. Reorganizar **Meus freelas**, separando pendências, resumo e detalhes expansíveis.
5. Validar os três layouts em 320 px, 768 px e desktop, nos temas claro e escuro.

O resultado esperado é uma área de gestão mais sóbria, consistente e fácil de percorrer, mantendo o caráter acolhedor da paleta atual sem depender de excesso de cores, sombras ou botões concorrentes.
