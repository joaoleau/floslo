import React, { Component, ErrorInfo, ReactNode, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from '@/components/ui/text';
import { ThemeProvider, Stack, useRouter, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import notifee, { EventType, AndroidCategory } from '@notifee/react-native';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

import { authService } from '@/services/authService';
import { alarmNavStorage } from '@/storage/alarmNavStorage';
import { activeFiring } from '@/lib/activeFiring';
import { alarmScreen } from '../../modules/alarm-screen';
import { sessionService } from '@/services/sessionService';
import { onSessionExpired } from '@/api/http/client';
import { queryClient } from '@/lib/queryClient';
import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/lib/ThemeProvider';
import { AppAlert } from '@/components/common/AppAlert';
import { FieldHelpModal } from '@/components/common/FieldHelpModal';

import { userService } from '@/services/userService';

import { i18n, loadLanguagePreference } from '@/i18n';

import '@/styles/global.css';

SplashScreen.preventAutoHideAsync();

const defaultErrorHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error(`[GlobalError] isFatal=${isFatal}`, error);
  defaultErrorHandler(error, isFatal);
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  console.log(`[Notifee][background] type=${EventType[type]}`, {
    id: notification?.id,
    category: notification?.android?.category,
    pressActionId: pressAction?.id,
  });

  if (!notification) return;

  if (type === EventType.PRESS && notification.android?.category === AndroidCategory.ALARM) {
    const schedulerId = notification.data?.schedulerId;
    if (schedulerId && notification.id) {
      console.log('[Notifee][background] guardando toque pendente', schedulerId);
      await alarmNavStorage.savePendingAlarmNav({
        schedulerId: schedulerId as string,
        notificationId: notification.id,
        challengeType: notification.data?.challengeType as string | undefined,
      });
    } else {
      console.warn('[Notifee][background] PRESS em alarme sem schedulerId/id', notification);
    }
    return;
  }

  if (type === EventType.ACTION_PRESS && pressAction?.id === 'stop') {
    if (notification.id) {
      await notifee.cancelNotification(notification.id);
    }
    return;
  }
});

export default function RootLayout() {
  const router = useRouter();
  
  const navigationState = useRootNavigationState();
  const isNavigating = useRef(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    onSessionExpired(async () => {
      await authService.logout();
      router.replace('/(auth)/login');
    });
  }, [router]);

  useEffect(() => {
    function onAppStateChange(status: AppStateStatus) {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    }

    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!navigationState?.key || !fontsLoaded) return;

    async function checkAuthAndRedirect() {
      try {
        await loadLanguagePreference();
        const token = await authService.getAccessToken();
        
        if (token) {
          try {
            await userService.getMe();

            router.replace(await sessionService.start());
          } catch (apiError) {
            console.warn('[Auth] Token inválido ou usuário deletado. Limpando...', apiError);
            await authService.logout();
            router.replace('/(auth)/login');
          }
        } else {
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('[RootLayout] Erro ao verificar auth:', error);
        router.replace('/(auth)/login');
      } finally {
        setIsAuthLoading(false);
        await SplashScreen.hideAsync();
      }
    }

    checkAuthAndRedirect();
  }, [navigationState?.key, fontsLoaded, router]);

  useEffect(() => {
    if (!navigationState?.key || isAuthLoading) return;

    async function handleAlarmNavigation() {
      if (isNavigating.current) return;

      try {
        let targetSchedulerId = null;
        let targetChallengeType = null;
        let targetNotificationId = null;

        const initialNotification = await notifee.getInitialNotification();
        if (initialNotification?.notification.android?.category === AndroidCategory.ALARM) {
          targetSchedulerId = initialNotification.notification.data?.schedulerId;
          targetChallengeType = initialNotification.notification.data?.challengeType;
          targetNotificationId = initialNotification.notification.id;
        }

        if (!targetSchedulerId) {
          const activeNotifications = await notifee.getDisplayedNotifications();
          const ringingAlarm = activeNotifications.find(
            n => n.notification.android?.category === AndroidCategory.ALARM
          );
          if (ringingAlarm) {
            targetSchedulerId = ringingAlarm.notification.data?.schedulerId;
            targetChallengeType = ringingAlarm.notification.data?.challengeType;
            targetNotificationId = ringingAlarm.notification.id;
          }
        }

        if (!targetSchedulerId) {
          const pending = await alarmNavStorage.takePendingAlarmNav();
          if (pending) {
            targetSchedulerId = pending.schedulerId;
            targetChallengeType = pending.challengeType ?? null;
            targetNotificationId = pending.notificationId;
          }
        }

        if (targetSchedulerId && activeFiring.isHandled(targetSchedulerId as string)) {
          console.log('[RootLayout] Alarme já atendido, mantendo a tela atual', targetSchedulerId);
          hideOverLockScreenWithoutFiring();
          return;
        }

        if (!targetSchedulerId) {
          hideOverLockScreenWithoutFiring();
        }

        if (targetSchedulerId) {
          isNavigating.current = true;

          router.replace({
            pathname: '/(scheduler)/firing',
            params: {
              schedulerId: targetSchedulerId as string,
              challengeType: targetChallengeType as string,
              notificationId: (targetNotificationId ?? targetSchedulerId) as string,
            }
          });

          setTimeout(() => { isNavigating.current = false; }, 2000);
        }
      } catch (e) {
        console.error('[RootLayout] Erro ao navegar pro alarme', e);
      }
    }

    handleAlarmNavigation();

    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        handleAlarmNavigation();
      }
    });

    const notifeeSubscription = notifee.onForegroundEvent(({ type, detail }) => {
      console.log(`[Notifee][foreground] type=${EventType[type]}`, {
        id: detail.notification?.id,
        category: detail.notification?.android?.category,
        data: detail.notification?.data,
      });

      if (type === EventType.PRESS && detail.notification?.android?.category === AndroidCategory.ALARM) {
        const payload = detail.notification.data;
        if (payload?.schedulerId && activeFiring.isHandled(payload.schedulerId as string)) {
          console.log('[Notifee][foreground] Alarme já atendido, mantendo a tela atual', payload.schedulerId);
        } else if (payload?.schedulerId) {
          console.log('[Notifee][foreground] navegando para firing', payload.schedulerId);
          router.replace({
            pathname: '/(scheduler)/firing',
            params: {
              schedulerId: payload.schedulerId as string,
              challengeType: payload.challengeType as string,
              notificationId: (detail.notification.id ?? payload.schedulerId) as string,
            }
          });
        } else {
          console.warn('[Notifee][foreground] PRESS em alarme sem schedulerId no payload', detail.notification);
        }
      }
    });

    return () => {
      appStateSubscription.remove();
      notifeeSubscription();
    };
  }, [navigationState?.key, isAuthLoading, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <ErrorBoundary>
            <RootStack />
            <AppAlert />
            <FieldHelpModal />
          </ErrorBoundary>
        </AppThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function hideOverLockScreenWithoutFiring() {
  if (activeFiring.anyOpen()) return;
  alarmScreen.setShowOverLockScreen(false).catch((err) => {
    console.warn('[RootLayout] Falha ao deixar de mostrar o app sobre o bloqueio', err);
  });
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Erro de render não tratado', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-background px-6">
          <Text className="text-center text-foreground">{i18n.t('common.crashed')}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function RootStack() {
  const { mode } = useTheme();

  return (
    <ThemeProvider value={mode === 'dark' ? NAV_THEME.dark : NAV_THEME.light}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(object)" />
        <Stack.Screen name="(scheduler)" />
        <Stack.Screen name="(history)" />
      </Stack>
    </ThemeProvider>
  );
}