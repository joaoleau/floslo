import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, ActivityIndicator, BackHandler, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { MultipleChoiceChallenge } from '@/components/challenges/MultipleChoiceChallenge';
import { DiscoveryChallenge } from '@/components/challenges/DiscoveryChallenge';
import { TrueFalseChallenge } from '@/components/challenges/TrueFalseChallenge';
import { ChoiceReview, DiscoveryReview } from '@/components/challenges/ChallengeReview';
import { ChallengeItem, RAG } from '@/types/domain/RAG';
import { User } from '@/types/domain/User';
import { LANGUAGE_FLAGS } from '@/types/domain/Scheduler';
import { ChallengeResult, ReviewOption } from '@/types/domain/History';
import { useRagQuery } from '@/hooks/useFiring';
import { useMeQuery } from '@/hooks/useUser';
import { queryKeys } from '@/lib/queryKeys';
import { todayLocalDate } from '@/lib/localDate';
import { useThemeColors } from '@/hooks/useThemeColors';
import { historyService } from '@/services/historyService';
import { useInvalidateHistory } from '@/hooks/useHistory';
import { getColorForId } from '@/lib/hashColor';
import { activeFiring } from '@/lib/activeFiring';
import { RingingAlarm, useRingingAlarm } from '@/hooks/useRingingAlarm';
import { AlarmSettings, alarmSettingsStorage } from '@/storage/alarmSettingsStorage';
import { alarmNavStorage } from '@/storage/alarmNavStorage';

