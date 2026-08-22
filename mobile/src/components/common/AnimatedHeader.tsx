import { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { interpolate, useAnimatedStyle, SharedValue } from 'react-native-reanimated';

import { Header } from '@/components/common/Header';
import { FloatingAction } from '@/components/common/FloatingAction';
import { useThemeColors } from '@/hooks/useThemeColors';

interface AnimatedHeaderProps {
  title: string;

  scrollY: SharedValue<number>;

  showBackButton?: boolean;
  onBack?: () => void;

  rightAction?: ReactNode;

  floatingIcon: React.ComponentProps<typeof FloatingAction>['icon'];

  onFloatingPress: () => void;
}

const HEADER_HEIGHT = 56;

export function AnimatedHeader({
  title,
  scrollY,

  showBackButton = true,
  onBack,

  rightAction,

  floatingIcon,
  onFloatingPress,
}: AnimatedHeaderProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, HEADER_HEIGHT], [0, -HEADER_HEIGHT], 'clamp');

    const opacity = interpolate(scrollY.value, [0, HEADER_HEIGHT], [1, 0], 'clamp');

    return {
      transform: [
        {
          translateY,
        },
      ],
      opacity,
    };
  });

  const floatingAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, HEADER_HEIGHT], [0, 1], 'clamp');

    const translateY = interpolate(scrollY.value, [0, HEADER_HEIGHT], [-10, 0], 'clamp');

    return {
      opacity,
      transform: [
        {
          translateY,
        },
      ],
    };
  });

  return (
    <>
      <Animated.View
        style={[
          {
            position: 'absolute',

            top: insets.top,

            left: 0,
            right: 0,

            zIndex: 10,
          },

          headerAnimatedStyle,
        ]}
      >
        <Header
          title={title}
          showBackButton={showBackButton}
          onBack={onBack}
          rightAction={rightAction}
        />
      </Animated.View>

      <Animated.View
        style={[
          {
            position: 'absolute',

            top: insets.top + 8,

            right: 16,

            zIndex: 20,
          },

          floatingAnimatedStyle,
        ]}
      >
        <FloatingAction icon={floatingIcon} onPress={onFloatingPress} backgroundColor={colors.primary} />
      </Animated.View>
    </>
  );
}
