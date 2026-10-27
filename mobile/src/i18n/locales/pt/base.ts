// Textos gerais, autenticação, permissões, perfil e manual de uso, em português.
export const base = {
  common: {
    ok: 'OK',
    cancel: 'Cancelar',
    delete: 'Excluir',
    save: 'Salvar',
    attention: 'Atenção',
    error: 'Erro',
    success: 'Sucesso',
    retry: 'Tentar novamente',
    loadFailed: 'Não foi possível carregar os dados.',
    understood: 'Entendi',
    selected_one: '{{count}} selecionado',
    selected_other: '{{count}} selecionados',
    crashed: 'Algo deu errado. Feche e abra o app novamente.',
  },
  errors: {
    network: 'Sem conexão com o servidor. Confira sua internet e tente de novo.',
    api: {
      invalidCredentials: 'Usuário, e-mail ou senha incorretos.',
      invalidCode: 'Código inválido ou expirado.',
      usernameTaken: 'Esse apelido já está em uso.',
      usernameRequired: 'Informe o nome de usuário.',
      emailRequired: 'Informe o e-mail.',
      passwordRequired: 'Informe a senha.',
      weakPassword: 'A senha precisa ter pelo menos 8 caracteres, com pelo menos 1 letra e 1 número.',
      currentPasswordRequired: 'Informe a senha atual para definir uma nova.',
      currentPasswordIncorrect: 'A senha atual está incorreta.',
      documentNeedsTag: 'O documento precisa ter pelo menos uma tag.',
      noChallenge: 'Não foi possível gerar desafios para este alarme.',
      noChunks: 'Os documentos deste agendador ainda não têm conteúdo processado.',
      noChallengeTypes: 'O agendador não tem nenhum tipo de desafio configurado.',
      weekdayRequired: 'Escolha pelo menos um dia da semana.',
      documentRequired: 'Escolha pelo menos um documento.',
      schedulerNameRequired: 'Dê um nome ao agendador.',
      startTimeRequired: 'Escolha o horário do alarme.',
      objectNotFound: 'Documento não encontrado.',
      schedulerNotFound: 'Agendador não encontrado.',
    },
  },
  auth: {
    email: 'E-mail',
    password: 'Senha',
    passwordRules: {
      minLength: 'Pelo menos 8 caracteres',
      hasLetter: 'Pelo menos 1 letra',
      hasNumber: 'Pelo menos 1 número',
    },
    weakPassword: {
      title: 'Senha fraca',
      message: 'Sua senha precisa atender aos requisitos listados abaixo do campo.',
      newMessage: 'Sua nova senha precisa atender aos requisitos listados abaixo do campo.',
    },
    login: {
      usernameOrEmail: 'Usuário ou e-mail',
      forgotPassword: 'Esqueceu a senha?',
      submit: 'Entrar',
      noAccount: 'Não tem uma conta?',
      signUp: 'Cadastre-se',
      fieldsRequired: 'Preencha usuário ou e-mail e senha.',
      failed: 'Não foi possível entrar. Tente de novo.',
    },
    register: {
      title: 'Criar conta',
      username: 'Nome de usuário',
      submit: 'Cadastrar',
      fieldsRequired: 'Preencha todos os campos.',
      failed: 'Não foi possível criar a conta. O nome de usuário ou o e-mail podem já estar em uso.',
    },
    forgot: {
      title: 'Recuperar senha',
      instructions: 'Digite seu e-mail para receber um código de recuperação.',
      sendCode: 'Enviar código',
      emailRequired: 'Preencha o e-mail cadastrado.',
      failed: 'Não foi possível enviar o e-mail.',
    },
    verify: {
      title: 'Verificar código',
      // Antes e depois do e-mail, que aparece em destaque entre as duas partes.
      instructionsBefore: 'Digite o código de {{length}} dígitos enviado para ',
      instructionsAfter: '.',
      resend: 'Não recebeu? Reenviar código',
      invalidTitle: 'Código inválido',
      invalid: 'Código inválido ou expirado. Tente novamente.',
      resentTitle: 'Código reenviado',
      resent: 'Enviamos um novo código para o seu e-mail.',
      resendFailed: 'Não foi possível reenviar o código.',
    },
    newPassword: {
      title: 'Nova senha',
      instructions: 'Escolha uma nova senha para sua conta.',
      newPassword: 'Nova senha',
      confirm: 'Confirmar nova senha',
      submit: 'Trocar senha',
      fieldsRequired: 'Preencha a nova senha e a confirmação.',
      mismatch: 'A confirmação não é igual à nova senha.',
      changed: 'Sua senha foi alterada.',
    },
  },
  permissions: {
    enableNow: 'Ativar agora',
    exactAlarm: {
      title: 'Permissão necessária',
      description:
        'Sem "Alarmes e lembretes" ativado, seus agendadores podem não disparar na hora certa. Ative essa permissão para o Floslo nas configurações do Android.',
    },
    fullScreen: {
      title: 'Alarme em tela cheia',
      description:
        'Sem "Notificações em tela cheia" ativado, o alarme só aparece como notificação e a tela dos desafios não abre sozinha com o celular bloqueado. Ative essa permissão para o Floslo nas configurações do Android.',
    },
  },
  profile: {
    title: 'Perfil',
    loadFailed: 'Não foi possível carregar seu perfil.',
    usernameRequired: 'O apelido não pode ficar em branco.',
    usernameFailed: 'Não foi possível salvar. O apelido pode já estar em uso.',
    logout: 'Sair',
    password: {
      title: 'Trocar senha',
      current: 'Senha atual',
      submit: 'Confirmar troca',
      fieldsRequired: 'Preencha sua senha atual, a nova senha e a confirmação.',
      failed: 'Não foi possível trocar a senha.',
    },
    theme: {
      title: 'Aparência',
      light: 'Claro',
      dark: 'Escuro',
      system: 'Automático',
    },
    language: {
      title: 'Idioma',
      pt: 'Português',
      en: 'English',
      system: 'Automático',
      hint: 'Muda os textos do app. O idioma dos desafios é escolhido em cada agendador.',
    },
    deleteAccount: {
      title: 'Excluir conta',
      confirm: 'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.',
      failed: 'Não foi possível excluir a conta.',
    },
  },
  onboarding: {
    skip: 'Pular',
    next: 'Próximo',
    start: 'Começar',
    materials: {
      title: 'Envie seus materiais',
      description:
        'Na aba Objetos, envie seus documentos em PDF. O app lê o conteúdo e identifica os principais assuntos de cada um, as tags, que você pode revisar e ajustar.',
    },
    scheduler: {
      title: 'Crie um agendador',
      description:
        'Escolha o horário, os dias da semana e os documentos de estudo. Quando o alarme tocar, ele só desliga depois que você responder todos os desafios.',
    },
    challenges: {
      title: 'Escolha os desafios',
      description:
        'Em cada agendador, defina quantos itens de Descoberta, Múltipla escolha e Verdadeiro ou Falso cada alarme traz, até 10 no total, e o idioma em que eles são escritos.',
    },
    alarm: {
      title: 'Deixe o alarme tocar',
      description:
        'Ative as permissões de alarmes e de notificações em tela cheia, para o alarme tocar na hora certa e abrir sozinho com o celular bloqueado. A tela inicial avisa quando falta alguma.',
    },
    streak: {
      title: 'Acompanhe sua sequência',
      description:
        'Cada dia de estudo conta na sua sequência. No Histórico você vê o desempenho por assunto, os erros recentes e as sessões que já respondeu.',
    },
  },
};
