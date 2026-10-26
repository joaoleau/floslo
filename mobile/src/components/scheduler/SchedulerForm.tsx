import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { Pressable, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Switch } from '@/components/ui/switch';

import {
  Scheduler,
  ChallengeTypeName,
  CHALLENGE_TYPE_ORDER,
  MAX_ITEMS_PER_SCHEDULER,
  challengerCount,
  totalItemCount,
  withChallengerCount,
} from '@/types/domain/Scheduler';
import { ObjectType } from '@/types/domain/Object';
import { CHALLENGE_TYPE_META } from '@/constants/challengeType';
import { soundSelectionService } from '@/services/soundSelectionService';
import { formatSoundLabel } from '@/services/soundService';
import { showFieldHelp } from '@/services/fieldHelpService';

import { WeekDays } from './WeekDays';
import { TimePicker } from './TimePicker';
import { ObjectPicker } from './ObjectPicker';
import { LanguagePicker } from './LanguagePicker';
import { ItemCountStepper } from './ItemCountStepper';
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
  name: 'Sem Nome',
  language: 'pt',
  weekDays: [],
  startTime: '08:30',
  alarmSound: 'chic_pop',
  objectIds: [],
  enabled: true,
  vibration: true,
  soundEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  challengers: [],
};

// Uma linha da tela por tipo de desafio, na ordem fixa em que aparecem e são disparados.
const CHALLENGE_TYPE_DESCRIPTIONS: Record<ChallengeTypeName, string> = {
  MULTIPLE_CHOICE: 'Perguntas de múltipla escolha',
  TRUE_FALSE: 'Julgue afirmações',
  DISCOVERY: 'Fatos novos, sem responder',
};

const OBJECTS_HELP_TEXT =
  'São os materiais de estudo (documentos) já enviados na aba Objetos. Vincule aqui os que você quer usar: os desafios deste agendador são gerados a partir do conteúdo deles.';

const CHALLENGES_HELP_TEXT =
  `O idioma define a língua em que os desafios são escritos, um só para todo o agendador. O conteúdo dos seus materiais pode estar em qualquer idioma: o app traduz para o escolhido. Cada tipo de desafio (Múltipla escolha, Verdadeiro ou Falso e Descoberta) tem o seu contador. Use os botões de menos e de mais para escolher quantos itens ele traz por disparo: zero tira o tipo do agendador. Os ${MAX_ITEMS_PER_SCHEDULER} itens são divididos entre os tipos.`;

// Barra empilhada do total: um segmento por item, colorido pelo tipo a que pertence, e os que
// ainda sobram em cinza.
function TotalBar({ counts }: { counts: Record<ChallengeTypeName, number> }) {
  const colors = CHALLENGE_TYPE_ORDER.flatMap((type) =>
    Array.from({ length: counts[type] }, () => CHALLENGE_TYPE_META[type].color),
  );
  return (
    <View testID="scheduler-form-total-bar" style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: MAX_ITEMS_PER_SCHEDULER }, (_, index) => (
        <View
          key={index}
          className={colors[index] ? '' : 'bg-muted'}
          style={{ flex: 1, height: 10, borderRadius: 4, ...(colors[index] ? { backgroundColor: colors[index] } : {}) }}
        />
      ))}
    </View>
  );
}

