import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useThemeColors } from '@/hooks/useThemeColors';

const BLOB_COLORS = ['#F59E0B', '#8B5CF6', '#14B8A6', '#EC4899', '#3B82F6'] as const;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BlobConfig {
  color: string;
  size: number;
  top: number;
  left: number;
  driftX: number;
  driftY: number;
  duration: number;
}

const BLOBS: BlobConfig[] = [
  { color: BLOB_COLORS[0], size: 240, top: -70, left: -70, driftX: 24, driftY: 30, duration: 9000 },
  { color: BLOB_COLORS[1], size: 200, top: 60, left: SCREEN_WIDTH - 140, driftX: -20, driftY: 26, duration: 11000 },
  { color: BLOB_COLORS[2], size: 220, top: SCREEN_HEIGHT * 0.42, left: -90, driftX: 18, driftY: -22, duration: 10000 },
  { color: BLOB_COLORS[3], size: 200, top: SCREEN_HEIGHT * 0.6, left: SCREEN_WIDTH - 130, driftX: -22, driftY: -18, duration: 12500 },
  { color: BLOB_COLORS[4], size: 180, top: SCREEN_HEIGHT - 160, left: SCREEN_WIDTH * 0.32, driftX: 16, driftY: 20, duration: 9500 },
];

function Blob({ config }: { config: BlobConfig }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: config.duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [config.duration, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * config.driftX },
      { translateY: progress.value * config.driftY },
    ],
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', top: config.top, left: config.left, width: config.size, height: config.size },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={[`${config.color}99`, `${config.color}00`]}
        style={{ width: '100%', height: '100%', borderRadius: config.size / 2 }}
      />
    </Animated.View>
  );
}

export function AuthBackground({ children }: { children: React.ReactNode }) {
  const colors = useThemeColors();

  return (
    <View testID="auth-background" style={{ flex: 1, backgroundColor: colors.background, overflow: 'hidden' }}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {BLOBS.map((blob, index) => (
          <Blob key={index} config={blob} />
        ))}
      </View>
      {children}
    </View>
  );
}
