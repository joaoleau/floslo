export const terms = {
  terms: {
    title: 'Termos e privacidade',
    heading: 'Termos de uso e Política de privacidade',
    updatedAt: 'Versão de {{version}}',
    acceptBefore: 'Li e aceito os ',
    acceptLink: 'Termos de uso e a Política de privacidade',
    acceptAfter: ', inclusive o armazenamento dos meus dados nos Estados Unidos.',
    acceptRequired: 'Para criar a conta, leia e aceite os Termos de uso e a Política de privacidade.',
    aiNotice: 'Gerado por IA a partir do seu material. Pode conter erros.',
    sections: {
      about: {
        title: '1. Sobre o Floslo',
        body: 'O Floslo é um aplicativo de estudo que transforma os materiais enviados por você em desafios de alarme. Ele é um protótipo acadêmico, desenvolvido como Trabalho de Conclusão de Curso, e é oferecido sem garantia de disponibilidade: pode ficar fora do ar, mudar ou ser encerrado.\n\nO responsável pelo tratamento dos seus dados (controlador) é João Vitor Leal de Castro. Para qualquer dúvida ou pedido sobre os seus dados, escreva para joaoo.lealc@gmail.com.',
      },
      data: {
        title: '2. Dados que coletamos',
        body: 'Conta: e-mail, nome de usuário e senha. A senha nunca é guardada como foi digitada, só de forma cifrada (hash).\n\nMateriais: os documentos PDF que você envia, o texto extraído deles e as tags de cada um.\n\nUso: os agendadores que você cria, a sua sequência de dias de estudo e a data do aceite destes termos.\n\nO histórico de respostas (acertos, erros e sessões) fica guardado só no seu celular, e não nos nossos servidores.',
      },
      purpose: {
        title: '3. Para que usamos os dados',
        body: 'Usamos os dados apenas para fazer o app funcionar: criar e manter sua conta, processar seus materiais, gerar os desafios de cada alarme, contar sua sequência e enviar o código de recuperação de senha por e-mail. Não vendemos seus dados, não os usamos para publicidade e não os compartilhamos com terceiros além dos serviços de infraestrutura descritos abaixo.\n\nO tratamento se baseia na execução do serviço que você contratou ao criar a conta e no seu consentimento, dado ao aceitar estes termos (Lei Geral de Proteção de Dados, Lei nº 13.709/2018).',
      },
      storage: {
        title: '4. Onde os dados ficam',
        body: 'Todos os dados enviados ao Floslo ficam na Amazon Web Services (AWS), na região us-east-1, no estado da Virgínia, nos Estados Unidos. Isso inclui a conta, os documentos, o texto extraído e os desafios gerados. A geração dos desafios usa o Amazon Bedrock, na mesma região, e a AWS não usa esse conteúdo para treinar modelos de IA.\n\nComo os dados saem do Brasil, há uma transferência internacional de dados. Ao aceitar estes termos, você consente de forma específica com essa transferência (LGPD, art. 33, VIII).',
      },
      ai: {
        title: '5. Conteúdo gerado por inteligência artificial',
        body: 'As perguntas, afirmações, explicações e descobertas são geradas automaticamente por um modelo de inteligência artificial a partir dos seus materiais. Esse conteúdo pode conter erros, imprecisões ou informações que não estão no material (as chamadas alucinações).\n\nUse os desafios como apoio ao estudo, e não como fonte definitiva. Em caso de dúvida, confira o trecho de origem em "Baseado em" e o material original. O Floslo não substitui o material de estudo, um professor ou orientação profissional.',
      },
      copyright: {
        title: '6. Seus materiais e direitos autorais',
        body: 'Você continua dono dos materiais que envia e é responsável por ter o direito de usá-los. Envie apenas conteúdo que você pode usar para estudo pessoal, respeitando os direitos autorais de terceiros.\n\nOs materiais e os desafios gerados a partir deles são usados apenas na sua conta, para o seu estudo, e não são publicados nem compartilhados com outros usuários.',
      },
      rights: {
        title: '7. Seus direitos',
        body: 'Pela LGPD, você pode pedir a confirmação de que tratamos seus dados, o acesso a eles, a correção de dados incompletos ou errados, a eliminação dos dados e informações sobre com quem eles são compartilhados, além de revogar o consentimento.\n\nVocê pode apagar sua conta a qualquer momento em Perfil > Excluir conta. Isso apaga a conta, os documentos, o texto extraído e os agendadores dos nossos servidores. O histórico guardado no celular é apagado ao desinstalar o app ou limpar os dados dele. Para os demais pedidos, escreva para joaoo.lealc@gmail.com.',
      },
      security: {
        title: '8. Segurança',
        body: 'A comunicação entre o app e os servidores é cifrada (HTTPS), a senha é guardada só de forma cifrada e cada conta acessa apenas os próprios dados. Nenhum sistema é totalmente imune a falhas; se acontecer um incidente de segurança que afete seus dados, você será avisado.',
      },
      changes: {
        title: '9. Mudanças nestes termos',
        body: 'Estes termos podem ser atualizados. Quando isso acontecer, a nova versão será apresentada no app, com a data da versão.',
      },
    },
  },
};
