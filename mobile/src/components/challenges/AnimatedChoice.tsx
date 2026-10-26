import { useEffect } from 'react';
import { Pressable, PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

interface AnimatedChoiceProps extends PressableProps {
  isWrong: boolean;
  isCorrect: boolean;
}

// Alternativa de Múltipla escolha/Verdadeiro-Falso com feedback de movimento: um "shake" horizontal
// quando a resposta escolhida está errada, um leve "pulse" de escala quando é a certa --
// sem isso a mudança de cor (vermelho/verde) era o único sinal, e passava despercebida
// fácil no meio de um alarme tocando.
export function AnimatedChoice({ isWrong, isCorrect, children, style, ...props }: AnimatedChoiceProps) {
  const shakeX = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isWrong) {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 45 }),
        withTiming(8, { duration: 45 }),
        withTiming(-6, { duration: 45 }),
        withTiming(6, { duration: 45 }),
        withTiming(0, { duration: 45 }),
      );
    }
  }, [isWrong, shakeX]);

  useEffect(() => {
    if (isCorrect) {
      scale.value = withSequence(withTiming(1.04, { duration: 120 }), withTiming(1, { duration: 120 }));
    }
  }, [isCorrect, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable style={style} {...props}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