// Botões de silenciar o som e de parar a vibração, um embaixo do outro, os mesmos no
// carregamento, na tela de erro e nos desafios. O de vibração só aparece quando o agendador vibra.
function MuteButton({ alarm }: { alarm: RingingAlarm }) {
  return (
    <View className="absolute top-14 left-6 z-10 items-start gap-2">
      <Pressable
        testID="mute-sound-button"
        onPress={alarm.mute}
        className="flex-row items-center bg-black/20 px-3 py-2 rounded-full"
      >
        <Ionicons name={alarm.muteCountdown > 0 ? 'volume-mute' : 'volume-high'} size={24} color="white" />
        {alarm.muteCountdown > 0 && <Text className="text-white font-bold ml-2">{alarm.muteCountdown}s</Text>}
      </Pressable>

      {alarm.canPauseVibration && (
        <Pressable
          testID="pause-vibration-button"
          onPress={alarm.pauseVibration}
          className="flex-row items-center bg-black/20 px-3 py-2 rounded-full"
        >
          <MaterialCommunityIcons
            name={alarm.vibrationPauseCountdown > 0 ? 'vibrate-off' : 'vibrate'}
            size={24}
            color="white"
          />
          {alarm.vibrationPauseCountdown > 0 && (
            <Text className="text-white font-bold ml-2">{alarm.vibrationPauseCountdown}s</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

// Extrai os campos específicos de cada tipo de desafio pro registro no histórico --
// centralizado aqui pra manter o TypeScript estreitando `answered.data` corretamente por tipo.
function buildHistoryFields(answered: ChallengeItem, result: ChallengeResult) {
  switch (answered.type) {
    case 'MULTIPLE_CHOICE':
      return {
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
        promptText: answered.data.statement,
        explanationText: answered.data.explanation as string | null,
        options: [
          { id: 'TRUE', text: 'Verdadeiro', correct: answered.data.answer === true },
          { id: 'FALSE', text: 'Falso', correct: answered.data.answer === false },
        ] as ReviewOption[],
        isCorrect: result.wrongAttempts === 0,
        sourceChunks: answered.data.sourceChunks,
      };
    case 'DISCOVERY':
      return {
        promptText: answered.data.title || answered.data.content,
        explanationText: answered.data.content as string | null,
        options: null,
        // Só apresenta conteúdo: não tem certo ou errado.
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
  alarm,
}: {
  ragData: RAG;
  schedulerId: string;
  notificationId: string;
  alarm: RingingAlarm;
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

  const { data: user } = useMeQuery();
  const invalidateHistory = useInvalidateHistory();
  const queryClient = useQueryClient();
  const historySessionIdRef = useRef<string | null>(null);

  // A floslo-rag já registrou o dia de estudo ao gerar este disparo (a data local vai no
  // próprio pedido, ver firingService) e devolveu a sequência atualizada, que entra direto no
  // cache do usuário, sem outra chamada à nuvem. Hoje passa a ser o último dia de estudo.
  const currentStreak = ragData.currentStreak;
  useEffect(() => {
    if (currentStreak === undefined) return;
    queryClient.setQueryData<User>(queryKeys.user.me, (cached) =>
      cached ? { ...cached, currentStreak, lastActiveDate: todayLocalDate() } : cached
    );
  }, [queryClient, currentStreak]);

  // O backend devolve sucesso com challenges=[] quando o agendador ficou sem nenhum objeto
  // vinculado (o último foi excluído) -- ver RAGService.RetrieveAndGenerate. O alarme já
  // tocando não sabia disso de antemão, então em vez de tentar renderizar um desafio que não
  // existe, a tela mostra um aviso e deixa só desligar o alarme.
  const hasNoChallenges = ragData.challenges.length === 0;

  // Uma sessão de histórico por disparo de alarme -- criada assim que sabemos quantos
  // desafios existem, pra cada resposta (handleChallengeSuccess) já ter uma sessão pra
  // referenciar. Guardado em ref (não state) porque não precisa disparar re-render. Sem
  // desafio nenhum não há o que responder, então nem cria a sessão.
  useEffect(() => {
    if (!user || historySessionIdRef.current || hasNoChallenges) return;
    historySessionIdRef.current = historyService.startSession({
      userId: user.id,
      schedulerId: ragData.scheduler.id,
      schedulerName: ragData.scheduler.name || 'Agendador sem nome',
      totalChallenges: ragData.challenges.length,
    });
  }, [user, ragData, hasNoChallenges]);

  const stopAlarm = useCallback(() => {
    console.log('[Firing] Desligando alarme', { schedulerId, notificationId });
    alarm.stop();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [alarm, router, schedulerId, notificationId]);

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
        promptText: fields.promptText,
        explanationText: fields.explanationText,
        options: fields.options,
        isCorrect: fields.isCorrect,
        wrongAttempts: result.wrongAttempts,
        sourceObjectKey: primarySource?.objectKey ?? null,
        sourcePage: primarySource?.page ?? null,
      });
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
    <LinearGradient
      colors={[getColorForId(ragData.scheduler.id), colors.brand]}
      style={{ flex: 1, position: 'relative' }}
    >
      {/* BARREIRA 3: Bloqueia arrastar para voltar ou gestos do Expo Router */}
      <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />

      <MuteButton alarm={alarm} />

      {/* Cabeçalho compacto: só a hora, nome do alarme e progresso (quando houver mais de 1 desafio) */}
      <View className="items-center pt-14 pb-3 px-5">
        <Text className="text-5xl font-bold text-white tracking-widest">{currentTime}</Text>
        <View className="flex-row items-center gap-1.5 mt-1">
          <Text className="text-sm text-white/75 font-medium text-center" numberOfLines={1}>
            {ragData.scheduler.name || 'Seu agendador está tocando'}
          </Text>
          <View className="flex-row items-center bg-white/15 rounded-full px-2 py-0.5">
            <Text style={{ fontSize: 12 }}>{LANGUAGE_FLAGS[ragData.scheduler.language]}</Text>
          </View>
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
        {hasNoChallenges ? (
          <View className="flex-1 items-center justify-center gap-4 px-8">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-white/15">
              <Ionicons name="document-outline" size={36} color="white" />
            </View>
            <Text className="text-white text-center text-lg font-bold">Nenhum objeto configurado</Text>
            <Text className="text-white/75 text-center">
              Os materiais deste agendador foram excluídos, então não há conteúdo para gerar desafios.
              Vincule um objeto a ele para voltar a tocar normalmente.
            </Text>
            <Button onPress={stopAlarm} className="mt-2 rounded-3xl bg-white/15 px-6 py-3">
              <Text className="font-semibold text-white">Dispensar alarme</Text>
            </Button>
          </View>
        ) : isReviewing && currentChallenge ? (
          <ChallengeReviewPane challenge={currentChallenge} result={answeredResults[currentChallengeIndex]} colors={colors} />
        ) : (
          <>
            {currentChallenge?.type === 'MULTIPLE_CHOICE' && (
              <MultipleChoiceChallenge
                key={`challenge-${currentChallengeIndex}`}
                item={currentChallenge.data}
                currentIndex={currentChallengeIndex}
                totalItems={total}
                onSuccess={handleChallengeSuccess}
              />
            )}
            {currentChallenge?.type === 'DISCOVERY' && (
              <DiscoveryChallenge
                key={`challenge-${currentChallengeIndex}`}
                discovery={currentChallenge.data}
                currentIndex={currentChallengeIndex}
                totalDiscoveries={total}
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

    </LinearGradient>
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
          <ChoiceReview
            promptText={fields.promptText}
            explanationText={fields.explanationText}
            options={fields.options}
            wrongAttempts={result.wrongAttempts}
            colors={colors}
          />
        ) : (
          <DiscoveryReview promptText={fields.promptText} explanationText={fields.explanationText} />
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
  const ringingNotificationId = notificationId || schedulerId;
  const { data: ragData, isPending, isError, error, refetch } = useRagQuery(schedulerId);

  // Som e vibração do alarme antes de os desafios chegarem: os ajustes guardados no aparelho
  // quando o alarme foi agendado (ver alarmSettingsStorage), ou um padrão se não houver.
  const [storedSettings, setStoredSettings] = useState<AlarmSettings | null>(null);
  useEffect(() => {
    alarmSettingsStorage.get(schedulerId).then(setStoredSettings).catch(() => undefined);
  }, [schedulerId]);

  const settings = useMemo<AlarmSettings>(() => {
    if (ragData) {
      return {
        schedulerId: ragData.scheduler.id,
        name: ragData.scheduler.name,
        alarmSound: ragData.scheduler.alarmSound,
        vibration: ragData.scheduler.vibration,
        soundEnabled: ragData.scheduler.soundEnabled,
      };
    }
    return storedSettings ?? { schedulerId, name: '', alarmSound: 'chic_pop', vibration: true, soundEnabled: true };
  }, [ragData, storedSettings, schedulerId]);

  const alarm = useRingingAlarm(settings, ringingNotificationId);

  useEffect(() => {
    activeFiring.start(schedulerId);
    alarmNavStorage.clearPendingAlarmNav().catch((err) => {
      console.warn('[FiringScreen] Falha ao descartar o toque pendente do alarme', err);
    });
    return () => activeFiring.finish(schedulerId);
  }, [schedulerId]);

  // ==========================================
  // BARREIRA 1: BLOQUEAR BOTÃO VOLTAR
  // ==========================================
  // Não existe atalho pra desligar o alarme sem responder os desafios, nem enquanto eles são
  // preparados ou na tela de erro, então o botão voltar nunca sai do disparo, só é engolido.
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => backHandler.remove();
  }, []);

  // Sem isso, uma falha aqui (rede fora do ar, backend fora do ar, etc.) prendia o usuário
  // pra sempre na tela de "Preparando desafio..." sem nenhuma indicação do que houve — o
  // queryCache global (queryClient.ts) já loga o erro, isso só dá uma saída pro usuário. O
  // alarme continua tocando: o disparo só se encerra pelos desafios.
  if (isError) {
    console.error('[FiringScreen] Falha ao carregar o desafio do alarme', { schedulerId, error });
    return (
      <View className="flex-1 justify-center items-center gap-4 bg-brand-100 px-8">
        <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />
        <MuteButton alarm={alarm} />
        <Text className="text-white text-center font-medium">
          Não foi possível carregar o desafio deste alarme.
        </Text>
        <Text className="text-white/75 text-center text-sm">
          {error instanceof Error ? error.message : 'Erro desconhecido.'}
        </Text>
        <Button onPress={() => refetch()} className="bg-white/15 rounded-3xl px-6 py-3">
          <Text className="font-semibold text-white">Tentar novamente</Text>
        </Button>
      </View>
    );
  }

  if (isPending || !ragData) {
    return (
      <View className="flex-1 justify-center items-center bg-brand-100">
        <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />
        <MuteButton alarm={alarm} />
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-white mt-4 font-medium">Preparando desafio...</Text>
      </View>
    );
  }

  return (
    <FiringScreenContent ragData={ragData} schedulerId={schedulerId} notificationId={ringingNotificationId} alarm={alarm} />
  );
}