export const SchedulerForm = forwardRef<SchedulerFormRef, SchedulerFormProps>(
  function SchedulerForm({ initialValues, availableObjects, onSubmit, onDelete }, ref) {
    const router = useRouter();
    const colors = useThemeColors();

    const [scheduler, setScheduler] = useState<Scheduler>(initialValues ?? DEFAULT_SCHEDULER);

    // Limite de itens somado entre todos os tipos do agendador.
    const usedItems = totalItemCount(scheduler.challengers);
    const remainingItems = MAX_ITEMS_PER_SCHEDULER - usedItems;
    const counts = Object.fromEntries(
      CHALLENGE_TYPE_ORDER.map((type) => [type, challengerCount(scheduler.challengers, type)]),
    ) as Record<ChallengeTypeName, number>;


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

    // Muda a quantidade de um tipo respeitando o saldo compartilhado: um contador nunca passa do
    // que ele já tem mais o que sobra nos outros tipos.
    function setTypeCount(type: ChallengeTypeName, count: number) {
      setScheduler((previous) => {
        const current = challengerCount(previous.challengers, type);
        const room = MAX_ITEMS_PER_SCHEDULER - totalItemCount(previous.challengers) + current;
        const next = Math.max(0, Math.min(count, room));
        if (next === current) return previous;
        return { ...previous, challengers: withChallengerCount(previous.challengers, type, next) };
      });
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

              {/* Uma coisa só (label + nome do som escolhido + switch), não dois campos
                  separados -- toque em qualquer lugar do bloco (menos o switch) abre o
                  seletor, o switch liga/desliga o som. Sem seta: o próprio toque já é óbvio. */}
              <View className="flex-row items-center rounded-md border border-border pl-4 pr-3 py-2.5">
                <Pressable
                  onPress={() => scheduler.soundEnabled && router.push('/(scheduler)/sounds')}
                  disabled={!scheduler.soundEnabled}
                  className="flex-1 flex-row items-center gap-3"
                >
                  <Ionicons name="musical-notes-outline" size={20} color={colors.brand} />
                  <View className="flex-1">
                    <Text className="font-medium text-foreground">Som</Text>
                    <Text
                      className="text-xs text-muted-foreground"
                      numberOfLines={1}
                    >
                      {scheduler.soundEnabled
                        ? scheduler.alarmSound
                          ? formatSoundLabel(scheduler.alarmSound)
                          : 'Selecionar som'
                        : 'Desativado'}
                    </Text>
                  </View>
                </Pressable>
                <Switch
                  checked={scheduler.soundEnabled}
                  onCheckedChange={(value) => update('soundEnabled', value)}
                />
              </View>
            </View>
          </Card>

          <Card className="rounded-3xl p-5 gap-4">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-lg font-semibold text-foreground">Objetos</Text>
              <Pressable onPress={() => showFieldHelp('Objetos', OBJECTS_HELP_TEXT)} hitSlop={8}>
                <Ionicons name="help-circle-outline" size={18} color={colors.brandSoft} />
              </Pressable>
            </View>

            <ObjectPicker
              objects={availableObjects}
              selectedIds={scheduler.objectIds}
              onChange={(ids) => update('objectIds', ids)}
            />
          </Card>

          <Card className="rounded-3xl p-5 gap-4">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-lg font-semibold text-foreground">Desafios</Text>
              <Pressable onPress={() => showFieldHelp('Desafios', CHALLENGES_HELP_TEXT)} hitSlop={8}>
                <Ionicons name="help-circle-outline" size={18} color={colors.brandSoft} />
              </Pressable>
            </View>

            <LanguagePicker value={scheduler.language} onChange={(language) => update('language', language)} />

            <View className="gap-2">
              <Text testID="scheduler-form-item-count" className="text-sm font-medium text-foreground">
                {usedItems} de {MAX_ITEMS_PER_SCHEDULER} itens
              </Text>
              <TotalBar counts={counts} />
            </View>

            <View className="gap-4">
              {CHALLENGE_TYPE_ORDER.map((type) => (
                <ItemCountStepper
                  key={type}
                  testID={`scheduler-form-challenge-${type}`}
                  label={CHALLENGE_TYPE_META[type].label}
                  description={CHALLENGE_TYPE_DESCRIPTIONS[type]}
                  icon={CHALLENGE_TYPE_META[type].icon}
                  color={CHALLENGE_TYPE_META[type].color}
                  value={counts[type]}
                  cap={counts[type] + remainingItems}
                  onChange={(count) => setTypeCount(type, count)}
                />
              ))}
            </View>

            {usedItems === 0 && (
              <Text className="text-center text-sm text-muted-foreground">
                Nenhum desafio escolhido. Toque em + para começar.
              </Text>
            )}
          </Card>

          {!!(initialValues && onDelete) && (
            <Button
              onPress={() => onDelete(scheduler.id)}
              className="flex-row items-center justify-center rounded-3xl bg-red-600 py-2"
            >
              <Ionicons name="trash-outline" size={20} color="white" />
              <Text className="ml-2 font-semibold text-white">Excluir agendador</Text>
            </Button>
          )}

        </View>
      </ScrollView>
    );
  },
);
