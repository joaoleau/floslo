import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { Pressable, View, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Switch } from '@/components/ui/switch';

import { Scheduler, Challenger, QuizDifficulty } from '@/types/domain/Scheduler';
import { ObjectType } from '@/types/domain/Object';
import { soundSelectionService } from '@/services/soundSelectionService';

import { WeekDays } from './WeekDays';
import { TimePicker } from './TimePicker';
import { ObjectPicker } from './ObjectPicker';

export interface SchedulerFormRef {
  submit: () => void;
}

interface SchedulerFormProps {
  initialValues?: Scheduler;
  availableObjects: ObjectType[];
  onSubmit: (scheduler: Scheduler) => void;
  onDelete?: (schedulerId: string) => void;
}

const DEFAULT_SCHEDULER: Scheduler = {
  id: '',
  name: '',
  weekDays: [],
  startTime: '08:30',
  alarmSound: '',
  objectIds: [],
  enabled: true,
  vibration: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  challengers: [],
};

const DIFFICULTY_OPTIONS: { value: QuizDifficulty; label: string }[] = [
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Médio' },
  { value: 'hard', label: 'Difícil' },
];

const DIFFICULTY_LABELS: Record<QuizDifficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
};

type ModalStep = 'SELECT_TYPE' | 'CONFIGURE_CHALLENGE';

