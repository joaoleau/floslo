import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { Pressable, View, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Switch } from '@/components/ui/switch';

import { Scheduler, Challenger, QuizChallenge, FlashcardChallenge, QuizDifficulty, SupportedLanguage, LANGUAGE_FLAGS } from '@/types/domain/Scheduler';
import { ObjectType } from '@/types/domain/Object';
import { soundSelectionService } from '@/services/soundSelectionService';

import { WeekDays } from './WeekDays';
import { TimePicker } from './TimePicker';
import { ObjectPicker } from './ObjectPicker';
import { LanguagePicker } from './LanguagePicker';
import { ItemCountPicker } from './ItemCountPicker';
import { useThemeColors } from '@/hooks/useThemeColors';

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
  alarmSound: 'chic_pop',
  objectIds: [],
  enabled: true,
  vibration: true,
  strictMode: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  challengers: [],
};

// Keep in sync with api/internal/service/scheduler.go's maxChallengeItemCount.
const MAX_CHALLENGE_ITEM_COUNT = 5;

const DIFFICULTY_OPTIONS: {
  value: QuizDifficulty;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  bg: string;
  border: string;
}[] = [
  { value: 'easy', label: 'Fácil', icon: 'leaf', color: '#16a34a', bg: 'bg-green-500/10', border: 'border-green-500' },
  { value: 'medium', label: 'Médio', icon: 'flame', color: '#d97706', bg: 'bg-amber-500/10', border: 'border-amber-500' },
  { value: 'hard', label: 'Difícil', icon: 'flash', color: '#dc2626', bg: 'bg-red-500/10', border: 'border-red-500' },
];

const DIFFICULTY_LABELS: Record<QuizDifficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
};

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  pt: 'PT',
  en: 'EN',
  es: 'ES',
  fr: 'FR',
  de: 'DE',
  it: 'IT',
};

const CHALLENGE_TYPE_OPTIONS: {
  type: Challenger['challengeType'];
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description: string;
}[] = [
  { type: 'QUIZ', icon: 'school-outline', label: 'Questionário (Quiz)', description: 'Responda perguntas sobre seus materiais.' },
  { type: 'FLASHCARD', icon: 'albums-outline', label: 'Flashcard', description: 'Revise virando cartões de pergunta e resposta.' },
  { type: 'TRUE_FALSE', icon: 'checkmark-done-outline', label: 'Verdadeiro ou Falso', description: 'Julgue afirmações sobre seus materiais.' },
];

function describeChallenger(item: Challenger): string {
  const language = `${LANGUAGE_FLAGS[item.language] ?? ''} ${LANGUAGE_LABELS[item.language] ?? item.language}`.trim();
  switch (item.challengeType) {
    case 'QUIZ':
      return `Dificuldade: ${DIFFICULTY_LABELS[item.challenge.difficulty]} • ${item.challenge.questionCount} questões • ${language}`;
    case 'FLASHCARD':
      return `${item.challenge.cardCount} cartões • ${language}`;
    case 'TRUE_FALSE':
      return `Dificuldade: ${DIFFICULTY_LABELS[item.challenge.difficulty]} • ${item.challenge.questionCount} afirmações • ${language}`;
  }
}

function challengeTypeLabel(type: Challenger['challengeType']): string {
  return CHALLENGE_TYPE_OPTIONS.find((option) => option.type === type)?.label ?? type;
}

type ModalStep = 'SELECT_TYPE' | 'CONFIGURE_CHALLENGE';

