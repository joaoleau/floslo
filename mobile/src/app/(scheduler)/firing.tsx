import React, { useCallback, useEffect, useState } from 'react';
import { View, Pressable, Platform, ActivityIndicator, BackHandler, AppState, Vibration } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import notifee, { AndroidCategory } from '@notifee/react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAudioPlayer } from 'expo-audio';
import * as Application from 'expo-application';
import { VolumeManager } from 'react-native-volume-manager';

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { QuizChallenge } from '@/components/challenges/QuizChallenge';
import { FlashcardChallenge } from '@/components/challenges/FlashcardChallenge';
import { TrueFalseChallenge } from '@/components/challenges/TrueFalseChallenge';
import { RAG } from '@/types/domain/RAG';
import { LANGUAGE_FLAGS } from '@/types/domain/Scheduler';
import { useRagQuery } from '@/hooks/useFiring';

// ==========================================
// COMPONENTE DE CONTEÚDO
// ==========================================
function FiringScreenContent({
  ragData,
  schedulerId,
  notificationId,
}: {
  ragData: RAG;
  schedulerId: string;
  notificationId: string;
}) {
  const router = useRouter();
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState('');
  const [muteCountdown, setMuteCountdown] = useState(0);

  const strictMode = ragData.scheduler.strictMode;
  const vibrationEnabled = ragData.scheduler.vibration;
  const soundName = ragData.scheduler.alarmSound || 'chic_pop';
  const packageName = Application.applicationId;
  const audioUri = Platform.OS === 'android' ? `android.resource://${packageName}/raw/${soundName}` : '';

  const player = useAudioPlayer({ uri: audioUri });

  const stopAlarm = useCallback(() => {
    console.log('[Firing] Desligando alarme', { schedulerId, notificationId });
    player.pause();
    Vibration.cancel();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [player, router, schedulerId, notificationId]);

  // Relógio
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    }
    updateClock();
    const intervalId = setInterval(updateClock, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // ==========================================
  // BARREIRA 1: BLOQUEAR BOTÃO VOLTAR
  // ==========================================
  // Não existe mais atalho pra desligar o alarme sem responder o desafio, nem no modo
  // normal — então o botão voltar nunca deve desligar, só ser engolido.
  useEffect(() => {
    const onBackPress = () => true;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, []);

  // ==========================================
  // BARREIRA 2: PUNIR SE MINIMIZAR O APP (só no modo antiprocrastinador)
  // ==========================================
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (!strictMode) return;

      try {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          console.log('[Firing][Anti-Cheat] App minimizado em modo estrito, recriando notificação', notificationId);
          // Recria a notificação do Notifee IMEDIATAMENTE para tocar no background
          await notifee.displayNotification({
            id: notificationId,
            title: '🚨 VOLTE AQUI!',
            body: 'O alarme ainda está tocando. Resolva o desafio!',
            data: { schedulerId },
            android: {
              channelId: `alarm_${schedulerId}_${soundName}_${vibrationEnabled ? 'vib' : 'novib'}`,
              category: AndroidCategory.ALARM,
              ongoing: true,
              loopSound: true,
              fullScreenAction: { id: 'default' },
              pressAction: { id: 'default', launchActivity: 'default' },
            },
          });
        } else if (nextAppState === 'active') {
          // Quando ele se arrepender e abrir o app de novo, cancelamos a notificação chata do Android
          await notifee.cancelNotification(notificationId);
        }
      } catch (err) {
        console.error('[Firing][Anti-Cheat] Falha ao recriar/cancelar notificação de punição', err);
      }
    });

    return () => subscription.remove();
  }, [schedulerId, notificationId, soundName, strictMode, vibrationEnabled]);

  // Assumir o controle do Alarme
  useEffect(() => {
    async function takeoverAlarm() {
      try {
        if (notificationId) {
          await notifee.cancelNotification(notificationId);
        }
        if (Platform.OS === 'android') {
          player.loop = true;
          player.play();
          console.log('[Firing] Alarme assumido pela tela de firing, tocando som', { schedulerId, notificationId });
        }
      } catch (err) {
        console.error('[Firing] Falha ao assumir o alarme (cancelar notificação / tocar som)', err);
      }
    }
    takeoverAlarm();
  }, [player, notificationId, schedulerId]);

  // Vibração contínua enquanto o alarme toca (mesmo espírito do loop de som acima)
  useEffect(() => {
    if (vibrationEnabled && Platform.OS === 'android') {
      Vibration.vibrate([500, 1000, 500], true);
    }
    return () => Vibration.cancel();
  }, [vibrationEnabled]);

  // Armadilha do Volume Máximo
  useEffect(() => {
    let volumeListener: any = null;

    async function lockVolume() {
      try {
        await VolumeManager.setVolume(1.0);
        volumeListener = VolumeManager.addVolumeListener((result) => {
          if (result.volume < 1.0) {
            console.log('[Firing][Anti-Cheat] Usuário tentou baixar o volume, forçando de volta');
            VolumeManager.setVolume(1.0);
          }
        });
        console.log('[Firing][Anti-Cheat] Trava de volume ativada');
      } catch (err) {
        console.error('[Firing][Anti-Cheat] Falha ao travar o volume', err);
      }
    }

    if (strictMode && muteCountdown === 0 && Platform.OS === 'android') {
      lockVolume();
    }

    return () => {
      if (volumeListener) volumeListener.remove();
    };
  }, [muteCountdown, strictMode]);

  // Lógica de Silenciar (Mute)
  useEffect(() => {
    if (muteCountdown > 0) {
      const timer = setInterval(() => setMuteCountdown((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (muteCountdown === 0 && !player.playing && Platform.OS === 'android') {
      player.play();
    }
  }, [muteCountdown, player]);

  function handleMute() {
    if (muteCountdown > 0) return;
    console.log('[Firing] Silenciando por 10s');
    setMuteCountdown(10);
    player.pause();
  }

  function handleChallengeSuccess() {
    console.log(`[Firing] Desafio ${currentChallengeIndex + 1}/${ragData.challenges.length} concluído`);
    if (currentChallengeIndex + 1 < ragData.challenges.length) {
      setCurrentChallengeIndex((prev) => prev + 1);
    } else {
      stopAlarm();
    }
  }

  const currentChallenge = ragData.challenges[currentChallengeIndex];
  const total = ragData.challenges.length || 1;
  const progressPercentage = (currentChallengeIndex / total) * 100;

  return (
    <View className="flex-1 bg-brand-100 relative">
      {/* BARREIRA 3: Bloqueia arrastar para voltar ou gestos do Expo Router */}
      <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />

      <Pressable
        onPress={handleMute}
        className="absolute top-14 left-6 z-10 flex-row items-center bg-black/20 px-3 py-2 rounded-full"
      >
        <Ionicons name={muteCountdown > 0 ? 'volume-mute' : 'volume-high'} size={24} color="white" />
        {muteCountdown > 0 && <Text className="text-white font-bold ml-2">{muteCountdown}s</Text>}
      </Pressable>

      {/* Cabeçalho compacto: só a hora, nome do alarme e progresso (quando houver mais de 1 desafio) */}
      <View className="items-center pt-14 pb-3 px-5">
        <Text className="text-5xl font-bold text-white tracking-widest">{currentTime}</Text>
        <View className="flex-row items-center gap-1.5 mt-1">
          <Text className="text-sm text-brand-50 font-medium text-center" numberOfLines={1}>
            {ragData.scheduler.name || 'Seu alarme está tocando'}
          </Text>
          {currentChallenge && (
            <View className="flex-row items-center bg-white/15 rounded-full px-2 py-0.5">
              <Text style={{ fontSize: 12 }}>{LANGUAGE_FLAGS[currentChallenge.language]}</Text>
            </View>
          )}
        </View>

        {total > 1 && (
          <View className="w-full max-w-sm mt-3">
            <View className="flex-row justify-between mb-1">
              <Text className="text-brand-50 font-medium text-xs">Progresso do Desafio</Text>
              <Text className="text-brand-50 font-bold text-xs">
                {currentChallengeIndex} de {total}
              </Text>
            </View>
            <View className="w-full h-1.5 bg-brand-50/30 rounded-full overflow-hidden">
              <View className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPercentage}%` }} />
            </View>
          </View>
        )}
      </View>

      {/* Área do desafio: ocupa o resto da tela até as bordas, sem padding lateral/inferior */}
      <View className="flex-1">
        {currentChallenge?.type === 'QUIZ' && (
          <QuizChallenge
            key={`challenge-${currentChallengeIndex}`}
            quiz={currentChallenge.data}
            currentIndex={currentChallengeIndex}
            totalQuizzes={total}
            onSuccess={handleChallengeSuccess}
          />
        )}
        {currentChallenge?.type === 'FLASHCARD' && (
          <FlashcardChallenge
            key={`challenge-${currentChallengeIndex}`}
            flashcard={currentChallenge.data}
            currentIndex={currentChallengeIndex}
            totalFlashcards={total}
            onSuccess={handleChallengeSuccess}
          />
        )}
        {currentChallenge?.type === 'TRUE_FALSE' && (
          <TrueFalseChallenge
            key={`challenge-${currentChallengeIndex}`}
            item={currentChallenge.data}
            currentIndex={currentChallengeIndex}
            totalItems={total}
            onSuccess={handleChallengeSuccess}
          />
        )}
      </View>

    </View>
  );
}

// ==========================================
// 2. TELA PRINCIPAL (Busca os dados e gerencia o Loading)
// ==========================================
export default function FiringScreen() {
  const { schedulerId, notificationId } = useLocalSearchParams<{ schedulerId: string; notificationId?: string }>();
  const { data: ragData, isPending, isError, error, refetch } = useRagQuery(schedulerId);

  // Sem isso, uma falha aqui (rede fora do ar, backend fora do ar, etc.) prendia o usuário
  // pra sempre na tela de "Preparando desafio..." sem nenhuma indicação do que houve — o
  // queryCache global (queryClient.ts) já loga o erro, isso só dá uma saída pro usuário.
  if (isError) {
    console.error('[FiringScreen] Falha ao carregar o desafio do alarme', { schedulerId, error });
    return (
      <View className="flex-1 justify-center items-center gap-4 bg-brand-100 px-8">
        <Text className="text-white text-center font-medium">
          Não foi possível carregar o desafio deste alarme.
        </Text>
        <Text className="text-brand-50 text-center text-sm">
          {error instanceof Error ? error.message : 'Erro desconhecido.'}
        </Text>
        <Button onPress={() => refetch()} className="bg-white/15 rounded-full px-6 py-3">
          <Text className="font-semibold text-white">Tentar novamente</Text>
        </Button>
      </View>
    );
  }

  if (isPending || !ragData) {
    return (
      <View className="flex-1 justify-center items-center bg-brand-100">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-white mt-4 font-medium">Preparando desafio...</Text>
      </View>
    );
  }

  return (
    <FiringScreenContent ragData={ragData} schedulerId={schedulerId} notificationId={notificationId || schedulerId} />
  );
}
