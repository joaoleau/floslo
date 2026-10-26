import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { onboardingStorage } from '@/storage/onboardingStorage';

interface OnboardingStep {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  title: string;
  description: string;
}

// Cor de cada passo casa com o acento que aquela peça do app já usa em outro lugar
// (azul = objetos, âmbar = alarmes/agendadores, índigo = desafios, rosa = permissões, verde =
// sequência/histórico), pra já ir familiarizando o usuário com a linguagem visual antes mesmo de
// chegar nas telas de verdade. A ordem segue o uso: o agendador só pode ser criado depois que
// existe um documento processado para vincular a ele.
const STEPS: OnboardingStep[] = [
  {
    icon: 'document-text-outline',
    color: '#3B82F6',
    title: 'Envie seus materiais',
    description:
      'Na aba Objetos, envie seus documentos em PDF. O app lê o conteúdo e identifica os principais assuntos de cada um, as tags, que você pode revisar e ajustar.',
  },
  {
    icon: 'alarm-outline',
    color: '#F59E0B',
    title: 'Crie um agendador',
    description:
      'Escolha o horário, os dias da semana e os documentos de estudo. Quando o alarme tocar, ele só desliga depois que você responder todos os desafios.',
  },
  {
    icon: 'school-outline',
    color: '#6366F1',
    title: 'Escolha os desafios',
    description:
      'Em cada agendador, defina quantos itens de Descoberta, Múltipla escolha e Verdadeiro ou Falso cada alarme traz, até 10 no total, e o idioma em que eles são escritos.',
  },
  {
    icon: 'notifications-outline',
    color: '#EC4899',
    title: 'Deixe o alarme tocar',
    description:
      'Ative as permissões de alarmes e de notificações em tela cheia, para o alarme tocar na hora certa e abrir sozinho com o celular bloqueado. A tela inicial avisa quando falta alguma.',
  },
  {
    icon: 'flame',
    color: '#30A14E',
    title: 'Acompanhe sua sequência',
    description:
      'Cada dia de estudo conta na sua sequência. No Histórico você vê o desempenho por assunto, os erros recentes e as sessões que já respondeu.',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  async function finish() {
    await onboardingStorage.markOnboardingSeen();
    router.replace('/(tabs)');
  }

  function next() {
    if (isLast) {
      finish();
    } else {
      setStep((value) => value + 1);
    }
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']} className="px-6">
      <View className="flex-row justify-end pt-2">
        <Pressable onPress={finish} hitSlop={8}>
          <Text className="font-medium text-muted-foreground">Pular</Text>
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center gap-6" key={step}>
        <Animated.View entering={FadeIn.duration(250)} className="items-center gap-6">
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 140, height: 140, backgroundColor: `${current.color}1F` }}
          >
            <View
              className="items-center justify-center rounded-full"
              style={{ width: 96, height: 96, backgroundColor: current.color }}
            >
              <Ionicons name={current.icon} size={44} color="#FFFFFF" />
            </View>
          </View>

          <View className="items-center gap-2 px-4">
            <Text className="text-center text-2xl font-bold text-foreground">{current.title}</Text>
            <Text className="text-center text-muted-foreground">{current.description}</Text>
          </View>
        </Animated.View>
      </View>

      <View className="flex-row items-center justify-center gap-1.5 pb-6">
        {STEPS.map((_, index) => (
          <View
            key={index}
            className={index === step ? 'bg-brand-100' : 'bg-border'}
            style={{ width: index === step ? 18 : 6, height: 6, borderRadius: 3 }}
          />
        ))}
      </View>

      <Button onPress={next} className="mb-6 h-12 rounded-3xl bg-brand-100">
        <Text className="text-center font-semibold text-white">{isLast ? 'Começar' : 'Próximo'}</Text>
      </Button>
    </Screen>
  );
}
