# Freelas
- Projeto de plataforma para freelancers que buscam oportunidades de emprego e contratantes que desejam contratar os serviços de um profissional freelancer.
- Usuários devem ter a possibilidade de postar anúncios de trabalho remotos e presenciais como freelancer ou contratante; editar e excluir anúncios que postaram; candidatar-se nos anúncios postados por outros usuários; aprovar solicitações de candidatura nos anúncios que postaram; solicitar alterações ou cancelamentos dos acordos de serviço (gerados após a aprovação da candidatura); trocar mensagens sobre o freela (acordo de serviço) em um chat; avaliar-se mutuamente após a conclusão de um serviço; denunciar um usuário cuja conduta julguem imprópria;


## REGRAS DE NEGÓCIO
- A plataforma não gera contratos de validade jurídica para cada candidatura aprovada.
- O limite de anúncios que cada usuário pode postar por mês é definido por seu plano de assinatura;
- A plataforma cobra uma taxa de 10% sobre o valor total de cada acordo fechado.
- Cada anúncio possui um prazo de 30 dias, após isso ele é considerado como vencido, para preservar o sistema de planos de assinatura.
- Usuários que fizerem muitas denúncias em um curto período de tempo deve tomar um soft ban, suas denúncias não serão mais consideradas por um tempo.


### Páginas
- Login: usuários efetuam login com email e senha (possibilidade de fazer login com conta do google)
- Cadastro: usuários podem criar uma conta com nome, email e senha (possibilidade de cadastro com conta do google)

- Lista de anúncios: usuários podem ver os anúncios ativos de forma resumida, filtrando pelo papel de freelancer ou contratante, e utilizando os filtros de valor, local, e categoria deserviço e habilidades na barra lateral.
- Criar Anuncio: através desta página os usuários poderão criar anúncios como freelancer ou como contratante
- Editar anúncio: o usuário pode editar o anúncio que ele postou
- Visualização do anúncio: visualização das informações detalhadas do anúncio. Visualização da reputação do autor do anúncio, descrição, disponibilidade (se for freelancer), prazo, se for contratante, etc
    - Área do anunciante: aba dentro da visualização do anúncio onde o autor visualiza as solicitações recebidas no anúncio, etc
    - Candidatura: modal de envio de solicitação de candidatura em um anúncio (presente na página de visualização do anúncio)

- Meu perfil: o usuário logado visualiza seu próprio perfil
    - O usuário pode editar o prórpio perfil.
    - É possível visualizar habilidades e competências.
    - É possível visualizar a formação acadêmica.
    - É possível visualizar as avaliações que esse usuário recebeu de outros usuários.
- Perfil de outros usuários: o usuário logado visualiza o perfil de outros usuários

- Denúncia: denúncias podem ser enviadas no chat, no perfil do usuário e no anúncio.

- Minhas Candidaturas: O usuário acompanha o status das candidaturas enviadas, se estão pendentes, aprovadas, rejeitadas, etc

- Meus anúncios: o usuário visualiza um resumo dos anúncios que ele postou, podendo ver anúncios ativos, finalizados, vencidos, etc

- Meus Freelas: aqui ficam os acordos de serviço. É possível visualizar os acordos que estão com pagamento pendente, pagamento efetuado e serviço em andamento, já concluídos, etc
    Também na página 'Meus Freelas' deve ser possível solicitar o cancelamento ou alteração de um acordo, redirecionar para a API de pagamento para que seja efetuado o pagamento do serviço.
    - Por enquanto a verificação da conclusão de um serviço está em um botão que o usuário apenas marca como concluído.

- Minhas avaliações: quando um serviço é concluído ambas as partes, contratante e freelancer, devem se avaliar mutuamente. Nesta página devem ficar as avaliações pendentes para que o usuário avalie em estrelas e escreva um comentário opcional. 
    Através desta página o usuário também pode ver as avaliações que ele já enviou.

- Meus pagamentos: Aqui fica o histórico de pagamentos de assinaturas e de serviços/freelas e os cartões que o usuário deixou cadastrados para pagamentos.

- Planos e Assinaturas: possibilidade de visualização e escolha de um dos planos de assinatura disponíveis.

- Painel da administração
    - Há um login para contas de administradores.
    - Administradores acessam a dashboard da plataforma.
    - Administradores podem julgar denúncias como 'procedentes' ou 'improcedentes' e visualizar as denúncias pendentes e já julgadas.
    - Administradores podem julgar solicitações de cancelamento.
    - Administradores podem visualizar solicitações de alterações de acordo (mas estas devem ser aprovadas pelo usuário que está no acordo que é o "destinatário" da solicitação de alteração)

- Chat
    - Conversa entre as partes de um acordo/ freela (SERÁ IMPLEMENTADO POSTERIORMENTE)
