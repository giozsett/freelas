# RT v06 — seções atualizadas (requisitos, regras e modelagem)

Texto para substituir as seções correspondentes do `RT-TDS-2026-09-09_v05.docx`.
Marcação de status: **[ok]** já implementado.

## Atores

- **Visitante**: sem login. Consulta vagas, detalhes de vaga e planos.
- **Freelancer**: se candidata às vagas, firma acordos, conversa no chat e avalia contratantes.
- **Contratante** (pessoa física ou empresa com CNPJ): publica vagas, aprova candidaturas, paga os serviços, conversa no chat e avalia freelancers.
- **Administrador**: superusuário do Django. Modera denúncias, cancelamentos e disputas e acompanha o dashboard.

O papel de cada conta é escolhido no primeiro acesso e **não pode ser alterado**. Quem quiser atuar nos dois papéis precisa de duas contas, com e-mails diferentes.

## Requisitos funcionais

**Conta e perfil**
- **RF01** Cadastro com nome, e-mail e senha, com verificação do e-mail por código. [ok]
- **RF02** Login com e-mail e senha. [ok]
- **RF03** Cadastro e login com Google e com LinkedIn. [ok]
- **RF04** Redefinição de senha por e-mail. [ok]
- **RF05** No primeiro acesso, o usuário escolhe o papel Freelancer ou Contratante, que não pode ser alterado depois. O contratante informa se é pessoa física ou empresa com CNPJ. [ok]
- **RF06** Contas de Administrador existem apenas como superusuário do Django e entram por um login de moderação próprio. [ok]
- **RF07** Edição de perfil conforme o papel. Freelancer: dados pessoais, foto, banner, categorias, habilidades, experiências, certificados, currículo em PDF e disponibilidade. Contratante: serviços que costuma contratar e como trabalha com freelancers; se for empresa com CNPJ, também nome, o que a empresa faz, ramos de atuação, porte, ano de fundação, responsável pelas contratações, CNPJ (não exibido publicamente) e site. Os dois: redes sociais, localização e visibilidade de e-mail e telefone. [ok]
- **RF08** Exclusão da própria conta (exclusão lógica). [ok]

**Visitante**
- **RF09** O visitante consulta vagas, detalhes de vaga e planos de assinatura. Candidatar-se e assinar exigem login. [ok]

**Anúncios (vagas)**
- **RF10** Somente o contratante publica anúncios de vaga. [ok]
- **RF11** O autor edita e exclui suas vagas. Vaga com acordo não pode ser excluída. [ok]
- **RF12** Listagem de vagas com filtros por categoria, habilidade, modalidade (remoto/presencial), estado/cidade, faixa de valor e título. [ok]

**Candidaturas**
- **RF13** Somente o freelancer se candidata a vagas, com mensagem de proposta e, opcionalmente, contraproposta de valor. [ok]
- **RF14** O contratante aprova ou recusa candidaturas. A aprovação encerra as demais e cria o acordo de serviço. [ok]
- **RF15** O freelancer acompanha as candidaturas enviadas e o contratante acompanha as recebidas. [ok]

**Acordo de serviço**
- **RF16** Qualquer parte solicita alteração de valor, descrição ou prazo, e a outra parte decide. [ok]
- **RF17** O contratante paga o valor acordado + 10% de taxa pelo Stripe. O acordo só inicia após a confirmação do pagamento pelo webhook. [ok]
- **RF18** O acordo é cancelado automaticamente se o pagamento não for feito dentro do prazo, e a vaga volta a receber candidaturas. [ok]
- **RF19** O freelancer marca o serviço como entregue/realizado e o contratante confirma a conclusão. Sem resposta dentro do prazo, a conclusão é automática. [ok]
- **RF20** Qualquer parte relata um problema no acordo (não compareceu, não entregou, fora do combinado, desistência, outro) e o administrador decide entre cancelar o acordo (com estorno ao contratante, se já pago) ou mantê-lo (concluindo-o, se o serviço já foi entregue), indicando se alguma parte recebe ponto de infração. [ok]

