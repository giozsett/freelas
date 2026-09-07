# Etapas que devem ser implementadas a seguir no projeto

    - Trocar a API de pagamento pelo Stripe.

    - Sistema de reputação. Verificar quantos pontos são somados ou diminuídos com base nas denúncias que o usuário recebeu que foram julgadas como procedentes. Nas solicitações de cancelamento que ele enviou e foram aprovadas. E das avaliações negativas recebidas.
    Crie um arquivo 'Reputacao.md' sugerindo como pode ser o funcionamento do termômetro de reputação considerando a estrutura atual do projeto e os critérios de avaliação. A ideia inicial é que quando um usuário recebe denúncias que são julgadas como procedentes ele perde pontos de reputação.
    Quando um usuário solicita o cancelamento de um freela/acordo e essa solicitação é aprovada, ele também perde ponstos de reputação.
    Quando um usuário recebe uma avaliação 2 ou 1 estrelas em algum critério ele também perde pontos. Mas uma avaliação baixa tem um peso um pouco menor do que denúncias ou cancelamentos.
    O que eu gostaria de saber é: como ficaria a "matemática" disso? Quantos pontos deduzir em cada infração citada acima? A reputação pode ser renovada após um tempo em que, por exemplo, o usuário não solicitou mais nenhum cancelamento, ou essa renovação não faria sentido? Como avisar ao usuário, como uma espécie de "strike" que ele está com a reputação baixa e que a conta dele corre risco de ser banida após muitas denúncias.
    A ideia é fazer com o que existe de recursos e ferramentas no projeto.

    - Critérios de avaliações. 
    Crie um arquivo chamado 'Criterios_Novos.md' com sugestões de melhorias nos atuais critérios de avaliação. Considere que os critérios para freelancer e contratante devem ser diferentes. Essas notas em critérios vão compor as mensagens prontas na tela de visualização do anúncio abaixo do termômetro de reputação. Na plataforma haverá propostas presenciais e remotas de serviço. Cada avaliação deve possuir apenas 3 notas (em estrelas), ou seja, 3 critérios. Verifique o banco do supabase pois nele há uma tabela para os critérios de avaliação, sugira colunas que podem ser adicionadas nele para que as avaliações fiquem mais adequadas.

    - 