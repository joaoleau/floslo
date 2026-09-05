import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, Platform, ActivityIndicator, BackHandler, Vibration, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import notifee from '@notifee/react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAudioPlayer } from 'expo-audio';
import * as Application from 'expo-application';

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { QuizChallenge } from '@/components/challenges/QuizChallenge';
import { FlashcardChallenge } from '@/components/challenges/FlashcardChallenge';
import { TrueFalseChallenge } from '@/components/challenges/TrueFalseChallenge';
import { QuizLikeReview, FlashcardReview } from '@/components/challenges/ChallengeReview';
import { ChallengeItem, RAG } from '@/types/domain/RAG';
import { LANGUAGE_FLAGS } from '@/types/domain/Scheduler';
import { ChallengeResult, ReviewOption } from '@/types/domain/History';
import { useRagQuery } from '@/hooks/useFiring';
import { useMeQuery } from '@/hooks/useUser';
import { useThemeColors } from '@/hooks/useThemeColors';
import { historyService } from '@/services/historyService';
import { useInvalidateHistory } from '@/hooks/useHistory';
import { userStatsApi } from '@/api/userStats';

// "YYYY-MM-DD" no fuso local do aparelho -- o backend não tem como saber o fuso do
// usuário sozinho, então quem manda a data local é sempre o cliente.
function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Extrai os campos específicos de cada tipo de desafio pro registro no histórico --
// centralizado aqui pra manter o TypeScript estreitando `answered.data` corretamente por tipo.
function buildHistoryFields(answered: ChallengeItem, result: ChallengeResult) {
  switch (answered.type) {
    case 'QUIZ':
      return {
        difficulty: answered.data.difficulty as string | null,
        promptText: answered.data.question,
        explanationText: answered.data.explanation as string | null,
        options: answered.data.alternatives.map(
          (alt): ReviewOption => ({ id: alt.id, text: alt.text, correct: alt.correct })
        ),
        isCorrect: result.wrongAttempts === 0,
        sourceChunks: answered.data.sourceChunks,
      };
    case 'TRUE_FALSE':
      return {
        difficulty: answered.data.difficulty as string | null,
        promptText: answered.data.statement,
        explanationText: answered.data.explanation as string | null,
        options: [
          { id: 'TRUE', text: 'Verdadeiro', correct: answered.data.answer === true },
          { id: 'FALSE', text: 'Falso', correct: answered.data.answer === false },
        ] as ReviewOption[],
        isCorrect: result.wrongAttempts === 0,
        sourceChunks: answered.data.sourceChunks,
      };
    case 'FLASHCARD':
      return {
        difficulty: null as string | null,
        promptText: answered.data.title || answered.data.content,
        explanationText: answered.data.content as string | null,
        options: null,
        isCorrect: null,
        sourceChunks: answered.data.sourceChunks,
      };
  }
}

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
  const colors = useThemeColors();
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  // Até onde o usuário já avançou de verdade -- só cresce. currentChallengeIndex pode
  // ficar menor que isso quando o usuário usa o pager pra revisar um desafio já
  // respondido (modo leitura, ver render abaixo).
  const [maxReachedIndex, setMaxReachedIndex] = useState(0);
  const [answeredResults, setAnsweredResults] = useState<Record<number, ChallengeResult>>({});
  const [currentTime, setCurrentTime] = useState('');
  const [muteCountdown, setMuteCountdown] = useState(0);

  const { data: user } = useMeQuery();
  const invalidateHistory = useInvalidateHistory();
  const historySessionIdRef = useRef<string | null>(null);

  // Uma sessão de histórico por disparo de alarme -- criada assim que sabemos quantos
  // desafios existem, pra cada resposta (handleChallengeSuccess) já ter uma sessão pra
  // referenciar. Guardado em ref (não state) porque não precisa disparar re-render.
  useEffect(() => {
    if (!user || historySessionIdRef.current) return;
    historySessionIdRef.current = historyService.startSession({
      userId: user.id,
      schedulerId: ragData.scheduler.id,
      schedulerName: ragData.scheduler.name || 'Agendador sem nome',
      totalChallenges: ragData.challenges.length,
    });
  }, [user, ragData]);

  // Quanto tempo o usuário passou no desafio atual, pro histórico -- medido aqui (não
  // dentro de cada componente de desafio) porque esses componentes rodam callbacks de
  // gesto/pressable registrados durante o render, e Date.now() ali esbarra na regra de
  // pureza dos hooks; handleChallengeSuccess é um callback comum, sem essa restrição.
  const challengeStartedAtRef = useRef(0);
  useEffect(() => {
    challengeStartedAtRef.current = Date.now();
  }, [currentChallengeIndex]);

  const vibrationEnabled = ragData.scheduler.vibration;
  const soundEnabled = ragData.scheduler.soundEnabled;
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

  // Assumir o controle do Alarme
  useEffect(() => {
    async function takeoverAlarm() {
      try {
        if (notificationId) {
          await notifee.cancelNotification(notificationId);
        }
        if (Platform.OS === 'android' && soundEnabled) {
          player.loop = true;
          player.play();
          console.log('[Firing] Alarme assumido pela tela de firing, tocando som', { schedulerId, notificationId });
        }
      } catch (err) {
        console.error('[Firing] Falha ao assumir o alarme (cancelar notificação / tocar som)', err);
      }
    }
    takeoverAlarm();
  }, [player, notificationId, schedulerId, soundEnabled]);

  // Vibração contínua enquanto o alarme toca (mesmo espírito do loop de som acima)
  useEffect(() => {
    if (vibrationEnabled && Platform.OS === 'android') {
      Vibration.vibrate([500, 1000, 500], true);
    }
    return () => Vibration.cancel();
  }, [vibrationEnabled]);

  // Lógica de Silenciar (Mute)
  useEffect(() => {
    if (muteCountdown > 0) {
      const timer = setInterval(() => setMuteCountdown((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (muteCountdown === 0 && !player.playing && soundEnabled && Platform.OS === 'android') {
      player.play();
    }
  }, [muteCountdown, player, soundEnabled]);

  function handleMute() {
    if (muteCountdown > 0) return;
    console.log('[Firing] Silenciando por 10s');
    setMuteCountdown(10);
    player.pause();
  }

  function handleChallengeSuccess(result: ChallengeResult) {
    console.log(`[Firing] Desafio ${currentChallengeIndex + 1}/${ragData.challenges.length} concluído`);

    const sessionId = historySessionIdRef.current;
    const answered = ragData.challenges[currentChallengeIndex];
    if (sessionId && user && answered) {
      const fields = buildHistoryFields(answered, result);
      const primarySource = fields.sourceChunks[0];

      historyService.recordAttempt({
        sessionId,
        userId: user.id,
        challengeType: answered.type,
        tag: answered.data.tag,
        language: answered.language,
        difficulty: fields.difficulty,
        promptText: fields.promptText,
        explanationText: fields.explanationText,
        options: fields.options,
        isCorrect: fields.isCorrect,
        wrongAttempts: result.wrongAttempts,
        timeSpentMs: Date.now() - challengeStartedAtRef.current,
        sourceObjectKey: primarySource?.objectKey ?? null,
        sourcePage: primarySource?.page ?? null,
      });
    }

    // Streak e respondidos-por-tipo agora vivem no backend (DynamoDB) -- fire-and-forget,
    // não pode travar o fluxo do alarme se a rede estiver fora do ar.
    if (answered) {
      userStatsApi
        .recordAnswer({ challenge_type: answered.type, local_date: todayLocalDate() })
        .catch((err) => console.warn('[Firing] Falha ao reportar resposta pro backend', err));
    }

    setAnsweredResults((prev) => ({ ...prev, [currentChallengeIndex]: result }));
    setMaxReachedIndex((prev) => Math.max(prev, currentChallengeIndex + 1));

    if (currentChallengeIndex + 1 < ragData.challenges.length) {
      setCurrentChallengeIndex((prev) => prev + 1);
    } else {
      if (sessionId) historyService.completeSession(sessionId);
      invalidateHistory();
      stopAlarm();
    }
  }

  // Navegação livre entre qualquer desafio já respondido (modo leitura, sem poder
  // responder de novo -- ver render abaixo) -- nunca além da fronteira alcançada.
  function handleGoBack() {
    setCurrentChallengeIndex((prev) => Math.max(0, prev - 1));
  }

  function handleGoForward() {
    setCurrentChallengeIndex((prev) => Math.min(maxReachedIndex, prev + 1));
  }

  const currentChallenge = ragData.challenges[currentChallengeIndex];
  const total = ragData.challenges.length || 1;
  const progressPercentage = (currentChallengeIndex / total) * 100;
  const isReviewing = currentChallengeIndex < maxReachedIndex;
  const canGoBack = currentChallengeIndex > 0;
  const canGoForward = currentChallengeIndex < maxReachedIndex;

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
          <Text className="text-sm text-white/75 font-medium text-center" numberOfLines={1}>
            {ragData.scheduler.name || 'Seu agendador está tocando'}
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
              <Text className="text-white/75 font-medium text-xs">Progresso do Desafio</Text>
              <Text className="text-white/75 font-bold text-xs">
                {currentChallengeIndex} de {total}
              </Text>
            </View>
            <View className="w-full h-1.5 bg-white/25 rounded-full overflow-hidden">
              <View className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPercentage}%` }} />
            </View>
          </View>
        )}

        {/* Pager: navega entre qualquer desafio já respondido, sempre em modo leitura --
            nunca ultrapassa a fronteira (maxReachedIndex), então nunca reabre um desafio
            futuro ainda não respondido. */}
        {(canGoBack || canGoForward) && (
          <View className="w-full max-w-sm flex-row items-center justify-between mt-3">
            <Pressable
              onPress={handleGoBack}
              disabled={!canGoBack}
              className="flex-row items-center gap-1 bg-white/15 rounded-full px-3 py-1.5"
              style={{ opacity: canGoBack ? 1 : 0 }}
            >
              <Ionicons name="chevron-back" size={16} color="white" />
              <Text className="text-white text-xs font-semibold">Anterior</Text>
            </Pressable>

            {isReviewing && <Text className="text-white/75 text-xs font-medium">Revisão</Text>}

            <Pressable
              onPress={handleGoForward}
              disabled={!canGoForward}
              className="flex-row items-center gap-1 bg-white/15 rounded-full px-3 py-1.5"
              style={{ opacity: canGoForward ? 1 : 0 }}
            >
              <Text className="text-white text-xs font-semibold">Próximo</Text>
              <Ionicons name="chevron-forward" size={16} color="white" />
            </Pressable>
          </View>
        )}
      </View>

      {/* Área do desafio: ocupa o resto da tela até as bordas, sem padding lateral/inferior */}
      <View className="flex-1 px-1">
        {isReviewing && currentChallenge ? (
          <ChallengeReviewPane challenge={currentChallenge} result={answeredResults[currentChallengeIndex]} colors={colors} />
        ) : (
          <>
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
          </>
        )}
      </View>

    </View>
  );
}

// Reaproveita buildHistoryFields (já mapeia cada tipo de desafio pro shape de revisão)
// pra mostrar, em modo leitura, um desafio já respondido dentro da própria sessão de
// firing -- sem duplicar essa lógica de mapeamento.
function ChallengeReviewPane({
  challenge,
  result,
  colors,
}: {
  challenge: ChallengeItem;
  result: ChallengeResult | undefined;
  colors: ReturnType<typeof useThemeColors>;
}) {
  if (!result) return null;
  const fields = buildHistoryFields(challenge, result);

  return (
    <View className="flex-1 w-full bg-card rounded-3xl shadow-lg overflow-hidden">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator
        contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
      >
        {fields.options ? (
          <QuizLikeReview
            promptText={fields.promptText}
            explanationText={fields.explanationText}
            options={fields.options}
            wrongAttempts={result.wrongAttempts}
            colors={colors}
          />
        ) : (
          <FlashcardReview promptText={fields.promptText} explanationText={fields.explanationText} />
        )}
      </ScrollView>
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
        <Text className="text-white/75 text-center text-sm">
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
