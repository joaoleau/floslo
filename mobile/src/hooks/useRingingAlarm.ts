import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, Vibration } from 'react-native';
import notifee from '@notifee/react-native';
import { AudioPlayer, useAudioPlayer } from 'expo-audio';
import * as Application from 'expo-application';

import { schedulerService } from '@/services/schedulerService';
import { AlarmSettings } from '@/storage/alarmSettingsStorage';

// Quanto tempo o botão de silenciar deixa o alarme mudo antes de voltar a tocar.
export const MUTE_SECONDS = 60;

// O expo-audio só aceita o modo em loop como propriedade do player, não como opção do hook.
function playInLoop(player: AudioPlayer) {
  player.loop = true;
  player.play();
}

export interface RingingAlarm {
  muteCountdown: number;
  mute: () => void;
  stop: () => void;
}

/**
 * Som e vibração do alarme enquanto a tela de disparo está aberta, do carregamento dos desafios
 * até o último ser respondido, inclusive na tela de erro. O disparo do alarme tem prioridade
 * sobre a formação dos desafios: o som não depende de os desafios terem chegado.
 *
 * - Ao abrir, a tela assume o alarme: tira a notificação da barra (só a exibida, para o gatilho
 *   semanal continuar agendado) e passa a tocar pelo próprio app, o que permite silenciar.
 * - Se o estudante sai do app com o alarme tocando (botão de início, apps recentes), a
 *   notificação volta a ser exibida e a tocar; tocada, ela reabre o disparo. Na volta, a tela
 *   assume o alarme de novo.
 * - `stop` encerra o alarme de vez, quando o último desafio é respondido.
 */
export function useRingingAlarm(settings: AlarmSettings, notificationId: string): RingingAlarm {
  const [muteCountdown, setMuteCountdown] = useState(0);
  const stoppedRef = useRef(false);

  const soundName = settings.alarmSound || 'chic_pop';
  const audioUri = Platform.OS === 'android' ? `android.resource://${Application.applicationId}/raw/${soundName}` : '';
  // A tela re-renderiza com frequência (relógio): um `{ uri }` literal recriado a cada render faria
  // o useAudioPlayer recarregar a fonte o tempo todo, e o som poderia nunca chegar a tocar.
  const audioSource = useMemo(() => ({ uri: audioUri }), [audioUri]);
  const player = useAudioPlayer(audioSource);

  const canPlay = settings.soundEnabled && Platform.OS === 'android';
  const vibrationEnabled = settings.vibration && Platform.OS === 'android';

  // Assume o alarme que estava na notificação.
  useEffect(() => {
    notifee.cancelDisplayedNotification(notificationId).catch((err) => {
      console.error('[Firing] Falha ao tirar a notificação do alarme da barra', err);
    });
  }, [notificationId]);

  // Toca, e volta a tocar quando a fonte muda (os ajustes do agendador chegaram) ou o
  // silenciamento acaba.
  useEffect(() => {
    if (stoppedRef.current || muteCountdown > 0 || !canPlay) return;
    playInLoop(player);
  }, [player, audioSource, muteCountdown, canPlay]);

  useEffect(() => {
    if (muteCountdown <= 0) return;
    const timer = setInterval(() => setMuteCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [muteCountdown]);

  useEffect(() => {
    if (vibrationEnabled) {
      Vibration.vibrate([500, 1000, 500], true);
    }
    return () => Vibration.cancel();
  }, [vibrationEnabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (stoppedRef.current) return;

      if (state === 'background') {
        console.log('[Firing] App em segundo plano com o alarme tocando, exibindo a notificação de novo', { notificationId });
        player.pause();
        Vibration.cancel();
        schedulerService.showRingingAlarm(settings, notificationId).catch((err) => {
          console.error('[Firing] Falha ao exibir de novo a notificação do alarme', err);
        });
      } else if (state === 'active') {
        notifee.cancelDisplayedNotification(notificationId).catch((err) => {
          console.error('[Firing] Falha ao tirar a notificação do alarme da barra', err);
        });
        if (canPlay && muteCountdown <= 0) playInLoop(player);
        if (vibrationEnabled) Vibration.vibrate([500, 1000, 500], true);
      }
    });
    return () => subscription.remove();
  }, [player, settings, notificationId, canPlay, vibrationEnabled, muteCountdown]);

  const mute = useCallback(() => {
    if (muteCountdown > 0) return;
    console.log(`[Firing] Silenciando por ${MUTE_SECONDS}s`);
    setMuteCountdown(MUTE_SECONDS);
    player.pause();
  }, [muteCountdown, player]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    player.pause();
    Vibration.cancel();
    notifee.cancelDisplayedNotification(notificationId).catch(() => undefined);
  }, [player, notificationId]);

  return useMemo(() => ({ muteCountdown, mute, stop }), [muteCountdown, mute, stop]);
}
