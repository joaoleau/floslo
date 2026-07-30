import React, { useEffect, useState } from 'react';
import { View, Pressable, Platform, ActivityIndicator, BackHandler, AppState } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import notifee, { AndroidCategory } from '@notifee/react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAudioPlayer } from 'expo-audio';
import * as Application from 'expo-application';
import { VolumeManager } from 'react-native-volume-manager';

import { Text } from '@/components/ui/text';
import { QuizChallenge } from '@/components/challenges/QuizChallenge';
import { RAG } from '@/types/domain/RAG';
import { useRagQuery } from '@/hooks/useFiring';

// ==========================================
// COMPONENTE DE CONTEÚDO
// ==========================================
function FiringScreenContent({ ragData, schedulerId }: { ragData: RAG; schedulerId: string }) {
  const router = useRouter();
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState('');
  const [muteCountdown, setMuteCountdown] = useState(0);

  const soundName = ragData.scheduler.alarmSound || 'chic_pop';
  const packageName = Application.applicationId;
  const audioUri = Platform.OS === 'android' ? `android.resource://${packageName}/raw/${soundName}` : '';

  const player = useAudioPlayer({ uri: audioUri });

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
  useEffect(() => {
    const onBackPress = () => {
      // Retornar 'true' significa: "Eu já lidei com esse clique, não faça nada, Android".
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, []);

  // ==========================================
  // BARREIRA 2: PUNIR SE MINIMIZAR O APP
  // ==========================================
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Recria a notificação do Notifee IMEDIATAMENTE para tocar no background
        await notifee.displayNotification({
          id: schedulerId,
          title: '🚨 VOLTE AQUI!',
          body: 'O alarme ainda está tocando. Resolva o desafio!',
          data: { schedulerId },
          android: {
            channelId: `alarm_${schedulerId}_${soundName}`,
            category: AndroidCategory.ALARM,
            ongoing: true,
            loopSound: true,
            fullScreenAction: { id: 'default' },
            pressAction: { id: 'default', launchActivity: 'default' },
          },
        });
      } else if (nextAppState === 'active') {
        // Quando ele se arrepender e abrir o app de novo, cancelamos a notificação chata do Android
        await notifee.cancelNotification(schedulerId);
      }
    });

    return () => subscription.remove();
  }, [schedulerId, soundName]);

  // Assumir o controle do Alarme
  useEffect(() => {
    async function takeoverAlarm() {
      if (schedulerId) {
        await notifee.cancelNotification(schedulerId);
      }
      if (Platform.OS === 'android') {
        player.loop = true;
        player.play();
      }
    }
    takeoverAlarm();
  }, [player, schedulerId]);

  // Armadilha do Volume Máximo
  useEffect(() => {
    let volumeListener: any = null;

    async function lockVolume() {
      await VolumeManager.setVolume(1.0);
      volumeListener = VolumeManager.addVolumeListener((result) => {
        if (result.volume < 1.0) {
          VolumeManager.setVolume(1.0);
        }
      });
    }

    if (muteCountdown === 0 && Platform.OS === 'android') {
      lockVolume();
    }

    return () => {
      if (volumeListener) volumeListener.remove();
    };
  }, [muteCountdown]);

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
    setMuteCountdown(10);
    player.pause();
  }

  function stopAlarm() {
    player.pause();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  function handleChallengeSuccess() {
    if (currentChallengeIndex + 1 < ragData.quizzes.length) {
      setCurrentChallengeIndex((prev) => prev + 1);
    } else {
      stopAlarm();
    }
  }

  const currentQuiz = ragData.quizzes[currentChallengeIndex];
  const total = ragData.quizzes.length || 1;
  const progressPercentage = (currentChallengeIndex / total) * 100;

  return (
    <View className="flex-1 justify-center items-center bg-brand-100 p-5 relative">
      {/* BARREIRA 3: Bloqueia arrastar para voltar ou gestos do Expo Router */}
      <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />

      <Pressable
        onPress={handleMute}
        className="absolute top-14 left-6 flex-row items-center bg-black/20 px-3 py-2 rounded-full"
      >
        <Ionicons name={muteCountdown > 0 ? 'volume-mute' : 'volume-high'} size={24} color="white" />
        {muteCountdown > 0 && <Text className="text-white font-bold ml-2">{muteCountdown}s</Text>}
      </Pressable>

      <Text className="text-7xl font-bold text-white mb-2 tracking-widest mt-10">{currentTime}</Text>
      <Text className="text-lg text-brand-50 mb-6 font-medium text-center px-4">
        {ragData.scheduler.name || 'Seu alarme está tocando'}
      </Text>

      {total > 1 && (
        <View className="w-full max-w-sm mb-8">
          <View className="flex-row justify-between mb-2">
            <Text className="text-brand-50 font-medium text-sm">Progresso do Desafio</Text>
            <Text className="text-brand-50 font-bold text-sm">
              {currentChallengeIndex} de {total}
            </Text>
          </View>
          <View className="w-full h-2 bg-brand-50/30 rounded-full overflow-hidden">
            <View className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPercentage}%` }} />
          </View>
        </View>
      )}

      {currentQuiz && (
        <QuizChallenge
          key={`quiz-${currentChallengeIndex}`}
          quiz={currentQuiz}
          currentIndex={currentChallengeIndex}
          totalQuizzes={total}
          onSuccess={handleChallengeSuccess}
        />
      )}

      <Text className="text-brand-50 mt-8 text-center font-medium">
        Resolva {total > 1 ? 'os desafios' : 'o desafio'} acima para desligar o alarme.
      </Text>
    </View>
  );
}

// ==========================================
// 2. TELA PRINCIPAL (Busca os dados e gerencia o Loading)
// ==========================================
export default function FiringScreen() {
  const { schedulerId } = useLocalSearchParams<{ schedulerId: string }>();
  const { data: ragData, isPending } = useRagQuery(schedulerId);

  if (isPending || !ragData) {
    return (
      <View className="flex-1 justify-center items-center bg-brand-100">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-white mt-4 font-medium">Preparando desafio...</Text>
      </View>
    );
  }

  return <FiringScreenContent ragData={ragData} schedulerId={schedulerId} />;
}