export const SchedulerForm = forwardRef<SchedulerFormRef, SchedulerFormProps>(
  function SchedulerForm({ initialValues, availableObjects, onSubmit, onDelete }, ref) {
    const router = useRouter();

    const [scheduler, setScheduler] = useState<Scheduler>(initialValues ?? DEFAULT_SCHEDULER);
    
    const [isChallengeModalVisible, setChallengeModalVisible] = useState(false);
    const [modalStep, setModalStep] = useState<ModalStep>('SELECT_TYPE');
    const [tempChallenger, setTempChallenger] = useState<Partial<Challenger>>({});

    // Validação: Verifica quais desafios já foram adicionados
    const hasQuiz = scheduler.challengers.some((c) => c.challengeType === 'QUIZ');

    useEffect(() => {
      const unsubscribe = soundSelectionService.subscribe((soundObject) => {
        update('alarmSound', soundObject.name);
      });

      return () => {
        unsubscribe();
      };
    }, []);

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

    function toggleWeekDay(day: string) {
      const exists = scheduler.weekDays.includes(day);
      update(
        'weekDays',
        exists ? scheduler.weekDays.filter((d) => d !== day) : [...scheduler.weekDays, day],
      );
    }

    function openChallengeModal() {
      setModalStep('SELECT_TYPE');
      setTempChallenger({});
      setChallengeModalVisible(true);
    }

    function handleSelectChallengeType(type: 'QUIZ') {
      if (type === 'QUIZ') {
        setTempChallenger({
          challengeType: 'QUIZ',
          challenge: { difficulty: 'medium', questionCount: 5 },
        });
      }
      setModalStep('CONFIGURE_CHALLENGE');
    }

    function handleAddChallenger() {
      if (tempChallenger.challengeType) {
        update('challengers', [...scheduler.challengers, tempChallenger as Challenger]);
        setChallengeModalVisible(false);
      }
    }

    function handleRemoveChallenger(indexToRemove: number) {
      update(
        'challengers',
        scheduler.challengers.filter((_, index) => index !== indexToRemove)
      );
    }

    return (
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
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
                className="w-full"
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
                <Text className="flex-1 text-zinc-500">{scheduler.alarmSound || 'Selecionar som'}</Text>
                <Ionicons name="chevron-forward" size={18} color="#33405C" />
              </Pressable>
            </View>
          </Card>

          <Card className="rounded-3xl bg-white p-5 gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-zinc-800">Desafios</Text>
              <Pressable onPress={openChallengeModal}>
                <Ionicons name="add-circle" size={28} color="#33405C" />
              </Pressable>
            </View>

            {scheduler.challengers.length === 0 ? (
              <Text className="text-center text-zinc-500 py-2">
                Nenhum desafio adicionado.
              </Text>
            ) : (
              <View className="gap-3">
                {scheduler.challengers.map((item, index) => (
                  <View 
                    key={index} 
                    className="flex-row items-center justify-between rounded-xl border border-zinc-200 p-3"
                  >
                    <View>
                      <Text className="font-semibold text-zinc-700">
                        {item.challengeType === 'QUIZ' ? 'Questionário (Quiz)' : item.challengeType}
                      </Text>
                      <Text className="text-sm text-zinc-500 mt-1">
                        Dificuldade: {DIFFICULTY_LABELS[item.challenge.difficulty]} • {item.challenge.questionCount}{' '}
                        questões
                      </Text>
                    </View>
                    <Pressable onPress={() => handleRemoveChallenger(index)} className="p-2">
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <Card className="rounded-3xl bg-white p-5">
            <ObjectPicker
              objects={availableObjects}
              selectedIds={scheduler.objectIds}
              onChange={(ids) => update('objectIds', ids)}
            />
          </Card>

          {!!(initialValues && onDelete) && (
            <Button
              onPress={() => onDelete(scheduler.id)}
              className="flex-row items-center justify-center rounded-3xl bg-red-600 py-2 mt-4"
            >
              <Ionicons name="trash-outline" size={20} color="white" />
              <Text className="ml-2 font-semibold text-white">Excluir alarme</Text>
            </Button>
          )}

          <Modal
            visible={isChallengeModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setChallengeModalVisible(false)}
          >
            <View className="flex-1 justify-center bg-black/50 p-4">
              <Card className="rounded-3xl bg-white p-5 gap-4">
                
                {modalStep === 'SELECT_TYPE' && (
                  <>
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-xl font-bold text-zinc-800">Novo Desafio</Text>
                      <Pressable onPress={() => setChallengeModalVisible(false)}>
                        <Ionicons name="close" size={24} color="#55575c" />
                      </Pressable>
                    </View>
                    <Text className="text-zinc-500 mb-2">Escolha o tipo de desafio para este alarme:</Text>
                    
                    <View className="gap-3">
                      <Pressable 
                        onPress={() => !hasQuiz && handleSelectChallengeType('QUIZ')}
                        disabled={hasQuiz}
                        className={`flex-row items-center gap-3 p-4 rounded-xl border ${
                          hasQuiz 
                            ? 'border-zinc-200 bg-zinc-100 opacity-60' 
                            : 'border-zinc-200 bg-zinc-50 active:bg-zinc-100'
                        }`}
                      >
                        <View className="bg-brand-100/10 p-2 rounded-full">
                          <Ionicons name="school-outline" size={24} color={hasQuiz ? '#55575c' : '#33405C'} />
                        </View>
                        <View className="flex-1">
                          <Text className={`font-semibold ${hasQuiz ? 'text-zinc-500' : 'text-zinc-800'}`}>
                            Questionário (Quiz)
                          </Text>
                          <Text className="text-sm text-zinc-500">
                            {hasQuiz ? 'Já adicionado a este alarme.' : 'Responda perguntas sobre seus materiais.'}
                          </Text>
                        </View>
                        {!hasQuiz ? (
                          <Ionicons name="chevron-forward" size={20} color="#A1A1AA" />
                        ) : (
                          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        )}
                      </Pressable>
                    </View>
                  </>
                )}

                {modalStep === 'CONFIGURE_CHALLENGE' && tempChallenger.challengeType === 'QUIZ' && !!tempChallenger.challenge && (
                  <>
                    <View className="flex-row justify-between items-center mb-2">
                      <Pressable onPress={() => setModalStep('SELECT_TYPE')} className="p-1 -ml-1">
                        <Ionicons name="arrow-back" size={24} color="#33405C" />
                      </Pressable>
                      <Text className="text-xl font-bold text-zinc-800">Configurar Quiz</Text>
                      <View style={{ width: 24 }} />
                    </View>

                    <View className="gap-2 mt-2">
                      <Text className="font-medium text-zinc-700">Dificuldade</Text>
                      <View className="flex-row gap-2">
                        {DIFFICULTY_OPTIONS.map((option) => {
                          const selected = tempChallenger.challenge!.difficulty === option.value;
                          return (
                            <Pressable
                              key={option.value}
                              onPress={() =>
                                setTempChallenger({
                                  ...tempChallenger,
                                  challenge: { ...tempChallenger.challenge!, difficulty: option.value },
                                })
                              }
                              className={`h-10 flex-1 items-center justify-center rounded-xl border ${
                                selected ? 'border-brand-100 bg-brand-100' : 'border-zinc-300'
                              }`}
                            >
                              <Text className={selected ? 'font-semibold text-white' : 'text-zinc-700'}>
                                {option.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <View className="gap-2 mt-4">
                      <Text className="font-medium text-zinc-700">Quantidade de questões</Text>
                      <Text className="text-center text-3xl font-bold text-brand-100 mt-2">
                        {tempChallenger.challenge!.questionCount}
                      </Text>

                      <Slider
                        minimumValue={1}
                        maximumValue={10}
                        step={1}
                        value={tempChallenger.challenge!.questionCount}
                        onValueChange={(value) =>
                          setTempChallenger({
                            ...tempChallenger,
                            challenge: { ...tempChallenger.challenge!, questionCount: value }
                          })
                        }
                      />
                    </View>

                    <View className="flex-row gap-3 mt-6">
                      <Button 
                        onPress={() => setChallengeModalVisible(false)} 
                        className="flex-1 bg-zinc-200"
                      >
                        <Text className="text-zinc-700 font-semibold text-center w-full">Cancelar</Text>
                      </Button>
                      <Button 
                        onPress={handleAddChallenger} 
                        className="flex-1 bg-brand-100"
                      >
                        <Text className="text-white font-semibold text-center w-full">Salvar</Text>
                      </Button>
                    </View>
                  </>
                )}
              </Card>
            </View>
          </Modal>

        </View>
      </ScrollView>
    );
  },
);