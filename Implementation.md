# Freelas
- Projeto de plataforma para freelancers que buscam oportunidades de emprego e contratantes que desejam contratar os serviços de um profissional freelancer.
- Cada conta tem um papel fixo, escolhido no primeiro acesso: freelancer ou contratante (pessoa física ou empresa). Contas de administração são superusuários do Django.
- Contratantes publicam anúncios de vaga remotos e presenciais, editam e excluem as vagas que postaram e aprovam candidaturas; freelancers se candidatam às vagas; solicitar alterações ou cancelamentos dos acordos de serviço (gerados após a aprovação da candidatura); trocar mensagens sobre o freela (acordo de serviço) em um chat; avaliar-se mutuamente após a conclusão de um serviço; denunciar um usuário cuja conduta julguem imprópria;


## REGRAS DE NEGÓCIO
- O papel da conta (freelancer, contratante ou administrador) é definido no primeiro acesso e não pode ser alterado. Quem quiser atuar nos dois papéis precisa de duas contas.
- Somente contratantes publicam anúncios (vagas) e somente freelancers se candidatam. Em todo acordo, o autor da vaga é o contratante e é ele quem paga.
- A plataforma deve permitir que usuários não autenticados possam navegar na plataforma, visualizar assinaturas, etc.
- A plataforma não gera contratos de validade jurídica para cada candidatura aprovada.
- O limite de anúncios que cada contratante pode postar por mês é definido por seu plano de assinatura (Gratuito: 3, Gold: 6, Platinum: ilimitado);
- O limite de candidaturas que cada freelancer pode enviar por mês também é definido por seu plano de assinatura (Gratuito: 5, Gold: 20, Platinum: ilimitado);
- A plataforma cobra uma taxa de 10% sobre o valor total de cada acordo fechado.
- Cada anúncio possui um prazo de 30 dias, após isso ele é considerado como vencido, para preservar o sistema de planos de assinatura.
- Usuários que fizerem muitas denúncias em um curto período de tempo deve tomar um soft ban, suas denúncias não serão mais consideradas por um tempo.
- Direito de arrependimento (Art. 49 do CDC): como a contratação de assinaturas ocorre inteiramente fora do estabelecimento comercial (checkout online), o usuário pode cancelar em até 7 dias corridos da contratação e recebe estorno integral do valor pago via Stripe, com o plano voltando a ser Gratuito imediatamente.
- Após esse prazo de 7 dias, o cancelamento não gera estorno: apenas interrompe a renovação automática, e o usuário mantém acesso ao plano pago até o fim do período já pago.
- Assinaturas pagas são renovadas automaticamente a cada 1 mês via Stripe, até que o usuário cancele.


### Páginas
- Login: usuários efetuam login com email e senha (possibilidade de fazer login com conta do google)
- Cadastro: usuários podem criar uma conta com nome, email e senha (possibilidade de cadastro com conta do google)

- Lista de anúncios: visitantes e usuários veem as vagas ativas de forma resumida, utilizando os filtros de valor, local, categoria de serviço e habilidades na barra lateral.
- Criar Anuncio: através desta página os contratantes criam anúncios de vaga
- Editar anúncio: o usuário pode editar o anúncio que ele postou
- Visualização do anúncio: visualização das informações detalhadas da vaga. Visualização da reputação do contratante, descrição, prazo, etc
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

### PAGAMENTOS
    + O checkout dos pagamentos de assinaturas e de freelas são realizados através do Stripe.

#### Telas
- Meus pagamentos: histórico de pagamentos já realizados.
    Também é possível cancelar a assinatura atual nesta tela; o cancelamento é feito via API do Stripe e segue a regra de arrependimento do Art. 49 do CDC.


### PLANOS E ASSINATURAS
- Há 3 planos de assinatura disponíveis:
    + Gratuito: 
        3 anúncios por mês
        5 candidaturas por mês

    + Gold: 
        6 anúncios por mês
        20 candidaturas por mês

    + Platinum: 
        anúncios ilimitados
        candidaturas ilimitadas


### PAINEL DA ADMINISTRAÇÃO
    - Há um login para contas de administradores.
    - Administradores acessam a dashboard da plataforma.
        - Na dashboard podem ser visualizadas as informações sobre assinaturas dos usuários, quantidades de freelas, denúncias filtrando por tempo.
    - Administradores podem julgar denúncias como 'procedentes' ou 'improcedentes' e visualizar as denúncias pendentes e já julgadas.
    - Administradores podem julgar solicitações de cancelamento.
    - Administradores podem visualizar solicitações de alterações de acordo (mas estas devem ser aprovadas pelo usuário que está no acordo que é o "destinatário" da solicitação de alteração)


### CHAT
    - Conversa entre as partes de um acordo/ freela
    - O chat é referente a um 'freela', e dois usuários só podem trocar mensagens após a aprovação da candidatura no anúncio.
