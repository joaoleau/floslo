import { useEffect, useRef, useState } from 'react';
import { AppState, useColorScheme } from 'react-native'; // Removido View e ActivityIndicator
import { ThemeProvider, Stack, useRouter, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import notifee, { EventType, AndroidCategory } from '@notifee/react-native';
import { QueryClientProvider } from '@tanstack/react-query';

import { authService } from '@/services/authService';
import { onSessionExpired } from '@/api/http/client'; 
import { queryClient } from '@/lib/queryClient';
import { NAV_THEME } from '@/lib/theme';

// IMPORTANTE: Importe o seu userService (ajuste o caminho de acordo com o seu projeto)
import { userService } from '@/services/userService';

SplashScreen.preventAutoHideAsync();

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  if (!notification) return;

  if (type === EventType.ACTION_PRESS && pressAction?.id === 'stop') {
    if (notification.id) {
      await notifee.cancelNotification(notification.id);
    }
    return;
  }

  if (type === EventType.DISMISSED && notification.android?.category === AndroidCategory.ALARM) {
    console.log('[Anti-Cheat] Usuário tentou arrastar a notificação! Recriando...');

    await notifee.displayNotification({
      id: notification.id,
      title: '🚨 NÃO VAI DORMIR NÃO!',
      body: 'Abra o aplicativo e resolva o desafio para desligar.',
      data: notification.data,
      android: {
        channelId: notification.android?.channelId || 'default', 
        category: AndroidCategory.ALARM,
        ongoing: true, 
        loopSound: true, 
        autoCancel: false, 
        fullScreenAction: { id: 'default', launchActivity: 'default' },
        pressAction: { id: 'default', launchActivity: 'default' },
      },
    });
  }
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
            router.replace('/(tabs)');
          } catch (apiError) {
            console.log('[Auth] Token inválido ou usuário deletado. Limpando...');
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

        const initialNotification = await notifee.getInitialNotification();
        if (initialNotification?.notification.android?.category === AndroidCategory.ALARM) {
          targetSchedulerId = initialNotification.notification.data?.schedulerId;
          targetChallengeType = initialNotification.notification.data?.challengeType;
        }

        if (!targetSchedulerId) {
          const activeNotifications = await notifee.getDisplayedNotifications();
          const ringingAlarm = activeNotifications.find(
            n => n.notification.android?.category === AndroidCategory.ALARM
          );
          if (ringingAlarm) {
            targetSchedulerId = ringingAlarm.notification.data?.schedulerId;
            targetChallengeType = ringingAlarm.notification.data?.challengeType;
          }
        }

        if (targetSchedulerId) {
          isNavigating.current = true;
          
          router.replace({
            pathname: '/(scheduler)/firing',
            params: {
              schedulerId: targetSchedulerId as string,
              challengeType: targetChallengeType as string
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
      if (type === EventType.PRESS && detail.notification?.android?.category === AndroidCategory.ALARM) {
        const payload = detail.notification.data;
        if (payload?.schedulerId) {
          router.replace({
            pathname: '/(scheduler)/firing',
            params: {
              schedulerId: payload.schedulerId as string,
              challengeType: payload.challengeType as string
            }
          });
        }
      }
    });

    return () => {
      appStateSubscription.remove();
      notifeeSubscription();
    };
  }, [navigationState?.key, isAuthLoading, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? NAV_THEME.dark : NAV_THEME.light}>
        <Stack screenOptions={{ headerShown: false }}>
           <Stack.Screen name="(tabs)" />
           <Stack.Screen name="(auth)" />
           <Stack.Screen name="(object)" />
           <Stack.Screen name="(scheduler)" />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}