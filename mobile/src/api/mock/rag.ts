// src/api/mock/ragResponse.ts

import { RAGDTO } from '@/types/api/RAGDTO'; // Ajuste o caminho conforme necessário

export const ragResponseMock: RAGDTO = {
  scheduler: {
    scheduler_id: 'sch_02',
    name: 'Estudar React Native',
    week_days: ['tuesday', 'thursday'],
    start_time: '20:00',
    alarm_sound: { name: 'chic_pop' },
    object_ids: ['obj_30'],
    challengers: [
      {
        challenge_type: 'QUIZ',
        challenge: {
          difficulty: 'Fácil',
          question_count: 10,
        },
      },
    ],
    is_enabled: false,
    vibration: false,
    created_at: '2026-07-13T18:30:00Z',
    updated_at: '2026-07-13T18:30:00Z',
  },
  challenges: [
    {
      challenge_type: 'QUIZ',
      data: {
        question: 'Qual é o componente base utilizado no React Native que funciona de forma equivalente à tag <div> do HTML no desenvolvimento web?',
        alternatives: [
          {
            id: 'alt_01',
            text: '<Container>',
            correct: false,
          },
          {
            id: 'alt_02',
            text: '<View>',
            correct: true,
          },
          {
            id: 'alt_03',
            text: '<Box>',
            correct: false,
          },
          {
            id: 'alt_04',
            text: '<Section>',
            correct: false,
          },
        ],
        explanation: 'No React Native, o componente <View> é o bloco de construção fundamental para criar interfaces, servindo como um contêiner principal de layout, assim como a <div> faz no HTML.',
        difficulty: 'Fácil',
        tag: 'Fundamentos',
        source_chunks: [
          {
            Content: 'O componente View é o bloco de construção mais fundamental de uma interface de usuário no React Native, mapeando diretamente para a visualização nativa da plataforma sob o capô.',
            Score: 0.95,
            ObjectKey: 'obj_30',
            Page: 12,
            ChunkIndex: 1,
            Language: 'pt-BR',
          },
        ],
      },
    },
    {
      challenge_type: 'QUIZ',
      data: {
        question: 'O que acontece se você NÃO passar o array de dependências (segundo argumento) para o hook useEffect?',
        alternatives: [
          {
            id: 'alt_05',
            text: 'O efeito será executado apenas uma vez na montagem do componente.',
            correct: false,
          },
          {
            id: 'alt_06',
            text: 'O código lançará um erro fatal de compilação.',
            correct: false,
          },
          {
            id: 'alt_07',
            text: 'O efeito será executado após cada renderização do componente.',
            correct: true,
          },
          {
            id: 'alt_08',
            text: 'O efeito será ignorado e nunca será executado.',
            correct: false,
          },
        ],
        explanation: 'Se o array de dependências for omitido completamente, o React entenderá que o useEffect deve rodar em TODAS as renderizações, o que pode facilmente causar loops infinitos se você estiver atualizando um estado dentro dele.',
        difficulty: 'Médio',
        tag: 'React Hooks',
        source_chunks: [
          {
            Content: 'Ao omitir o array de dependências, dizemos ao React para executar o efeito após cada renderização do componente, incluindo a primeira.',
            Score: 0.89,
            ObjectKey: 'obj_30',
            Page: 28,
            ChunkIndex: 3,
            Language: 'pt-BR',
          },
        ],
      },
    },
    {
      challenge_type: 'QUIZ',
      data: {
        question: 'No contexto de estilização com React Native, como a propriedade "flexDirection" se comporta por padrão (default)?',
        alternatives: [
          {
            id: 'alt_09',
            text: 'O valor padrão é "row", alinhando os itens horizontalmente.',
            correct: false,
          },
          {
            id: 'alt_10',
            text: 'O valor padrão é "column", empilhando os itens verticalmente.',
            correct: true,
          },
          {
            id: 'alt_11',
            text: 'O valor padrão é "row-reverse".',
            correct: false,
          },
          {
            id: 'alt_12',
            text: 'Não existe valor padrão, é obrigatório declará-lo em todo StyleSheet.',
            correct: false,
          },
        ],
        explanation: 'Diferente da web (CSS) onde o flex-direction padrão é "row", no React Native o flex-direction padrão é sempre "column", pensado para o fluxo vertical das telas de dispositivos móveis.',
        difficulty: 'Difícil',
        tag: 'Estilização / Flexbox',
        source_chunks: [
          {
            Content: 'É importante notar que o Flexbox funciona da mesma forma no React Native que na web, com duas exceções principais: o flexDirection padrão é "column" em vez de "row", e o alignContent padrão é "flex-start".',
            Score: 0.98,
            ObjectKey: 'obj_30',
            Page: 45,
            ChunkIndex: 0,
            Language: 'pt-BR',
          },
        ],
      },
    }
  ],
};