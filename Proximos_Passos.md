# Etapas que devem ser implementadas a seguir no projeto

    - Trocar a API de pagamento pelo Stripe.

    - Sistema de reputação. Verificar quantos pontos são somados ou diminuídos com base nas denúncias que o usuário recebeu que foram julgadas como procedentes. Nas solicitações de cancelamento que ele enviou e foram aprovadas. E das avaliações negativas recebidas.
    Crie um arquivo 'Reputacao.md' sugerindo como pode ser o funcionamento do termômetro de reputação considerando a estrutura atual do projeto e os critérios de avaliação. A ideia inicial é que quando um usuário recebe denúncias que são julgadas como procedentes ele perde pontos de reputação.
    Quando um usuário solicita o cancelamento de um freela/acordo e essa solicitação é aprovada, ele também perde ponstos de reputação.
    Quando um usuário recebe uma avaliação 2 ou 1 estrelas em algum critério ele também perde pontos. Mas uma avaliação baixa tem um peso um pouco menor do que denúncias ou cancelamentos.
    O que eu gostaria de saber é: como ficaria a "matemática" disso? Quantos pontos deduzir em cada infração citada acima? A reputação pode ser renovada após um tempo em que, por exemplo, o usuário não solicitou mais nenhum cancelamento, ou essa renovação não faria sentido? Como avisar ao usuário, como uma espécie de "strike" que ele está com a reputação baixa e que a conta dele corre risco de ser banida após muitas denúncias.
    A ideia é fazer com o que existe de recursos e ferramentas no projeto.


    - Sistema de reputação
    A reputação dos usuário será medida através de acordo com as avaliações, variando de 1 a 5, sendo 1 a mais baixa, e, 5 a mais alta. 
A plataforma também contará com um sistema de pontuação de infrações, através do qual usuários perderão pontos ao serem denunciados, receberem avaliações negativas válidas, cancelarem muitos acordos. A acumulação excessiva de pontos de infração resulta em banimento permanente da plataforma.
Se um usuário acumular 5 ou mais denúncias improcedentes dentro de uma janela de 30 dias corridos e a taxa de improcedência dessas denúncias for igual ou superior a 50% do total de denúncias que ele enviou no mesmo período, ele receberá um soft ban de denúncias: perderá o direito de enviar novas denúncias pelos próximos 15 dias.