**Comunicação**
- **RF21** Chat em tempo real entre as partes do acordo, disponível após a aprovação da candidatura. [ok]
- **RF22** Notificações em tempo real sobre candidaturas, acordos, prazos, pagamentos, avaliações e moderação. [ok]

**Avaliação**
- **RF23** Avaliação mútua por critérios (nota de 1 a 5, comentário opcional) após a conclusão. A reputação aparece no perfil e nas vagas; o perfil mostra somente a reputação do papel da conta (de freelancer ou de contratante). [ok]

**Assinaturas e pagamentos**
- **RF24** Planos Gratuito, Gold e Platinum. Para o contratante o plano limita as vagas publicadas por mês; para o freelancer, as candidaturas enviadas por mês. Ao atingir o limite, a ação é bloqueada. Assinantes Gold e Platinum têm vagas e candidaturas exibidas em destaque, com selo do plano. [ok]
- **RF25** Assinar, cancelar (estorno integral em até 7 dias) e trocar de plano, com renovação mensal automática. [ok]
- **RF26** Histórico de pagamentos. [ok]

**Moderação**
- **RF27** Denunciar usuário ou anúncio (somente usuário autenticado; não é possível denunciar a si mesmo nem o próprio anúncio). [ok]
- **RF28** O administrador julga denúncias e disputas; o denunciante e as partes da disputa são notificados do resultado. [ok]
- **RF29** Dashboard administrativo com indicadores por período (usuários por papel, acordos, assinaturas, denúncias). [ok]

## Requisitos não funcionais

- **RNF01** Funciona nas versões atuais de Chrome, Edge e Firefox.
- **RNF02** Interface responsiva, de 360 px até desktop.
- **RNF03** Autenticação segura: hash de senha do Django, política de senha forte, token nas chamadas à API e OAuth 2.0 (Google e LinkedIn).
- **RNF04** Toda regra de papel e de permissão é validada no backend. O frontend apenas reflete essas regras.
- **RNF05** Chaves e segredos ficam só nos arquivos `.env`, fora do Git. O webhook do Stripe é validado por assinatura e é idempotente.
- **RNF06** Stripe em modo de teste, com Checkout hospedado: nenhum dado de cartão passa pelo servidor da aplicação.
- **RNF07** LGPD: exclusão lógica (soft delete), controle de visibilidade de e-mail e telefone (respeitado também pela API pública de perfil) e exclusão de conta pelo próprio usuário.
- **RNF08** Mensagens do chat entregues em cerca de 1 s na rede local (Django Channels + Redis Pub/Sub), com histórico gravado no PostgreSQL.
- **RNF09** Operações críticas (aprovação de candidatura, pagamento, decisões de moderação) rodam em transação atômica com bloqueio de linha.
- **RNF10** Execução local em Windows 10/11 com um único comando (`npm run dev:checkout`), usando o PostgreSQL do Supabase compartilhado pelo grupo.
- **RNF11** Testes do backend (`manage.py test`) e lint do frontend (`npm run lint`) sem erros novos antes de integrar na `main`.
- **RNF12** Tema claro/escuro e identidade visual por papel (freelancer/contratante).
- **RNF13** Tecnologias: React + Vite (Node.js), Django + Django REST Framework, PostgreSQL (Supabase), Redis, Stripe, Cloudinary, OAuth do Google e do LinkedIn.

## Regras de negócio

