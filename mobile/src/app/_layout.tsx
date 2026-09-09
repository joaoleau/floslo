import React, { Component, ErrorInfo, ReactNode, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from '@/components/ui/text';
import { ThemeProvider, Stack, useRouter, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import notifee, { EventType, AndroidCategory } from '@notifee/react-native';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';

import { authService } from '@/services/authService';
import { schedulerService } from '@/services/schedulerService';
import { alarmNavStorage } from '@/storage/alarmNavStorage';
import { onboardingStorage } from '@/storage/onboardingStorage';
import { onSessionExpired } from '@/api/http/client';
import { queryClient } from '@/lib/queryClient';
import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/lib/ThemeProvider';
import { AppAlert } from '@/components/common/AppAlert';

// IMPORTANTE: Importe o seu userService (ajuste o caminho de acordo com o seu projeto)
import { userService } from '@/services/userService';

import '@/styles/global.css';

SplashScreen.preventAutoHideAsync();

// Rede de segurança global: qualquer erro síncrono que escape de um try/catch (ex.: um
// módulo nativo como notifee/VolumeManager lançando, um bug de mapeamento, etc.) normalmente
// só aparece como uma RedBox no dispositivo — sem nada no terminal do Metro. Isso garante que
// pelo menos o log apareça, além de preservar o handler padrão (RedBox continua funcionando).
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

  // O app estava apenas em segundo plano (não morto) quando o toque aconteceu — esse evento
  // não passa pelo onForegroundEvent, e getInitialNotification()/getDisplayedNotifications()
  // no lado do app costumam chegar tarde demais (o Android já removeu a notificação por causa
  // do autoCancel). Guardamos a intenção aqui para o app consumir assim que voltar ao primeiro
  // plano, ao invés de simplesmente perder o toque.
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

  // Expulsa o usuário caso o interceptor do Axios avise que a sessão morreu
  useEffect(() => {
    onSessionExpired(async () => {
      await authService.logout();
      router.replace('/(auth)/login');
    });
  }, [router]);

  // React Query has no notion of "app foregrounded" on native by default — without
  // this, refetchInterval/refetchOnWindowFocus never resume reliably after the app
  // goes to background (the OS can suspend JS timers), so screens like the objects
  // list stay stuck showing stale data (e.g. "processing") until a full app restart.
  useEffect(() => {
    function onAppStateChange(status: AppStateStatus) {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    }

    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  // ==========================================
  // EFEITO 1: CHECAR AUTENTICAÇÃO E ROTA INICIAL
  // ==========================================
  useEffect(() => {
    if (!navigationState?.key) return;

    async function checkAuthAndRedirect() {
      try {
        const token = await authService.getAccessToken();
        
        if (token) {
          try {
            // SUBSTITUIÇÃO AQUI: Usando o seu userService lindamente!
            await userService.getMe();

            const hasSeenOnboarding = await onboardingStorage.hasSeenOnboarding();
            router.replace(hasSeenOnboarding ? '/(tabs)' : '/onboarding');

            // A fresh install / re-login (or a different account on this same device) has
            // no native alarm triggers scheduled yet even though the backend already has
            // enabled schedulers — reconcile them now. Fire-and-forget: a failure here
            // shouldn't block the user from reaching the app.
            schedulerService.resyncAll().catch((resyncErr) => {
              console.warn('[RootLayout] Falha ao resincronizar alarmes nativos', resyncErr);
            });
          } catch (apiError) {
            console.warn('[Auth] Token inválido ou usuário deletado. Limpando...', apiError);
            await authService.logout();
            router.replace('/(auth)/login');
          }
        } else {
          // Sem token salvo
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('[RootLayout] Erro ao verificar auth:', error);
        router.replace('/(auth)/login');
      } finally {
        setIsAuthLoading(false);
        // Oculta o Splash Nativo para revelar a tela final
        await SplashScreen.hideAsync();
      }
    }

    checkAuthAndRedirect();
  }, [navigationState?.key, router]);

  // ==========================================
  // EFEITO 2: NAVEGAR PARA O ALARME
  // ==========================================
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

        // Último fallback: um toque que aconteceu com o app em segundo plano (não morto) foi
        // capturado pelo onBackgroundEvent e guardado ali, já que os dois caminhos acima podem
        // chegar tarde demais para pegá-lo (ver alarmNavStorage).
        if (!targetSchedulerId) {
          const pending = await alarmNavStorage.takePendingAlarmNav();
          if (pending) {
            targetSchedulerId = pending.schedulerId;
            targetChallengeType = pending.challengeType ?? null;
            targetNotificationId = pending.notificationId;
          }
        }

        if (targetSchedulerId) {
          isNavigating.current = true;

          router.replace({
            pathname: '/(scheduler)/firing',
            params: {
              schedulerId: targetSchedulerId as string,
              challengeType: targetChallengeType as string,
              // A weekday-recurring alarm's actual notification id is `${schedulerId}__${day}`,
              // not the bare schedulerId — the firing screen needs the real id to cancel the
              // right notification (see schedulerService's dayNotificationId).
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
        if (payload?.schedulerId) {
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
          </ErrorBoundary>
        </AppThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

// Um erro de render (ex.: acesso a propriedade de undefined num mapper) sem isso derruba
// a árvore inteira sem deixar rastro estruturado — só a RedBox nativa. Loga antes de mostrar
// uma tela mínima de fallback, em vez de deixar o app em branco.
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
          <Text className="text-center text-foreground">
            Algo deu errado. Feche e abra o app novamente.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Reads the resolved light/dark mode from our own ThemeProvider (system scheme or the
// user's manual override in Perfil > Aparência) so react-navigation's chrome colors stay
// in sync with the rest of the app instead of only following the raw system scheme.
function RootStack() {
  const { mode } = useTheme();

  return (
    <ThemeProvider value={mode === 'dark' ? NAV_THEME.dark : NAV_THEME.light}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(object)" />
        <Stack.Screen name="(scheduler)" />
        <Stack.Screen name="(history)" />
      </Stack>
    </ThemeProvider>
  );
}