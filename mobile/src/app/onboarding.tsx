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
// (âmbar = alarmes/agendadores, azul = objetos, índigo = desafios, verde = sequência/
// histórico -- a mesma paleta nova de StudyWeekStrip), pra já ir familiarizando o
// usuário com a linguagem visual antes mesmo de chegar nas telas de verdade.
const STEPS: OnboardingStep[] = [
  {
    icon: 'alarm-outline',
    color: '#F59E0B',
    title: 'Crie um agendador',
    description: 'Escolha o horário e os dias da semana. Quando o alarme tocar, você precisa responder um desafio pra desligá-lo.',
  },
  {
    icon: 'document-text-outline',
    color: '#3B82F6',
    title: 'Envie seus materiais',
    description: 'PDFs, anotações, slides -- é a partir deles que os desafios do seu agendador são gerados.',
  },
  {
    icon: 'school-outline',
    color: '#6366F1',
    title: 'Vincule desafios',
    description: 'Múltipla escolha, Verdadeiro ou Falso e Descoberta: escolha como quer estudar cada material.',
  },
  {
    icon: 'flame',
    color: '#30A14E',
    title: 'Acompanhe sua sequência',
    description: 'No Histórico você vê os dias seguidos estudando, o que já respondeu e em quais assuntos precisa reforçar.',
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

      <Button onPress={next} className="mb-6 rounded-3xl bg-brand-100 py-3.5">
        <Text className="text-center font-semibold text-white">{isLast ? 'Começar' : 'Próximo'}</Text>
      </Button>
    </Screen>
  );
}
