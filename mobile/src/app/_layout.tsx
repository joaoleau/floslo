import { useEffect, useRef, useState } from 'react';
import { AppState, useColorScheme, ActivityIndicator, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack, useRouter, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import notifee, { EventType, AndroidCategory } from '@notifee/react-native';
import { authService } from '@/services/authService';

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
        autoCancel: false, // Proíbe o Android de calar o som ao clicar
        fullScreenAction: { id: 'default', launchActivity: 'default' },
        pressAction: { id: 'default', launchActivity: 'default' },
      },
    });
  }
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  
  // Escuta o estado do roteador para saber se ele já está pronto
  const navigationState = useRootNavigationState(); 
  
  // Trava para evitar que o app tente navegar duas vezes seguidas
  const isNavigating = useRef(false);

  // Estado para controlar o carregamento inicial da autenticação
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // ==========================================
  // EFEITO 1: CHECAR AUTENTICAÇÃO E ROTA INICIAL
  // ==========================================
  useEffect(() => {
    // Só executa quando o Router estiver pronto
    if (!navigationState?.key) return;

    async function checkAuthAndRedirect() {
      try {
        const token = await authService.getAccessToken();
        await SplashScreen.hideAsync();
        
        if (token) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('[RootLayout] Erro ao verificar auth:', error);
        router.replace('/(auth)/login');
      } finally {
        setIsAuthLoading(false);
      }
    }

    checkAuthAndRedirect();
  }, [navigationState?.key]);

  // ==========================================
  // EFEITO 2: NAVEGAR PARA O ALARME
  // ==========================================
  useEffect(() => {
    // Só prossegue se o roteador estiver montado e a auth resolvida
    if (!navigationState?.key || isAuthLoading) return;

    async function handleAlarmNavigation() {
      if (isNavigating.current) return;

      try {
        let targetSchedulerId = null;
        let targetChallengeType = null;

        // 1. Checa se o app abriu através do clique na notificação (Cold Boot)
        const initialNotification = await notifee.getInitialNotification();
        if (initialNotification?.notification.android?.category === AndroidCategory.ALARM) {
          targetSchedulerId = initialNotification.notification.data?.schedulerId;
          targetChallengeType = initialNotification.notification.data?.challengeType;
        }

        // 2. Se não foi por clique, checa se tem um alarme tocando na barra
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

        // SE ACHOU UM ALARME, NAVEGA COM SEGURANÇA!
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

    // Chama a navegação (caso o app tenha acabado de abrir)
    handleAlarmNavigation();

    // Escuta quando o app vai e volta de segundo plano
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        handleAlarmNavigation();
      }
    });

    // Escuta cliques quando o app já está rodando em tela
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
  }, [navigationState?.key, isAuthLoading]); 

  // Previne a renderização desnecessária enquanto a checagem de Auth rola
  if (isAuthLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
         <Stack.Screen name="(tabs)" />
         <Stack.Screen name="(auth)" />
         <Stack.Screen name="(object)" />
         <Stack.Screen name="(scheduler)" />
      </Stack>
    </ThemeProvider>
  );
}