- **RN01** Cada conta tem um único papel (Freelancer, Contratante ou Administrador), definido no primeiro acesso e imutável. Um e-mail corresponde a uma conta.
- **RN02** O administrador não publica vagas, não se candidata e não participa de acordos.
- **RN03** Somente o contratante publica anúncios (vagas) e somente o freelancer se candidata.
- **RN04** Em todo acordo, o autor da vaga é o contratante e quem se candidatou é o freelancer. Somente o contratante paga.
- **RN05** Taxa da plataforma de 10% sobre o valor acordado, paga pelo contratante junto com o valor do serviço. O pagamento fica em custódia (simulada) até a conclusão.
- **RN06** Prazo de pagamento: 72 h após a aprovação da candidatura (configurável). Pagamento aprovado depois do cancelamento é estornado automaticamente. [ok]
- **RN07** Somente o freelancer marca a entrega e somente o contratante confirma a conclusão. Conclusão automática 3 dias após a entrega, se não houver problema relatado pendente. [ok]
- **RN08** Disputa decidida contra uma parte gera +1 ponto de infração. Quando o acordo pago é cancelado pela moderação, o estorno ao contratante é integral. A parte infratora é indicada pelo administrador. [ok]
- **RN09** Denúncia procedente gera +1 ponto de infração. Com 3 pontos, o banimento é permanente: login e sessões bloqueados e anúncios ocultos. Cada denúncia é julgada uma única vez. [ok]
- **RN10** Soft ban de denúncias: quem tiver 5 ou mais denúncias improcedentes nos últimos 30 dias, representando 50% ou mais das enviadas no período, fica impedido de denunciar enquanto a condição durar. [ok]
- **RN11** Limites mensais dos planos:

  | Plano | Vagas publicadas (contratante) | Candidaturas enviadas (freelancer) |
  |---|---|---|
  | Gratuito (R$ 0) | 3 | 5 |
  | Gold (R$ 29,90) | 6 | 20 |
  | Platinum (R$ 79,90) | ilimitadas | ilimitadas |

- **RN12** A vaga vence 30 dias após a publicação.
- **RN13** Direito de arrependimento (CDC, art. 49): cancelamento da assinatura em até 7 dias com estorno integral. Depois disso, o cancelamento só interrompe a renovação.
- **RN14** A plataforma não gera contrato com validade jurídica.
- **RN15** Uma avaliação por parte e por acordo concluído.
- **RN16** O chat existe só entre as partes de um acordo, depois da aprovação da candidatura.

## Ajustes na modelagem

Os diagramas atualizados (casos de uso, classes, estados, DER e containers) estão em [`rt-v06-diagramas.md`](rt-v06-diagramas.md).

- **Casos de uso:** acrescentar o ator Visitante (Consultar vagas, Consultar planos). "Postar anúncio" é do Contratante e "Enviar candidatura" é do Freelancer. Acrescentar "Marcar entrega" (Freelancer), "Confirmar conclusão" (Contratante), "Relatar problema" (ambos) e "Julgar disputa" (Administrador).
- **Estados do acordo:** Pendente Pagamento → Ativo → Aguardando confirmação → Concluído, ou Cancelado (motivo: prazo de pagamento expirado ou decisão da moderação). Candidatura: pendente, aprovada, recusada, encerrada (outra foi aprovada) e cancelada (o acordo foi cancelado).
- **Diagrama de classes:** `Anuncio` passa a ser uma classe única (vaga do contratante). As especializações `AnuncioContratante` e `AnuncioFreelancer` saem. `Usuario.papel` ∈ {freelancer, contratante, administrador}.
- **DER:** gerar a partir das tabelas usadas pelo Django: `usuarios`, `anuncios`, `candidaturas`, `acordo_servico`, `solicitacoes_alteracao_acordo`, `solicitacoes_cancelamento_acordo`, `pagamentos`, `avaliacoes`, `criterios_avaliacao`, `mensagens_chat`, `notificacoes`, `denuncias`, `certificados`, `experiencias`, `instituicoes_ensino`, `codigos_verificacao_email`. As tabelas legadas do Supabase (`anuncios_freelancer`, `anuncios_contratante`, `conversas`, `assinaturas`, `denuncia_usuario`, `denuncia_anuncio`, `cancelamento_acordo`, `alteracoes_acordo`, `core_ad`, `core_userprofile`, `cartoes_usuario`) ficam fora do DER.
- **Chat:** as mensagens são gravadas direto no PostgreSQL. O Redis é usado só como Pub/Sub para entregar a mensagem em tempo real.
- **Nome do sistema:** usar "Freelas" (o diagrama de contexto do v05 cita "FreeLink").