export const SchedulerForm = forwardRef<SchedulerFormRef, SchedulerFormProps>(
  function SchedulerForm({ initialValues, availableObjects, onSubmit, onDelete }, ref) {
    const router = useRouter();
    const colors = useThemeColors();

    const [scheduler, setScheduler] = useState<Scheduler>(initialValues ?? DEFAULT_SCHEDULER);
    
    const [isChallengeModalVisible, setChallengeModalVisible] = useState(false);
    const [modalStep, setModalStep] = useState<ModalStep>('SELECT_TYPE');
    const [tempChallenger, setTempChallenger] = useState<Partial<Challenger>>({});

    // Validação: no máximo um desafio de cada tipo por alarme
    const hasType = (type: Challenger['challengeType']) =>
      scheduler.challengers.some((c) => c.challengeType === type);

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

    function handleSelectChallengeType(type: Challenger['challengeType']) {
      switch (type) {
        case 'QUIZ':
          setTempChallenger({
            challengeType: 'QUIZ',
            language: 'pt',
            challenge: { difficulty: 'medium', questionCount: 5 },
          });
          break;
        case 'FLASHCARD':
          setTempChallenger({
            challengeType: 'FLASHCARD',
            language: 'pt',
            challenge: { cardCount: 5 },
          });
          break;
        case 'TRUE_FALSE':
          setTempChallenger({
            challengeType: 'TRUE_FALSE',
            language: 'pt',
            challenge: { difficulty: 'medium', questionCount: 5 },
          });
          break;
      }
      setModalStep('CONFIGURE_CHALLENGE');
    }

    function updateTempChallengerLanguage(language: SupportedLanguage) {
      setTempChallenger((previous) => ({ ...previous, language }));
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
          
          <Card className="rounded-3xl p-5 gap-4">
            <View className="justify-between gap-2">
              <View className="h-20 items-center">
                <TimePicker
                  value={scheduler.startTime}
                  onChange={(value) => update('startTime', value)}
                />
              </View>

              <View className="items-center justify-center rounded-md">
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

              <View className="h-10 flex-row items-center rounded-md border border-border px-4">
                <Ionicons name="radio-outline" size={20} color={colors.brand} />
                <Text className="ml-3 flex-1">Vibração</Text>
                <Switch
                  checked={scheduler.vibration}
                  onCheckedChange={(value) => update('vibration', value)}
                />
              </View>

              <View className="gap-1 rounded-md border border-border px-4 py-3">
                <View className="flex-row items-center">
                  <Ionicons name="lock-closed-outline" size={20} color={colors.brand} />
                  <Text className="ml-3 flex-1 font-medium">Modo antiprocrastinador</Text>
                  <Switch
                    checked={scheduler.strictMode}
                    onCheckedChange={(value) => update('strictMode', value)}
                  />
                </View>
                <Text className="text-xs text-muted-foreground">
                  {scheduler.strictMode
                    ? 'Trava o volume e não deixa fechar o app até resolver o desafio.'
                    : 'Alarme normal: pode ser dispensado a qualquer momento.'}
                </Text>
              </View>

              <Pressable
                onPress={() => router.push('/(scheduler)/sounds')}
                className="h-10 flex-row items-center gap-3 rounded-md border border-border px-4"
              >
                <Ionicons name="musical-notes-outline" size={20} color={colors.brand} />
                <Text className="flex-1 text-muted-foreground">{scheduler.alarmSound || 'Selecionar som'}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.brand} />
              </Pressable>
            </View>
          </Card>

          <Card className="rounded-3xl p-5 gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-foreground">Desafios</Text>
              <Pressable onPress={openChallengeModal}>
                <Ionicons name="add-circle" size={28} color={colors.brand} />
              </Pressable>
            </View>

            {scheduler.challengers.length === 0 ? (
              <Text className="text-center text-muted-foreground py-2">
                Nenhum desafio adicionado.
              </Text>
            ) : (
              <View className="gap-3">
                {scheduler.challengers.map((item, index) => (
                  <View
                    key={index}
                    className="flex-row items-center justify-between gap-2 rounded-xl border border-border p-3"
                  >
                    <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0 }}>
                      <Text className="font-semibold text-foreground">
                        {challengeTypeLabel(item.challengeType)}
                      </Text>
                      <Text className="text-sm text-muted-foreground mt-1">
                        {describeChallenger(item)}
                      </Text>
                    </View>
                    <Pressable onPress={() => handleRemoveChallenger(index)} className="p-2" style={{ flexShrink: 0 }}>
                      <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <Card className="rounded-3xl p-5">
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
              <Card className="rounded-3xl p-5 gap-4">
                
                {modalStep === 'SELECT_TYPE' && (
                  <>
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-xl font-bold text-foreground">Novo Desafio</Text>
                      <Pressable onPress={() => setChallengeModalVisible(false)}>
                        <Ionicons name="close" size={24} color={colors.brandSoft} />
                      </Pressable>
                    </View>
                    <Text className="text-muted-foreground mb-2">Escolha o tipo de desafio para este alarme:</Text>

                    <View className="gap-3">
                      {CHALLENGE_TYPE_OPTIONS.map((option) => {
                        const disabled = hasType(option.type);
                        return (
                          <Pressable
                            key={option.type}
                            onPress={() => !disabled && handleSelectChallengeType(option.type)}
                            disabled={disabled}
                            className={`flex-row items-center gap-3 p-4 rounded-xl border ${
                              disabled
                                ? 'border-border bg-secondary opacity-60'
                                : 'border-border bg-muted active:bg-secondary'
                            }`}
                          >
                            <View className="bg-brand-100/10 p-2 rounded-full">
                              <Ionicons name={option.icon} size={24} color={disabled ? colors.brandSoft : colors.brand} />
                            </View>
                            <View className="flex-1">
                              <Text className={`font-semibold ${disabled ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {option.label}
                              </Text>
                              <Text className="text-sm text-muted-foreground">
                                {disabled ? 'Já adicionado a este alarme.' : option.description}
                              </Text>
                            </View>
                            {!disabled ? (
                              <Ionicons name="chevron-forward" size={20} color="#A1A1AA" />
                            ) : (
                              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                )}

                {modalStep === 'CONFIGURE_CHALLENGE' && tempChallenger.challengeType && (
                  <>
                    <View className="flex-row justify-between items-center mb-2 gap-2">
                      <Pressable onPress={() => setModalStep('SELECT_TYPE')} className="p-1 -ml-1">
                        <Ionicons name="arrow-back" size={24} color={colors.brand} />
                      </Pressable>
                      <Text
                        className="flex-1 text-center text-lg font-bold text-foreground"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                      >
                        Configurar {challengeTypeLabel(tempChallenger.challengeType)}
                      </Text>
                      <View
                        className="items-center justify-center rounded-full bg-muted border border-border"
                        style={{ width: 32, height: 32, flexShrink: 0 }}
                      >
                        <Text style={{ fontSize: 16, lineHeight: 20 }}>
                          {LANGUAGE_FLAGS[tempChallenger.language ?? 'pt']}
                        </Text>
                      </View>
                    </View>

                    {(tempChallenger.challengeType === 'QUIZ' || tempChallenger.challengeType === 'TRUE_FALSE') &&
                      !!tempChallenger.challenge && (
                        <>
                          <View className="gap-2 mt-2">
                            <Text className="font-medium text-foreground">Dificuldade</Text>
                            <View className="flex-row gap-2">
                              {DIFFICULTY_OPTIONS.map((option) => {
                                const selected = tempChallenger.challenge!.difficulty === option.value;
                                return (
                                  <Pressable
                                    key={option.value}
                                    onPress={() =>
                                      setTempChallenger((previous) => ({
                                        ...previous,
                                        challenge: { ...(previous.challenge as QuizChallenge), difficulty: option.value },
                                      }) as Partial<Challenger>)
                                    }
                                    className={`flex-1 items-center justify-center gap-1.5 py-3 rounded-2xl border-2 ${
                                      selected ? `${option.border} ${option.bg}` : 'border-border bg-muted'
                                    }`}
                                  >
                                    <Ionicons name={option.icon} size={22} color={selected ? option.color : colors.brandSoft} />
                                    <Text
                                      className={selected ? 'font-semibold' : 'text-muted-foreground'}
                                      style={selected ? { color: option.color } : undefined}
                                    >
                                      {option.label}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>

                          <ItemCountPicker
                            label={tempChallenger.challengeType === 'QUIZ' ? 'Quantidade de questões' : 'Quantidade de afirmações'}
                            value={tempChallenger.challenge!.questionCount}
                            max={MAX_CHALLENGE_ITEM_COUNT}
                            onChange={(value) =>
                              setTempChallenger((previous) => ({
                                ...previous,
                                challenge: { ...(previous.challenge as QuizChallenge), questionCount: value },
                              }) as Partial<Challenger>)
                            }
                          />
                        </>
                      )}

                    {tempChallenger.challengeType === 'FLASHCARD' && !!tempChallenger.challenge && (
                      <ItemCountPicker
                        label="Quantidade de cartões"
                        value={(tempChallenger.challenge as FlashcardChallenge).cardCount}
                        max={MAX_CHALLENGE_ITEM_COUNT}
                        onChange={(value) =>
                          setTempChallenger((previous) => ({
                            ...previous,
                            challenge: { cardCount: value },
                          }) as Partial<Challenger>)
                        }
                      />
                    )}

                    <LanguagePicker
                      value={tempChallenger.language ?? 'pt'}
                      onChange={updateTempChallengerLanguage}
                    />

                    <View className="flex-row gap-3 mt-6">
                      <Button
                        onPress={() => setChallengeModalVisible(false)}
                        className="flex-1 bg-secondary"
                      >
                        <Text className="text-foreground font-semibold text-center w-full">Cancelar</Text>
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