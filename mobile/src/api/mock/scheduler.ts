// src/api/mock/scheduler.ts

import { SchedulerDTO } from '@/types/api/SchedulerDTO';

export const schedulersMock: SchedulerDTO[] = [
  {
    scheduler_id: 'sch_01',
    name: 'Academia',
    week_days: ['monday', 'wednesday', 'friday'],
    start_time: '07:00',
    alarm_sound: { name: 'Classic' },
    object_ids: ['obj_01', 'obj_02'],
    challengers: [
      {
        challenge_type: 'QUIZ',
        challenge: {
          difficulty: 'Fácil',
          question_count: 3,
        },
      },
    ],
    is_enabled: true,
    vibration: true,
    created_at: '2026-07-13T18:30:00Z',
    updated_at: '2026-07-13T18:30:00Z',
  },
  {
    scheduler_id: 'sch_02',
    name: 'Estudar React Native',
    week_days: ['tuesday', 'thursday'],
    start_time: '20:00',
    alarm_sound: { name: 'Digital' },
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
  {
    scheduler_id: 'sch_03',
    name: 'Ler Livro',
    week_days: ['sunday'],
    start_time: '09:00',
    alarm_sound: { name: 'Birds' },
    object_ids: ['obj_04'],
    challengers: [
      {
        challenge_type: 'QUIZ',
        challenge: {
          difficulty: 'Fácil',
          question_count: 5,
        },
      },
    ],
    is_enabled: true,
    vibration: true,
    created_at: '2026-07-13T18:30:00Z',
    updated_at: '2026-07-13T18:30:00Z',
  },
  {
    scheduler_id: 'sch_04',
    name: 'Beber Água',
    week_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    start_time: '10:30',
    alarm_sound: { name: 'Water' },
    object_ids: ['obj_05'],
    challengers: [
      {
        challenge_type: 'QUIZ',
        challenge: {
          difficulty: 'Fácil',
          question_count: 10,
        },
      },
    ],
    is_enabled: true,
    vibration: true,
    created_at: '2026-07-13T18:30:00Z',
    updated_at: '2026-07-13T18:30:00Z',
  },
  {
    scheduler_id: 'sch_05',
    name: 'Reunião',
    week_days: ['monday'],
    start_time: '14:00',
    alarm_sound: { name: 'Meeting' },
    object_ids: ['obj_06'],
    challengers: [
      {
        challenge_type: 'QUIZ',
        challenge: {
          difficulty: 'Fácil',
          question_count: 10,
        },
      },
    ],
    is_enabled: true,
    vibration: true,
    created_at: '2026-07-13T18:30:00Z',
    updated_at: '2026-07-13T18:30:00Z',
  },
  {
    scheduler_id: 'sch_06',
    name: 'Estudar Backend',
    week_days: ['tuesday', 'friday'],
    start_time: '19:00',
    alarm_sound: { name: 'Focus' },
    object_ids: ['obj_07', 'obj_08'],
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
  {
    scheduler_id: 'sch_07',
    name: 'Correr',
    week_days: ['saturday'],
    start_time: '06:30',
    alarm_sound: { name: 'Nature' },
    object_ids: ['obj_09'],
    challengers: [
      {
        challenge_type: 'QUIZ',
        challenge: {
          difficulty: 'Fácil',
          question_count: 10,
        },
      },
    ],
    is_enabled: true,
    vibration: true,
    created_at: '2026-07-13T18:30:00Z',
    updated_at: '2026-07-13T18:30:00Z',
  },
  {
    scheduler_id: 'sch_08',
    name: 'Meditação',
    week_days: ['everyday'],
    start_time: '22:00',
    alarm_sound: { name: 'Zen' },
    object_ids: ['obj_10'],
    challengers: [
      {
        challenge_type: 'QUIZ',
        challenge: {
          difficulty: 'Fácil',
          question_count: 10,
        },
      },
    ],
    is_enabled: true,
    vibration: true,
    created_at: '2026-07-13T18:30:00Z',
    updated_at: '2026-07-13T18:30:00Z',
  },
  {
    scheduler_id: 'sch_09',
    name: 'Curso de Inglês',
    week_days: ['wednesday'],
    start_time: '18:00',
    alarm_sound: { name: 'Bell' },
    object_ids: ['obj_11'],
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
  {
    scheduler_id: 'sch_10',
    name: 'Almoço',
    week_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    start_time: '12:00',
    alarm_sound: { name: 'Chime' },
    object_ids: [],
    challengers: [
      {
        challenge_type: 'QUIZ',
        challenge: {
          difficulty: 'Fácil',
          question_count: 10,
        },
      },
    ],
    is_enabled: true,
    vibration: true,
    created_at: '2026-07-13T18:30:00Z',
    updated_at: '2026-07-13T18:30:00Z',
  },
  {
    scheduler_id: 'sch_11',
    name: 'Dormir',
    week_days: ['everyday'],
    start_time: '23:30',
    alarm_sound: { name: 'Sleep' },
    object_ids: ['obj_12'],
    challengers: [
      {
        challenge_type: 'QUIZ',
        challenge: {
          difficulty: 'Fácil',
          question_count: 10,
        },
      },
    ],
    is_enabled: true,
    vibration: true,
    created_at: '2026-07-13T18:30:00Z',
    updated_at: '2026-07-13T18:30:00Z',
  },
  {
    scheduler_id: 'sch_12',
    name: 'Revisar Anotações',
    week_days: ['thursday'],
    start_time: '16:00',
    alarm_sound: { name: 'Notification' },
    object_ids: ['obj_13', 'obj_14'],
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
  {
    scheduler_id: 'sch_13',
    name: 'Passear com o Cachorro',
    week_days: ['saturday', 'sunday'],
    start_time: '08:00',
    alarm_sound: { name: 'Dog' },
    object_ids: [],
    challengers: [
      {
        challenge_type: 'QUIZ',
        challenge: {
          difficulty: 'Fácil',
          question_count: 10,
        },
      },
    ],
    is_enabled: true,
    vibration: true,
    created_at: '2026-07-13T18:30:00Z',
    updated_at: '2026-07-13T18:30:00Z',
  },
  {
    scheduler_id: 'sch_14',
    name: 'Planejamento Semanal',
    week_days: ['sunday'],
    start_time: '21:00',
    alarm_sound: { name: 'Planning' },
    object_ids: ['obj_15'],
    challengers: [
      {
        challenge_type: 'QUIZ',
        challenge: {
          difficulty: 'Fácil',
          question_count: 10,
        },
      },
    ],
    is_enabled: true,
    vibration: true,
    created_at: '2026-07-13T18:30:00Z',
    updated_at: '2026-07-13T18:30:00Z',
  },
];