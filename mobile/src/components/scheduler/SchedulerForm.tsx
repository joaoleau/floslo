import { forwardRef, useImperativeHandle, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Switch } from '@/components/ui/switch';

import { Scheduler, QuizChallenge } from '@/types/domain/Scheduler'; // Tipagem Nova
import { ObjectType } from '@/types/domain/Object'; // Tipagem Nova

import { WeekDays } from './WeekDays';
import { TimePicker } from './TimePicker';
import { ObjectPicker } from './ObjectPicker';

export interface SchedulerFormRef {
  submit: () => void;
}

interface SchedulerFormProps {
  initialValues?: Scheduler;
  availableObjects: ObjectType[]; // <-- A TELA PAI VAI PASSAR ISSO AGORA
  onSubmit: (scheduler: Scheduler) => void;
  onDelete?: (schedulerId: string) => void;
}

const DEFAULT_SCHEDULER: Scheduler = {
  id: '', // Era schedulerId
  name: '',
  weekDays: [],
  startTime: '08:30',
  alarmSound: { name: '', uri: '' },
  objectIds: [],
  enabled: true,
  vibration: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  challengeType: 'QUIZ',
  challenge: {
    difficulties: ['Médio'],
    questionCount: 5,
  },
};

export const SchedulerForm = forwardRef<SchedulerFormRef, SchedulerFormProps>(
  function SchedulerForm({ initialValues, availableObjects, onSubmit, onDelete }, ref) {
    const router = useRouter();
    const difficulties = ['Fácil', 'Médio', 'Difícil'];

    const [scheduler, setScheduler] = useState<Scheduler>(initialValues ?? DEFAULT_SCHEDULER);

    useImperativeHandle(
      ref,
      () => ({
        submit() {
          const payload = {
            ...scheduler,
            updatedAt: new Date(),
          };
          onSubmit(payload);
        },
      }),
      [scheduler, onSubmit],
    );

    function update<K extends keyof Scheduler>(key: K, value: Scheduler[K]) {
      setScheduler((previous) => ({ ...previous, [key]: value }));
    }

    function updateQuizChallenge<K extends keyof QuizChallenge>(key: K, value: QuizChallenge[K]) {
      setScheduler((prev) => {
        if (prev.challengeType !== 'QUIZ') return prev;
        return {
          ...prev,
          challenge: { ...prev.challenge, [key]: value },
        };
      });
    }

    function toggleWeekDay(day: string) {
      const exists = scheduler.weekDays.includes(day);
      update(
        'weekDays',
        exists ? scheduler.weekDays.filter((d) => d !== day) : [...scheduler.weekDays, day],
      );
    }

    function toggleDifficulty(level: string) {
      if (scheduler.challengeType !== 'QUIZ') return;

      const currentDiffs = scheduler.challenge.difficulties;
      const exists = currentDiffs.includes(level);

      updateQuizChallenge(
        'difficulties',
        exists ? currentDiffs.filter((item) => item !== level) : [...currentDiffs, level],
      );
    }

    return (
      <View className="gap-4 p-4">
        <Card className="rounded-3xl bg-white p-5 gap-4">
          <View className="justify-between gap-2">
            <View className="h-20 items-center">
              <TimePicker
                value={scheduler.startTime}
                onChange={(value) => update('startTime', value)}
              />
            </View>

            <View className="items-center justify-center rounded-md bg-white">
              <WeekDays
                weekDays={scheduler.weekDays}
                onToggleDay={toggleWeekDay}
                className="w-full px-1 justify-between"
                dayClassName="h-7 w-7"
              />
            </View>
          </View>

          <View className="gap-2">
            <Input
              className="flex-1"
              value={scheduler.name}
              onChangeText={(text) => update('name', text)}
              placeholder="Nome do alerta"
            />

            <View className="h-10 flex-row items-center rounded-md border border-zinc-300 px-4">
              <Ionicons name="radio-outline" size={20} color="#33405C" />
              <Text className="ml-3 flex-1">Vibração</Text>
              <Switch
                checked={scheduler.vibration}
                onCheckedChange={(value) => update('vibration', value)}
              />
            </View>

            <Pressable
              onPress={() => router.push('/(scheduler)/sounds')}
              className="h-10 flex-row items-center gap-3 rounded-md border border-zinc-300 px-4"
            >
              <Ionicons name="musical-notes-outline" size={20} color="#33405C" />
              <Text className="flex-1 text-zinc-500">
                {/* Agora lemos o nome do objeto */}
                {scheduler.alarmSound.name || 'Selecionar som'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#33405C" />
            </Pressable>
          </View>
        </Card>

        {scheduler.challengeType === 'QUIZ' && (
          <Card className="rounded-3xl bg-white p-5 gap-2">
            <Text>Dificuldade</Text>
            <View className="flex-row gap-2">
              {difficulties.map((level) => {
                const selected = scheduler.challenge.difficulties.includes(level);
                return (
                  <Pressable
                    key={level}
                    onPress={() => toggleDifficulty(level)}
                    className={`h-8 flex-1 items-center justify-center rounded-xl border ${
                      selected ? 'border-brand-100 bg-brand-100' : 'border-zinc-300'
                    }`}
                  >
                    <Text className={selected ? 'font-semibold text-white' : 'text-zinc-700'}>
                      {level}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="text-center text-3xl font-bold text-brand-100">
              {scheduler.challenge.questionCount}
            </Text>

            <Slider
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={scheduler.challenge.questionCount}
              onValueChange={(value) => updateQuizChallenge('questionCount', value)}
            />
          </Card>
        )}

        <Card className="rounded-3xl bg-white p-5">
          <ObjectPicker
            objects={availableObjects}
            selectedIds={scheduler.objectIds}
            onChange={(ids) => update('objectIds', ids)}
          />
        </Card>

        {initialValues && onDelete && (
          <Button
            onPress={() => onDelete(scheduler.id)}
            className="flex-row items-center justify-center rounded-3xl bg-red-600 py-2"
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text className="ml-2 font-semibold text-white">Excluir alarme</Text>
          </Button>
        )}
      </View>
    );
  },
);
